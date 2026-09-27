"""Load the same GIS TINs as web export; no GIS dependencies inside Blender."""

import json
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

import mountain_materials

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from mesh_geometry import shore_skirts  # noqa: E402


def curvature_group(radius):
    group = bpy.data.node_groups.new("Observer tangent curvature — metres", "GeometryNodeTree")
    group.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    group.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    nodes, links = group.nodes, group.links
    entry, output = nodes.new("NodeGroupInput"), nodes.new("NodeGroupOutput")
    position = nodes.new("GeometryNodeInputPosition")
    camera = nodes.new("GeometryNodeInputActiveCamera")
    info = nodes.new("GeometryNodeObjectInfo")
    info.transform_space = "RELATIVE"
    links.new(camera.outputs[0], info.inputs["Object"])
    difference = nodes.new("ShaderNodeVectorMath")
    difference.operation = "SUBTRACT"
    links.new(position.outputs[0], difference.inputs[0])
    links.new(info.outputs["Location"], difference.inputs[1])
    flat = nodes.new("ShaderNodeVectorMath")
    flat.operation = "MULTIPLY"
    flat.inputs[1].default_value = (1, 1, 0)
    links.new(difference.outputs[0], flat.inputs[0])
    dot = nodes.new("ShaderNodeVectorMath")
    dot.operation = "DOT_PRODUCT"
    links.new(flat.outputs[0], dot.inputs[0])
    links.new(flat.outputs[0], dot.inputs[1])
    scale = nodes.new("ShaderNodeMath")
    scale.operation = "MULTIPLY"
    scale.inputs[1].default_value = -1 / (2 * radius)
    links.new(dot.outputs["Value"], scale.inputs[0])
    offset = nodes.new("ShaderNodeCombineXYZ")
    links.new(scale.outputs[0], offset.inputs["Z"])
    move = nodes.new("GeometryNodeSetPosition")
    links.new(entry.outputs[0], move.inputs["Geometry"])
    links.new(offset.outputs[0], move.inputs["Offset"])
    links.new(move.outputs[0], output.inputs[0])
    return group


def create(base, collections, ocean):
    path = base / "regional/regional.json"
    if not path.exists():
        return 0
    report = json.loads(path.read_text())
    if not report["horizonPass"]:
        raise ValueError("Regional horizon validation failed")
    scene = bpy.context.scene
    collection = bpy.data.collections.new("Regional Terrain")
    scene.collection.children.link(collection)
    material = mountain_materials.create(report["config"])
    scene["atmospheric_visibility_m"] = 40000.0
    count = 0
    for tile in report["tiles"]:
        if tile["lod"] != 0:
            continue
        with np.load(path.parent / tile["file"]) as data:
            vertices, faces = shore_skirts(data["vertices"], data["faces"])
        mesh = bpy.data.meshes.new(tile["id"])
        mesh.from_pydata(vertices.tolist(), [], faces.tolist())
        heights = mesh.attributes.new("regional_elevation", "FLOAT", "POINT")
        heights.data.foreach_set("value", vertices[:, 2])
        mesh.materials.append(material)
        for polygon in mesh.polygons:
            polygon.use_smooth = True
        obj = bpy.data.objects.new(tile["id"], mesh)
        obj["source"] = json.dumps(tile["sourcePixels"])
        obj["spacing_m"] = tile["spacing"]
        obj["lod"] = 0
        collection.objects.link(obj)
        count += 1
    # A subdivided ocean follows the same curvature and tide controller as all land.
    size, side = 320000, 129
    y, x = np.mgrid[:side, :side]
    positions = np.column_stack(
        (
            (x.ravel() / (side - 1) - 0.5) * size,
            (y.ravel() / (side - 1) - 0.5) * size,
            np.zeros(side * side),
        )
    )
    index = np.arange(side * side).reshape(side, side)
    quads = np.column_stack(
        (
            index[:-1, :-1].ravel(),
            index[:-1, 1:].ravel(),
            index[1:, 1:].ravel(),
            index[1:, :-1].ravel(),
        )
    )
    ocean_materials = list(ocean.data.materials)
    ocean.data.clear_geometry()
    ocean.data.from_pydata(positions.tolist(), [], quads.tolist())
    if not ocean.data.materials:
        for mat in ocean_materials:
            ocean.data.materials.append(mat)
    volume = bpy.data.objects.get("Water absorption volume")
    if volume:
        # Optical volume follows exactly the ocean tessellation, including curvature.
        # A flat old volume would protrude above the bent water several kilometres away.
        floor = min(v.co.z for v in volume.data.vertices)
        bottom = positions.copy()
        bottom[:, 2] = floor
        count_vertices = len(positions)
        rim = np.r_[index[0, :], index[1:, -1], index[-1, -2::-1], index[-2:0:-1, 0]]
        following = np.roll(rim, -1)
        sides = np.column_stack((following, rim, rim + count_vertices, following + count_vertices))
        volume.data.clear_geometry()
        volume.data.from_pydata(
            np.concatenate([positions, bottom]).tolist(),
            [],
            np.concatenate([quads, quads[:, ::-1] + count_vertices, sides]).tolist(),
        )
    if report["config"]["curvature"]:
        group = curvature_group(report["config"]["earth_radius_m"])
        objects = [*collection.objects, ocean]
        if volume:
            objects.append(volume)
        for name in ["Terrain", "Seabed", "Shoreline"]:
            objects.extend(collections[name].objects)
        for obj in objects:
            if obj.type == "MESH":
                modifier = obj.modifiers.new("Regional curvature", "NODES")
                modifier.node_group = group
    for material in bpy.data.materials:
        mountain_materials.apply_atmosphere(material)
    horizons = json.loads((path.parent / "horizons.json").read_text())
    for beach in horizons["beaches"]:
        data = bpy.data.cameras.new("Regional view " + beach["id"])
        data.clip_end = 240000
        data.lens = 40
        obj = bpy.data.objects.new(data.name, data)
        collections["Cameras"].objects.link(obj)
        p = beach["position"]
        obj.location = (p[0], -p[2], p[1])
        import math

        a = math.radians(beach["heading"])
        direction = Vector((math.sin(a), math.cos(a), -0.0075))
        obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    for camera in bpy.data.cameras:
        camera.clip_end = max(camera.clip_end, 240000)
    text = bpy.data.texts.new("Regional terrain sources and validation")
    text.write(json.dumps(report, indent=2))
    scene["regional_triangles"] = sum(t["triangles"] for t in report["tiles"] if t["lod"] == 0)
    return count
