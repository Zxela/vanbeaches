"""blender --background --python build_scene.py -- --manifest /path/world.json"""

import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import debug  # noqa: E402
import environment  # noqa: E402
import experience  # noqa: E402
import materials  # noqa: E402
import terrain  # noqa: E402
import water  # noqa: E402
import regional_terrain  # noqa: E402
import urban  # noqa: E402
import moving  # noqa: E402


def main():
    started = time.perf_counter()
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--allow-partial", action="store_true")
    parser.add_argument("--render", action="store_true")
    parser.add_argument("--lod", choices=["coastal", "overview"], default="coastal")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    presentation_path = Path(__file__).resolve().parents[1] / "config/presentation.json"
    manifest["config"]["presentation"] = json.loads(presentation_path.read_text())
    manifest["presentation_sha256"] = hashlib.sha256(presentation_path.read_bytes()).hexdigest()
    experience.validate_settings(manifest["config"]["presentation"])
    if not manifest["source_acquisition_complete"] and not args.allow_partial:
        raise ValueError("Refusing an incomplete world without --allow-partial")
    validation_path = args.manifest.parent / "validation.json"
    if (
        not validation_path.exists()
        or not json.loads(validation_path.read_text())["structural_checks_pass"]
    ):
        raise ValueError("Run GIS validation successfully before generating Blender")
    manifest["validation"] = json.loads(validation_path.read_text())
    manifest["scene_lod"] = args.lod
    if args.lod == "overview":
        for tile in manifest["tiles"]:
            tile["active"] = tile["lod"] == "overview"
    manifest["source_review"] = json.loads(
        (args.manifest.parent / "source-review.json").read_text()
    )
    manifest["coverage_gaps"] = json.loads(
        (args.manifest.parent / "coverage-gaps.geojson").read_text()
    )
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1
    scene["source_status"] = manifest["status"]
    scene["config_sha256"] = manifest["config_sha256"]
    scene["presentation_sha256"] = manifest["presentation_sha256"]
    scene["NON_NAVIGATION"] = True
    scene.frame_end = max(manifest["config"]["blender"]["animation_frames"])
    root = bpy.data.collections.new("WORLD")
    scene.collection.children.link(root)
    collections = {}
    for name in (
        "Terrain",
        "Seabed",
        "Shoreline",
        "Water",
        "Environment",
        "Lighting",
        "Cameras",
        "Debug",
    ):
        collections[name] = bpy.data.collections.new(name)
        root.children.link(collections[name])
    ocean = water.create(collections["Water"], manifest)
    material = materials.ground(ocean, manifest["config"])
    count = terrain.create(manifest, args.manifest.parent, collections, material, ocean)
    geometry_seconds = time.perf_counter() - started
    environment.create(collections, manifest)
    count += regional_terrain.create(args.manifest.parent, collections, ocean)
    count += urban.create(args.manifest.parent, collections, args.lod == "overview")
    count += moving.create(args.manifest.parent, collections, manifest, ocean)
    manifest["shore_experience_available"] = manifest["source_acquisition_complete"]
    if manifest["shore_experience_available"]:
        experience.create(collections, manifest, args.manifest.parent, ocean)
    debug.create(collections, manifest, ocean)
    controls = bpy.data.texts.new("Coast controls.py — optional sidebar")
    controls.write((Path(__file__).parent / "controls.py").read_text(encoding="utf-8"))
    notice = bpy.data.texts.new("DATA LICENCES — NON-NAVIGATIONAL")
    notice.write((Path(__file__).resolve().parents[1] / "NOTICE.md").read_text(encoding="utf-8"))
    scene.frame_set(1)
    debug.assert_scene(scene, manifest, ocean)
    bpy.context.view_layer.objects.active = ocean
    ocean.select_set(True)
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.clip_end = 100000
                area.spaces.active.region_3d.view_perspective = "CAMERA"
                area.spaces.active.shading.type = "MATERIAL" if args.lod == "overview" else "SOLID"
                area.spaces.active.shading.color_type = "MATERIAL"
                area.spaces.active.shading.light = "STUDIO"
                area.spaces.active.shading.show_cavity = True
                area.spaces.active.shading.use_scene_world = True
                area.spaces.active.shading.use_scene_lights = True
                area.spaces.active.region_3d.view_distance = 10000
    output = Path(__file__).resolve().parents[1] / "output"
    output.mkdir(exist_ok=True)
    suffix = "_overview" if args.lod == "overview" else ""
    target = output / (manifest["config"]["name"] + suffix + ".blend")
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(output / ("overview" + suffix + ".png"))
    bpy.ops.wm.save_as_mainfile(filepath=str(target), compress=True)
    (output / ("build-report" + suffix + ".json")).write_text(
        json.dumps(
            {
                "blender": bpy.app.version_string,
                "objects": count,
                "scene_lod": args.lod,
                "triangles": sum(t["faces"] for t in manifest["tiles"] if t["active"]),
                "geometry_build_seconds": round(geometry_seconds, 3),
                "build_and_save_seconds": round(time.perf_counter() - started, 3),
                "blend_bytes": target.stat().st_size,
                "source_status": manifest["status"],
                "tide_driver_test": "all five states passed",
                "output": target.name,
                "config_sha256": manifest["config_sha256"],
                "presentation_sha256": manifest["presentation_sha256"],
                "numerical_acceptance_pass": manifest["validation"]["numerical_acceptance_pass"],
                "source_warnings": manifest["validation"]["warnings"],
            },
            indent=2,
        )
        + "\n"
    )
    print(f"Saved {target}; {count} tile/source objects; {manifest['status']}", flush=True)
    if args.render:
        bpy.ops.render.render(write_still=True)
    # A ready-to-play review file; the main world retains manual tide controls.
    if not manifest["shore_experience_available"]:
        return
    experience.activate(scene, ocean)
    experience.verify(scene, ocean)
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.shading.type = "MATERIAL"
    experience_target = output / (manifest["config"]["name"] + suffix + "_shore_experience.blend")
    bpy.ops.wm.save_as_mainfile(filepath=str(experience_target), compress=True)
    report_path = output / ("build-report" + suffix + ".json")
    report = json.loads(report_path.read_text())
    path_checks = json.loads(bpy.data.texts["shore-experience-validation.json"].as_string())
    report["experience_output"] = experience_target.name
    report["experience_bytes"] = experience_target.stat().st_size
    report["experience_frames_checked"] = scene.frame_end
    report["experience_minimum_ground_clearance_m"] = path_checks["minimum_ground_clearance_m"]
    report["experience_frames_over_unknown_ground"] = len(path_checks["frames_over_unknown_ground"])
    report_path.write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
