"""Native camera/tide animation with clearance checked against exported survey triangles."""

import json
import math

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def smooth(t):
    return t * t * (3 - 2 * t)


def validate_settings(presentation):
    settings = presentation["experience"]
    if not (
        0
        < settings["arrival_seconds"]
        < settings["tide_start_seconds"]
        < settings["tide_end_seconds"]
        <= settings["duration_seconds"]
    ):
        raise ValueError("Expected arrival < tide start < tide end <= duration")
    for name in (
        "fps",
        "eye_height_m",
        "minimum_ground_clearance_m",
        "lens_mm",
        "preview_width",
        "preview_height",
        "preview_samples",
    ):
        if not math.isfinite(settings[name]) or settings[name] <= 0:
            raise ValueError(f"Experience {name} must be finite and positive")
    if settings["eye_height_m"] < settings["minimum_ground_clearance_m"]:
        raise ValueError("Eye height must respect camera clearance")
    if any(settings[name] % 2 for name in ("preview_width", "preview_height")):
        raise ValueError("Review movie dimensions must be even")
    if presentation["water"]["absorption_density"] <= 0:
        raise ValueError("Natural water absorption density must be positive")


def create(collections, manifest, base, ocean):
    scene = bpy.context.scene
    settings = manifest["config"]["presentation"]["experience"]
    scene.render.fps = settings["fps"]
    scene.frame_end = round(settings["duration_seconds"] * settings["fps"])
    anchor = Vector(manifest["camera_anchors"]["spanish_banks_beach"]["local_ground_position"])
    anchor.x += settings["shore_offset_xy_m"][0]
    anchor.y += settings["shore_offset_xy_m"][1]
    # Reuse the existing measured beach anchor, never a second destination database.
    points = [
        anchor + Vector(offset)
        for offset in (
            (-1000, 1400, 900),
            (-450, 650, 360),
            (-20, 60, 30),
            (0, 0, settings["eye_height_m"]),
        )
    ]
    origin = manifest["origin_projected"]
    xs, ys = [p.x for p in points], [p.y for p in points]
    trees = []
    for tile in manifest["tiles"]:
        if not tile["active"]:
            continue
        west, south, east, north = tile["projected_bounds"]
        if (
            east - origin[0] < min(xs)
            or west - origin[0] > max(xs)
            or north - origin[1] < min(ys)
            or south - origin[1] > max(ys)
        ):
            continue
        with np.load(base / tile["file"]) as arrays:
            vertices = arrays["vertices"] + np.array(tile["local_transform"])
            trees.append(
                BVHTree.FromPolygons(
                    vertices.tolist(), arrays["faces"].tolist(), all_triangles=True
                )
            )

    def ground_height(position):
        hits = [
            tree.ray_cast(Vector((position.x, position.y, 1000)), Vector((0, 0, -1)))[0]
            for tree in trees
        ]
        heights = [hit.z for hit in hits if hit is not None]
        return max(heights) if heights else None

    shore_height = ground_height(anchor)
    if shore_height is None:
        raise ValueError("Requested shoreline lookout has no measured/derived mesh")
    adjustment = shore_height - anchor.z
    anchor.z = shore_height
    for point in points:
        point.z += adjustment

    data = bpy.data.cameras.new("Shore approach — Spanish Banks")
    data.lens = settings["lens_mm"]
    data.clip_start, data.clip_end = 0.1, 100000
    camera = bpy.data.objects.new(data.name, data)
    collections["Cameras"].objects.link(camera)
    camera.rotation_mode = "QUATERNION"
    arrival = round(settings["arrival_seconds"] * settings["fps"])
    clearance = settings["minimum_ground_clearance_m"]
    high_water = (
        max(manifest["config"]["water"]["tide_test_states_cd_m"]) + ocean["chart_datum_offset_m"]
    )
    samples = []
    for frame in range(1, scene.frame_end + 1):
        t = smooth(min(1, (frame - 1) / (arrival - 1)))
        position = (
            (1 - t) ** 3 * points[0]
            + 3 * (1 - t) ** 2 * t * points[1]
            + 3 * (1 - t) * t * t * points[2]
            + t**3 * points[3]
        )
        height = ground_height(position)
        position.z = max(
            position.z,
            high_water + clearance,
            (height + clearance) if height is not None else -1000,
        )
        # An east/northeast gaze keeps the changing measured foreshore in view.
        target = anchor + Vector((150, 70, -anchor.z))
        camera.location = position
        camera.rotation_quaternion = (target - position).to_track_quat("-Z", "Y")
        camera.keyframe_insert("location", frame=frame)
        camera.keyframe_insert("rotation_quaternion", frame=frame)
        samples.append(
            {
                "frame": frame,
                "position": list(position),
                "ground_z": height,
                "ground_clearance_m": position.z - height if height is not None else None,
            }
        )
    for curve in camera.animation_data.action.fcurves:
        for key in curve.keyframe_points:
            key.interpolation = "LINEAR"
    if samples[-1]["ground_z"] is None:
        raise ValueError("Shore approach ends over missing survey coverage")

    control = bpy.data.objects.new("Tide demonstration (accelerated, not a forecast)", None)
    collections["Environment"].objects.link(control)
    control.empty_display_size = 0.1
    control.hide_render = True
    states = manifest["config"]["water"]["tide_test_states_cd_m"]
    for frame, tide in (
        (1, min(states)),
        (round(settings["tide_start_seconds"] * settings["fps"]), min(states)),
        (round(settings["tide_end_seconds"] * settings["fps"]), max(states)),
        (scene.frame_end, max(states)),
    ):
        control["height_cd"] = tide
        control.keyframe_insert('["height_cd"]', frame=frame)
    for curve in control.animation_data.action.fcurves:
        for key in curve.keyframe_points:
            key.handle_left_type = key.handle_right_type = "AUTO_CLAMPED"
    ocean["play_tide_demo"] = False
    ocean.id_properties_ui("play_tide_demo").update(
        description="Accelerated low-to-high tide on timeline; off restores manual tide"
    )
    curve = ocean.animation_data.drivers.find("location", index=2)
    for name, obj, prop in (("demo", ocean, "play_tide_demo"), ("animated", control, "height_cd")):
        variable = curve.driver.variables.new()
        variable.name = name
        variable.targets[0].id = obj
        variable.targets[0].data_path = f'["{prop}"]'
    curve.driver.expression = "(animated if demo else tide) + offset"
    for label, frame in (
        ("Approach • low tide", 1),
        ("Arrive at shore", arrival),
        ("Accelerated tide begins", round(settings["tide_start_seconds"] * settings["fps"])),
        (f"High tide • {max(states):g}m CD", round(settings["tide_end_seconds"] * settings["fps"])),
    ):
        scene.timeline_markers.new(label, frame=frame)
    report = {
        "camera": camera.name,
        "fps": scene.render.fps,
        "frames": scene.frame_end,
        "minimum_ground_clearance_m": min(
            s["ground_clearance_m"] for s in samples if s["ground_clearance_m"] is not None
        ),
        "frames_over_unknown_ground": [s["frame"] for s in samples if s["ground_z"] is None],
        "survey_geometry_unchanged": True,
        "samples": samples,
        "note": "Clearance tested at every integer animation frame against active LOD triangles. Tide timing is an accelerated demonstration, not a forecast.",
    }
    block = bpy.data.texts.new("shore-experience-validation.json")
    block.write(json.dumps(report, indent=2))
    suffix = "_overview" if manifest["scene_lod"] == "overview" else ""
    report_path = base.parents[2] / "output" / f"shore-experience-validation{suffix}.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n")


