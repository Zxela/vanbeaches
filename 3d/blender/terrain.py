"""Only prepared metre-scale mesh arrays enter Blender; no GIS imports."""

import json

import bpy
import numpy as np
import materials

COLORS = {
    1: (0.26, 0.68, 0.19, 1),
    2: (0.035, 0.38, 0.86, 1),
    3: (1, 0.20, 0.035, 1),
    4: (0.65, 0.12, 0.85, 1),
}


def create(manifest, base, collections, material, ocean):
    rejected_collection = bpy.data.collections.new("Rejected source joins • inspect as wireframe")
    collections["Debug"].children.link(rejected_collection)
    rejected_collection.hide_render = True
    rejected_collection.hide_viewport = True
    count = 0
    for tile in manifest["tiles"]:
        if not tile["active"]:
            continue  # Alternate LODs remain on disk, avoiding duplicate Blender memory.
        tile_material = material
        if tile.get("imagery"):
            photo = bpy.data.images.load(str(base / tile["imagery"]["file"]), check_existing=True)
            photo.pack()  # A moved .blend keeps its licensed source appearance.
            tile_material = materials.ground(ocean, manifest["config"], photo)
            tile_material.name = tile["id"] + " • City 2022 imagery"
        with np.load(base / tile["file"]) as arrays:
            vertices, faces, codes = arrays["vertices"], arrays["faces"], arrays["source"]
            rejected = arrays["rejected_source_joins"]
            if len(rejected):
                used, inverse = np.unique(rejected, return_inverse=True)
                mesh = bpy.data.meshes.new(tile["id"] + "_rejected_joins")
                mesh.from_pydata(vertices[used].tolist(), [], inverse.reshape(-1, 3).tolist())
                obj = bpy.data.objects.new(mesh.name, mesh)
                rejected_collection.objects.link(obj)
                obj.location = tile["local_transform"]
                obj.display_type = "WIRE"
                obj.show_in_front = True
                obj.color = (1, 0.03, 0.01, 1)
                obj["reason"] = "Uncertain steep LiDAR/NONNA connector; excluded from terrain"
            for code, name in ((1, "Terrain"), (2, "Seabed"), (3, "Shoreline"), (4, "Terrain")):
                selected = faces[codes == code]
                if not len(selected):
                    continue
                used, inverse = np.unique(selected, return_inverse=True)
                points = vertices[used]
                triangles = inverse.reshape(-1, 3)
                mesh = bpy.data.meshes.new(tile["id"] + f"_{name}_source{code}")
                # Bulk API avoids millions of Python tuple objects.
                mesh.vertices.add(len(points))
                mesh.vertices.foreach_set("co", points.ravel())
                mesh.loops.add(triangles.size)
                mesh.loops.foreach_set("vertex_index", triangles.ravel())
                mesh.polygons.add(len(triangles))
                mesh.polygons.foreach_set(
                    "loop_start", np.arange(len(triangles), dtype=np.int32) * 3
                )
                mesh.polygons.foreach_set("loop_total", np.full(len(triangles), 3, dtype=np.int32))
                mesh.polygons.foreach_set("use_smooth", np.ones(len(triangles), dtype=bool))
                mesh.update()
                mesh.materials.append(tile_material if code != 2 else material)
                obj = bpy.data.objects.new(mesh.name, mesh)
                collections[name].objects.link(obj)
                # Each object already contains one source class. Object colour avoids
                # repeating the same 16-byte colour on every face corner of the world.
                obj.color = COLORS[code]
                obj.location = tile["local_transform"]
                obj["metadata"] = json.dumps(tile)
                obj["source"] = manifest["source_codes"][str(code)]
                obj["lod"] = tile["lod"]
                obj["spacing_m"] = tile["spacing_m"]
                count += 1
    return count
