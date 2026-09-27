"""Refresh native camera/tide wiring without rebuilding surveyed terrain; verify final layers."""

import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from moving import bind_tide  # noqa: E402
import marine  # noqa: E402

scene = bpy.context.scene
ocean = bpy.data.objects["Ocean"]
native_manifest = json.loads(bpy.data.texts["world-metadata.json"].as_string())
mask = marine.load_mask(native_manifest)
if mask:
    for material in (
        ocean.data.materials[0],
        bpy.data.objects["Water absorption volume"].data.materials[0],
    ):
        for node in material.node_tree.nodes:
            if node.name == "Measured marine connectivity":
                node.image = mask[0]
    ocean["marine_mask_sha256"] = mask[1]["sha256"]
    ocean["marine_optical_only_cells"] = mask[1].get("opticalOnlyCells", 0)
    for image in list(bpy.data.images):
        if image.get("marine_connectivity") and image.users == 0:
            bpy.data.images.remove(image)
manifest = json.loads(
    (Path(__file__).resolve().parents[2] / "client/public/coast-assets/manifest.json").read_text()
)
for obj in bpy.data.objects:
    if "minimum_validated_world_tide" in obj:
        bind_tide(obj, ocean, obj["minimum_validated_world_tide"])


def native(point):
    return Vector((point[0], -point[2], point[1]))


for beach in manifest["beaches"]:
    for close in (False, True):
        pose = (
            beach.get("beachView")
            if close
            else {"position": beach["cameraApproach"], "target": beach["cameraTarget"]}
        )
        if not pose:
            continue
        name = f"Beach / {beach['id']} / {'shore' if close else 'context'}"
        camera = bpy.data.objects.get(name)
        if camera is None:
            camera = bpy.data.objects.new(name, bpy.data.cameras.new(name))
            bpy.data.collections["Cameras"].objects.link(camera)
        camera.location = native(pose["position"])
        camera.rotation_euler = (
            (native(pose["target"]) - camera.location).to_track_quat("-Z", "Y").to_euler()
        )
        camera.data.lens = 34
        camera.data.clip_start = 0.5
        camera.data.clip_end = 240000

assert bpy.data.collections.get("Urban"), "Missing city"
assert ocean.get("marine_mask_sha256"), "Missing marine mask"
moving_report = json.loads(bpy.data.texts["moving-entities-validation.json"].as_string())
assert moving_report["entities"] > 0
saved_demo, saved_tide, saved_frame = (
    ocean["play_tide_demo"],
    ocean["tide_height_cd"],
    scene.frame_current,
)
boats = [obj for obj in bpy.data.objects if "minimum_validated_world_tide" in obj]
for demo in (False, True):
    ocean["play_tide_demo"] = demo
    for frame in (1, scene.frame_end):
        scene.frame_set(frame)
        for tide in (0.5, 1.5, 3, 4.5, 5):
            ocean["tide_height_cd"] = tide
            ocean.update_tag()
            bpy.context.view_layer.update()
            for boat in boats:
                assert abs(boat.location.z - ocean.location.z) < 1e-4, boat.name
                assert boat.hide_render == (
                    ocean.location.z < boat["minimum_validated_world_tide"]
                ), boat.name
ocean["play_tide_demo"], ocean["tide_height_cd"] = saved_demo, saved_tide
ocean.update_tag()
scene.frame_set(saved_frame)
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath, compress=True)
report = {
    "scene": Path(bpy.data.filepath).name,
    "cityObjects": len(bpy.data.collections["Urban"].objects),
    "boats": len(boats),
    "boatManualAndAnimatedTides": "passed",
    "moving": moving_report,
    "marineMask": ocean.get("marine_mask_sha256"),
}
target = Path(bpy.data.filepath).with_suffix(".release.json")
target.write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report), flush=True)
if "--render" in sys.argv:
    scene.camera = bpy.data.objects["Beach / kitsilano-beach / context"]
    scene.render.resolution_x = 960
    scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100
    scene.cycles.samples = 8
    scene.render.filepath = str(Path(bpy.data.filepath).parent / "kits-city-overview.png")
    bpy.ops.render.render(write_still=True)
