"""Subtle height/slope materials; the existing scene sun provides all directional light."""

import bpy
from materials import driver, math_node


def create(config):
    scene = bpy.context.scene
    scene["mountain_snow_line_m"] = config["snow"]["lineMetres"]
    scene["mountain_snow_amount"] = config["snow"]["amount"]
    material = bpy.data.materials.new("Regional forest, rock and configurable snow")
    material.use_nodes = True
    tree = material.node_tree
    bsdf = tree.nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.94
    attribute = tree.nodes.new("ShaderNodeAttribute")
    attribute.attribute_name = "regional_elevation"
    height = tree.nodes.new("ShaderNodeMapRange")
    tree.links.new(attribute.outputs["Fac"], height.inputs["Value"])
    height.inputs["From Min"].default_value = 800
    height.inputs["From Max"].default_value = 1700
    colour = tree.nodes.new("ShaderNodeMixRGB")
    colour.inputs[1].default_value = (0.065, 0.12, 0.085, 1)
    colour.inputs[2].default_value = (0.26, 0.27, 0.255, 1)
    tree.links.new(height.outputs[0], colour.inputs[0])
    snow = tree.nodes.new("ShaderNodeMapRange")
    tree.links.new(attribute.outputs["Fac"], snow.inputs["Value"])
    driver(snow.inputs["From Min"], scene, "mountain_snow_line_m", "value - 200")
    driver(snow.inputs["From Max"], scene, "mountain_snow_line_m", "value + 200")
    normal = tree.nodes.new("ShaderNodeNewGeometry")
    split = tree.nodes.new("ShaderNodeSeparateXYZ")
    tree.links.new(normal.outputs["Normal"], split.inputs[0])
    slope = tree.nodes.new("ShaderNodeMapRange")
    tree.links.new(split.outputs["Z"], slope.inputs["Value"])
    slope.inputs["From Min"].default_value = 0.35
    slope.inputs["From Max"].default_value = 0.75
    coverage = math_node(tree, "MULTIPLY", snow.outputs[0], slope.outputs[0])
    amount = math_node(tree, "MULTIPLY", coverage, 1)
    driver(amount.node.inputs[1], scene, "mountain_snow_amount")
    mix = tree.nodes.new("ShaderNodeMixRGB")
    tree.links.new(amount, mix.inputs[0])
    tree.links.new(colour.outputs[0], mix.inputs[1])
    mix.inputs[2].default_value = (0.84, 0.89, 0.91, 1)
    tree.links.new(mix.outputs[0], bsdf.inputs["Base Color"])
    return material


def apply_atmosphere(material):
    """Shared distance law for offline coast, water and mountain surfaces."""
    if not material.use_nodes or "Regional atmospheric depth" in material.node_tree.nodes:
        return
    scene = bpy.context.scene
    tree = material.node_tree
    output = next((n for n in tree.nodes if n.type == "OUTPUT_MATERIAL"), None)
    if not output or not output.inputs["Surface"].links:
        return
    original = output.inputs["Surface"].links[0].from_socket
    camera = tree.nodes.new("ShaderNodeCameraData")
    density = math_node(tree, "DIVIDE", camera.outputs["View Distance"], 40000)
    driver(density.node.inputs[1], scene, "atmospheric_visibility_m")
    power = math_node(tree, "POWER", density, 1.3)
    negative = math_node(tree, "MULTIPLY", power, -1)
    exp = math_node(tree, "EXPONENT", negative)
    factor = math_node(tree, "MINIMUM", math_node(tree, "SUBTRACT", 1, exp), 1)
    emission = tree.nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (0.39, 0.55, 0.62, 1)
    mix = tree.nodes.new("ShaderNodeMixShader")
    mix.name = "Regional atmospheric depth"
    tree.links.new(factor, mix.inputs[0])
    tree.links.new(original, mix.inputs[1])
    tree.links.new(emission.outputs[0], mix.inputs[2])
    tree.links.new(mix.outputs[0], output.inputs["Surface"])
