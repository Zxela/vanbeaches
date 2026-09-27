"""Reopen generated .blend, validate persistent controls, optionally render comparisons.

blender --background 3d/output/vancouver_coast.blend --python-exit-code 1
        --python 3d/blender/verify_scene.py -- --render
"""

import json
import sys
import time
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from debug import assert_scene  # noqa: E402
from experience import verify as verify_experience  # noqa: E402
import controls  # noqa: E402

manifest = json.loads(bpy.data.texts["world-metadata.json"].as_string())
ocean = bpy.data.objects["Ocean"]
started = time.perf_counter()
assert_scene(bpy.context.scene, manifest, ocean)
check_seconds = time.perf_counter() - started
report = {
    "blender": bpy.app.version_string,
    "scene_lod": manifest["scene_lod"],
    "saved_scene_tide_states_pass": True,
    "five_tide_updates_seconds": round(check_seconds, 4),
    "mesh_triangles": sum(
        len(obj.data.polygons)
        for collection in ("Terrain", "Seabed", "Shoreline")
        for obj in bpy.data.collections[collection].objects
    ),
    "note": "Headless dependency-graph timings, not interactive viewport FPS",
    "renders": [],
    "shore_experience": verify_experience(bpy.context.scene, ocean),
}
controls.register()
controls.register()  # Re-running the embedded script must replace its own classes cleanly.
saved_tide, saved_demo = ocean["tide_height_cd"], ocean["play_tide_demo"]
bpy.ops.coast.tide(height=1.5)
if ocean["play_tide_demo"] or abs(ocean.location.z - (1.5 + ocean["chart_datum_offset_m"])) > 1e-5:
    raise RuntimeError("Sidebar tide preset failed")
ocean["tide_height_cd"], ocean["play_tide_demo"] = saved_tide, saved_demo
ocean.update_tag()
bpy.context.view_layer.update()
report["sidebar_registration_and_tide_preset"] = "passed"
scene = bpy.context.scene
if "Shore approach — Spanish Banks" in bpy.data.objects:
    saved_camera, saved_frame = scene.camera, scene.frame_current
    bpy.ops.coast.explore()
    free_camera = scene.camera
    free_pose = free_camera.matrix_world.copy()
    ocean["play_tide_demo"] = True
    ocean.update_tag()
    scene.frame_set(round(scene.frame_end * 0.60))
    before = ocean.location.z
    scene.frame_set(round(scene.frame_end * 0.85))
    if (
        ocean.location.z <= before
        or free_camera.matrix_world != free_pose
        or free_camera.animation_data
    ):
        raise RuntimeError("Free exploration must remain independent of rising tide")
    scene.camera = saved_camera
    ocean["play_tide_demo"] = saved_demo
    ocean.update_tag()
    scene.frame_set(saved_frame)
    report["independent_free_camera_and_rising_tide"] = "passed"
print("Saved Blender scene passed all five tide states and collection checks.", flush=True)
if "--render" in sys.argv:
    scene = bpy.context.scene
    ocean["play_tide_demo"] = False
    scene.render.resolution_percentage = 60
    scene.cycles.samples = 12
    output = Path(bpy.data.filepath).parent
    for name, mode, tide, camera in (
        ("depth-low", 1, 0.5, "Overview"),
        ("depth-high", 1, 5.0, "Overview"),
        ("natural", 0, 3.0, "Overview"),
        ("provenance", 2, 3.0, "North-up • survey overview"),
        ("spanish-low", 1, 0.5, "Spanish Banks • tide study"),
        ("spanish-high", 1, 5.0, "Spanish Banks • tide study"),
        ("coastal", 0, 3.0, "Point Grey to Kitsilano"),
        ("beach-level", 0, 3.0, "Spanish Banks • beach level"),
        ("shore-low", 0, 0.5, "Shore approach — Spanish Banks"),
        ("shore-high", 0, 5.0, "Shore approach — Spanish Banks"),
    ):
        if camera not in bpy.data.objects:
            continue
        if "--render-only" in sys.argv and name != sys.argv[sys.argv.index("--render-only") + 1]:
            continue
        scene.camera = bpy.data.objects[camera]
        if name.startswith("shore-"):
            scene.frame_set(scene.frame_end)
        ocean["display_mode"] = mode
        ocean["tide_height_cd"] = tide
        ocean.update_tag()
        bpy.context.view_layer.update()
        suffix = "_overview" if manifest["scene_lod"] == "overview" else ""
        scene.render.filepath = str(output / f"{name}{suffix}.png")
        started = time.perf_counter()
        bpy.ops.render.render(write_still=True)
        report["renders"].append({"name": name, "seconds": round(time.perf_counter() - started, 3)})
suffix = "_overview" if manifest["scene_lod"] == "overview" else ""
(Path(bpy.data.filepath).parent / f"scene-verification{suffix}.json").write_text(
    json.dumps(report, indent=2) + "\n"
)
