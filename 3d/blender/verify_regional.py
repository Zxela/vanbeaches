"""Reopen a generated world and verify regional geometry, curvature and camera persistence."""

import json
import sys
from pathlib import Path

import bpy

root = Path(__file__).resolve().parents[1]
scene = bpy.context.scene
collection = bpy.data.collections.get("Regional Terrain")
if not collection or not collection.objects:
    raise ValueError("Missing regional geometry in saved Blender world")
metadata = json.loads(bpy.data.texts["Regional terrain sources and validation"].as_string())
assert metadata["horizonPass"]
assert scene.unit_settings.scale_length == 1
radius = metadata["config"]["earth_radius_m"]
errors = []
for name in ["spanish-banks", "wreck-beach", "english-bay"]:
    scene.camera = bpy.data.objects["Regional view " + name]
    bpy.context.view_layer.update()
    graph = bpy.context.evaluated_depsgraph_get()
    for obj in list(collection.objects)[::25]:
        raw = obj.matrix_world @ obj.data.vertices[0].co
        evaluated = obj.evaluated_get(graph)
        point = evaluated.matrix_world @ evaluated.data.vertices[0].co
        dx, dy = raw.x - scene.camera.location.x, raw.y - scene.camera.location.y
        expected = raw.z - (dx * dx + dy * dy) / (2 * radius)
        errors.append(abs(point.z - expected))
if max(errors) > 0.1:
    raise ValueError(f"Active-camera curvature mismatch: {max(errors)} m")
ocean = bpy.data.objects["Ocean"]
for tide in [0.5, 3, 5]:
    ocean["tide_height_cd"] = tide
    ocean.update_tag()
    bpy.context.view_layer.update()
    assert abs(ocean.location.z - (tide + ocean["chart_datum_offset_m"])) < 0.00001
assert "Regional curvature" in ocean.modifiers
volume = bpy.data.objects["Water absorption volume"]
assert "Regional curvature" in volume.modifiers
graph = bpy.context.evaluated_depsgraph_get()
top = ocean.evaluated_get(graph)
below = volume.evaluated_get(graph)
separation = (top.matrix_world @ top.data.vertices[0].co).z - (
    below.matrix_world @ below.data.vertices[0].co
).z
assert abs(separation - 0.025) < 0.005
assert all("Regional curvature" in o.modifiers for o in collection.objects)
report = {
    "blender": bpy.app.version_string,
    "objects": len(collection.objects),
    "triangles": sum(len(o.data.polygons) for o in collection.objects),
    "maximumCurvatureErrorMetres": max(errors),
    "tideStatesPass": True,
    "waterVolumeSeparationMetres": separation,
    "regionalCameras": len([c for c in bpy.data.cameras if c.name.startswith("Regional view ")]),
    "sourceWorld": bpy.data.filepath,
}
if "--render" in sys.argv:
    scene.camera = bpy.data.objects["Regional view spanish-banks"]
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 8
    scene.render.resolution_x = 960
    scene.render.resolution_y = 540
    scene.render.resolution_percentage = 100
    scene.render.filepath = str(root / "output/regional-review/blender-spanish-banks.png")
    bpy.ops.render.render(write_still=True)
    report["render"] = scene.render.filepath
suffix = "overview" if "overview" in Path(bpy.data.filepath).stem else "detailed"
(root / f"data/metadata/regional-blender-{suffix}.json").write_text(
    json.dumps(report, indent=2) + "\n"
)
print(json.dumps(report, indent=2), flush=True)