def activate(scene, ocean):
    ocean["play_tide_demo"] = True
    ocean["display_mode"] = 0
    ocean.update_tag()
    scene.camera = bpy.data.objects["Shore approach — Spanish Banks"]
    scene.frame_set(1)
    bpy.context.view_layer.update()


def verify(scene, ocean):
    """Test saved drivers and actual camera position, then restore manual state."""
    if "shore-experience-validation.json" not in bpy.data.texts:
        return {"status": "unavailable for partial-source inspection scene"}
    settings = json.loads(bpy.data.texts["world-metadata.json"].as_string())["config"]
    clearance = settings["presentation"]["experience"]["minimum_ground_clearance_m"] - 0.01
    old_frame, old_demo = scene.frame_current, ocean["play_tide_demo"]
    ocean["play_tide_demo"] = True
    ocean.update_tag()
    results = []
    evidence = json.loads(bpy.data.texts["shore-experience-validation.json"].as_string())
    previous = -1000
    for frame in range(1, scene.frame_end + 1):
        scene.frame_set(frame)
        graph = bpy.context.evaluated_depsgraph_get()
        z = ocean.evaluated_get(graph).location.z
        camera = bpy.data.objects["Shore approach — Spanish Banks"].evaluated_get(graph)
        expected = evidence["samples"][frame - 1]
        if (camera.location - Vector(expected["position"])).length > 1e-3:
            raise RuntimeError("Saved camera differs from the clearance-checked path")
        if (
            expected["ground_z"] is not None
            and camera.location.z < expected["ground_z"] + clearance
        ):
            raise RuntimeError("Saved camera intersects prepared survey geometry")
        if z < previous - 1e-5 or camera.location.z < z + clearance:
            raise RuntimeError("Tide demonstration monotonicity/camera clearance failed")
        previous = z
        results.append(z)
        if frame in (1, scene.frame_end // 2, scene.frame_end):
            for material in bpy.data.materials:
                if not material.use_nodes:
                    continue
                tree = material.node_tree.evaluated_get(graph)
                level = tree.nodes.get("Actual water elevation (world metres)")
                if level and abs(level.outputs[0].default_value - z) > 1e-5:
                    raise RuntimeError("Depth/wetness material is out of sync with physical tide")
    offset = settings["vertical"]["chart_datum_offset_m"]
    states = settings["water"]["tide_test_states_cd_m"]
    if (
        abs(results[0] - (min(states) + offset)) > 1e-5
        or abs(results[-1] - (max(states) + offset)) > 1e-5
    ):
        raise RuntimeError("Saved tide demonstration endpoints failed")
    ocean["play_tide_demo"] = old_demo
    ocean.update_tag()
    scene.frame_set(old_frame)
    bpy.context.view_layer.update()
    return {"frames_checked": len(results), "low_world_z": results[0], "high_world_z": results[-1]}
