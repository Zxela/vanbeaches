"""Create bounded merged GIS massing in Blender without per-building objects."""

import json
import math
from collections import defaultdict

import bpy
from mathutils import Vector
from mathutils.geometry import tessellate_polygon


def material(name, color):
    value = bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1)
    value.use_nodes = True
    value.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (*color, 1)
    value.node_tree.nodes.get("Principled BSDF").inputs["Roughness"].default_value = 0.72
    return value


def inside(point, ring):
    x, y = point
    odd = False
    for a, b in zip(ring, ring[1:] + ring[:1]):
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
            odd = not odd
    return odd


def roof(vertices, faces, ring, z, holes=()):
    vectors = [Vector((x, y, z)) for x, y in ring]
    for triangle in tessellate_polygon([vectors]):
        triangle = [vectors[p] if isinstance(p, int) else p for p in triangle]
        centre = (sum(p.x for p in triangle) / 3, sum(p.y for p in triangle) / 3)
        if any(inside(centre, hole) for hole in holes):
            continue
        offset = len(vertices)
        vertices.extend([tuple(p) for p in triangle])
        faces.append((offset, offset + 1, offset + 2))


def extrusion(vertices, faces, ring, base, top):
    for a, b in zip(ring, ring[1:] + ring[:1]):
        offset = len(vertices)
        vertices.extend(
            [(a[0], a[1], base), (b[0], b[1], base), (b[0], b[1], top), (a[0], a[1], top)]
        )
        faces.append(tuple(range(offset, offset + 4)))


def ribbon(vertices, faces, points, width):
    for a, b in zip(points, points[1:]):
        dx, dy = b[0] - a[0], b[1] - a[1]
        length = math.hypot(dx, dy)
        if length < 0.01:
            continue
        nx, ny = -dy / length * width / 2, dx / length * width / 2
        offset = len(vertices)
        vertices.extend(
            [
                (a[0] + nx, a[1] + ny, a[2]),
                (a[0] - nx, a[1] - ny, a[2]),
                (b[0] - nx, b[1] - ny, b[2]),
                (b[0] + nx, b[1] + ny, b[2]),
            ]
        )
        faces.append(tuple(range(offset, offset + 4)))


def create(processed, collections, overview=False):
    path = processed / "urban/urban.json"
    if not path.exists():
        return 0
    data = json.loads(path.read_text(encoding="utf-8"))
    root = bpy.data.collections.new("Urban")
    bpy.context.scene.collection.children.link(root)
    collections["Urban"] = root
    groups = defaultdict(lambda: ([], []))
    palette = {
        "buildings": material("Urban neutral facades", (0.59, 0.62, 0.64)),
        "roads": material("Urban asphalt", (0.16, 0.18, 0.18)),
        "bridges": material("Bridge muted green steel", (0.29, 0.40, 0.37)),
        "waterfront": material("Waterfront paths and piers", (0.46, 0.43, 0.35)),
        "forest": material("Forest canopy massing", (0.13, 0.24, 0.13)),
        "park": material("Park grass", (0.30, 0.39, 0.18)),
        "sand": material("Beach sand", (0.59, 0.53, 0.38)),
    }
    for building in data["buildings"]:
        if overview and building["lod"] != "skyline":
            continue
        vertices, faces = groups[("buildings", building["tile"])]
        top = building["base"] + building["height"]
        extrusion(vertices, faces, building["footprint"], building["base"], top)
        for hole in building.get("holes", []):
            extrusion(vertices, faces, hole, building["base"], top)
        roof(vertices, faces, building["footprint"], top, building.get("holes", []))
    for layer in ("roads", "waterfront", "bridges"):
        if overview and layer != "bridges":
            continue
        for item in data[layer]:
            if item.get("kind") == "tunnel":
                continue
            vertices, faces = groups[(layer, "merged")]
            ribbon(vertices, faces, item["points"], item["width"])
            if layer == "bridges":
                a, b = item["points"][0], item["points"][-1]
                if item["style"] == "suspension":
                    fractions = item.get("towerFractions", [0.25, 0.55])
                elif item["style"] == "truss":
                    fractions = [0.33, 0.67]
                else:
                    fractions = [0.2, 0.4, 0.6, 0.8]
                supports = item.get("towers") or [
                    {
                        "position": [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0],
                        "height": item["towerHeight"],
                    }
                    for t in fractions
                ]
                for support in supports:
                    x, y, base = support["position"]
                    extrusion(
                        vertices,
                        faces,
                        [[x - 3, y - 3], [x + 3, y - 3], [x + 3, y + 3], [x - 3, y + 3]],
                        base,
                        support["height"],
                    )
                if item["style"] == "suspension":
                    t0, t1 = fractions
                    cable = []
                    for i in range(65):
                        t = i / 64
                        if t < t0:
                            z = (
                                item["deckHeight"]
                                + (item["towerHeight"] - item["deckHeight"]) * t / t0
                            )
                        elif t > t1:
                            z = item["towerHeight"] - (item["towerHeight"] - item["deckHeight"]) * (
                                t - t1
                            ) / (1 - t1)
                        else:
                            q = (t - t0) / (t1 - t0)
                            z = (
                                item["deckHeight"]
                                + 7
                                + (item["towerHeight"] - item["deckHeight"] - 7) * (2 * q - 1) ** 2
                            )
                        cable.append([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, z])
                    ribbon(vertices, faces, cable, 2)
    for item in data["landcover"]:
        vertices, faces = groups[(item["kind"], "landcover")]
        offset = len(vertices)
        vertices.extend(item.get("vertices", []))
        faces.extend(tuple(index + offset for index in face) for face in item.get("faces", []))
    for (layer, tile), (vertices, faces) in groups.items():
        mesh = bpy.data.meshes.new(f"{layer}-{tile}")
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(mesh.name, mesh)
        root.objects.link(obj)
        obj.data.materials.append(palette[layer])
        obj["urban_layer"] = layer
        obj["source"] = "City of Vancouver / OpenStreetMap contributors"
    text = bpy.data.texts.new("urban-provenance.json")
    text.write(json.dumps({"sources": data["sources"], "counts": data["counts"]}, indent=2))
    bpy.context.scene["urban_objects"] = len(groups)
    return len(groups)
