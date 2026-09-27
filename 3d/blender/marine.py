"""Use the web export's measured marine-connection thresholds in Blender too."""

import hashlib
import json
from pathlib import Path

import bpy

from materials import math_node, node, value, water_level


def load_mask(manifest):
    """PNG row zero is north; Blender UV zero is south after image decoding."""
    folder = Path(__file__).resolve().parents[2] / "client/public/coast-assets"
    manifest_path = folder / "manifest.json"
    if not manifest_path.exists():
        return None
    exported = json.loads(manifest_path.read_text(encoding="utf-8"))
    descriptor = exported.get("marineTexture")
    if not descriptor:
        return None
    if any(
        abs(a - b) > 0.001
        for a, b in zip(exported["origin"]["utm"][:2], manifest["origin_projected"][:2])
    ):
        raise ValueError("Marine mask and Blender world use different coordinate origins")
    for source in exported.get("sources", {}).values():
        if source.get("configSha256") != manifest["config_sha256"]:
            raise ValueError("Marine mask coastal export does not match this world configuration")
    path = (folder / descriptor["assetUrl"]).resolve()
    if not path.is_relative_to(folder.resolve()):
        raise ValueError("Marine mask must be within the exported asset folder")
    encoded = path.read_bytes()
    if (
        hashlib.sha256(encoded).hexdigest() != descriptor["sha256"]
        or len(encoded) != descriptor["bytes"]
    ):
        raise ValueError("Marine mask checksum mismatch")
    image = bpy.data.images.load(str(path), check_existing=True)
    image.colorspace_settings.name = "Non-Color"
    image.alpha_mode = "CHANNEL_PACKED"
    image["marine_connectivity"] = True
    image.pack()
    return image, descriptor


def wet_column(tree, ocean, mask):
    image, descriptor = mask
    west, north_z, east, south_z = descriptor["bounds"]
    # Web Z points south, Blender Y points north. PNGs are decoded by Blender
    # into bottom-origin pixels, so north maps to UV.y=1 (no manual image flip).
    geometry = node(tree, "ShaderNodeNewGeometry", "Marine world position")
    position = node(tree, "ShaderNodeSeparateXYZ")
    tree.links.new(geometry.outputs["Position"], position.inputs[0])
    u = math_node(tree, "SUBTRACT", position.outputs["X"], west)
    u = math_node(tree, "DIVIDE", u, east - west)
    v = math_node(tree, "ADD", position.outputs["Y"], south_z)
    v = math_node(tree, "DIVIDE", v, south_z - north_z)
    coordinates = node(tree, "ShaderNodeCombineXYZ", "Marine north-up UV")
    tree.links.new(u, coordinates.inputs["X"])
    tree.links.new(v, coordinates.inputs["Y"])
    texture = node(tree, "ShaderNodeTexImage", "Measured marine connectivity")
    texture.image = image
    texture.interpolation = "Closest"
    texture.extension = "CLIP"
    tree.links.new(coordinates.outputs[0], texture.inputs["Vector"])
    channels = node(tree, "ShaderNodeSeparateColor")
    channels.mode = "RGB"
    tree.links.new(texture.outputs["Color"], channels.inputs["Color"])
    high = math_node(tree, "MULTIPLY", channels.outputs["Red"], 65280.0)
    low = math_node(tree, "MULTIPLY", channels.outputs["Green"], 255.0)
    encoded = math_node(tree, "ADD", high, low)
    centimetres = math_node(tree, "MULTIPLY", encoded, 0.01)
    threshold = math_node(tree, "SUBTRACT", centimetres, 512.0)
    connected = math_node(tree, "GREATER_THAN", water_level(tree, ocean), threshold)
    covered = math_node(tree, "GREATER_THAN", texture.outputs["Alpha"], 0.99)
    return math_node(tree, "MULTIPLY", connected, covered)


def surface(material, ocean, mask):
    tree = material.node_tree
    output = next(n for n in tree.nodes if n.type == "OUTPUT_MATERIAL")
    original = output.inputs["Surface"].links[0].from_socket
    transparent = node(tree, "ShaderNodeBsdfTransparent", "Dry or disconnected water")
    mix = node(tree, "ShaderNodeMixShader", "Tide-dependent marine surface")
    tree.links.new(wet_column(tree, ocean, mask), mix.inputs[0])
    tree.links.new(transparent.outputs[0], mix.inputs[1])
    tree.links.new(original, mix.inputs[2])
    tree.links.new(mix.outputs[0], output.inputs["Surface"])
    if hasattr(material, "surface_render_method"):
        material.surface_render_method = "DITHERED"


def volume(material, ocean, mask, config):
    tree = material.node_tree
    absorption = next(n for n in tree.nodes if n.type == "VOLUME_ABSORPTION")
    absorption.inputs["Density"].driver_remove("default_value")
    density = config["presentation"]["water"]["absorption_density"]
    enabled_density = value(tree, ocean, "display_mode", f"{density} if value < 0.5 else 0.0")
    enabled_density.node.name = "Marine absorption enabled density"
    wet_density = math_node(tree, "MULTIPLY", enabled_density, wet_column(tree, ocean, mask))
    tree.links.new(wet_density, absorption.inputs["Density"])
