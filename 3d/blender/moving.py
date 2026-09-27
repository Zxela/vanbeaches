"""Bounded native SIMULATED harbour animation; no network or Blender operators.

Projected routes are exported from the browser's authoritative route definitions.
The existing ocean controller drives boat Z, so manual tides stay editable.
"""

import json
import math
from pathlib import Path

try:
    import bpy
except ModuleNotFoundError:  # Pure route tests do not need a Blender process.
    bpy = None


def sample_route(route, seconds):
    points = route["points"]
    lengths = [math.dist(a, b) for a, b in zip(points, points[1:])]
    length = sum(lengths)
    duration = length / max(0.001, route["speed"])
    dwell = route.get("dwell", 0)
    one_way = route["type"] in ("aircraft", "vehicle")
    cycle = (1 if one_way else 2) * (duration + dwell)
    phase = (seconds + route["phase"]) % cycle if cycle else 0
    reverse = not one_way and phase >= duration + dwell
    leg = phase - duration - dwell if reverse else phase
    distance = min(leg, duration) * route["speed"]
    if reverse:
        distance = length - distance
    index = 0
    while index < len(lengths) - 1 and distance > lengths[index]:
        distance -= lengths[index]
        index += 1
    a, b = points[index], points[min(index + 1, len(points) - 1)]
    fraction = min(1, distance / lengths[index]) if lengths and lengths[index] else 0
    p = [v + (b[axis] - v) * fraction for axis, v in enumerate(a)]
    heading = math.atan2(b[0] - a[0], -(b[2] - a[2])) + (math.pi if reverse else 0)
    return (p[0], -p[2], p[1]), heading, not one_way or phase < duration


def navigable(route, height, connection, tide):
    if height is None or connection is None:
        return False
    points = route["points"]
    for index in range(max(1, len(points) - 1)):
        a, b = points[index], points[min(index + 1, len(points) - 1)]
        length = math.hypot(b[0] - a[0], b[2] - a[2])
        steps = max(1, math.ceil(length / 10))
        nx, nz = (-(b[2] - a[2]) / length, (b[0] - a[0]) / length) if length else (1, 0)
        for step in range(steps + 1):
            for side in (-1, 0, 1):
                margin = (route["beam"] / 2 + 4) * side
                x = a[0] + (b[0] - a[0]) * step / steps + nx * margin
                z = a[2] + (b[2] - a[2]) * step / steps + nz * margin
                h, c = height(x, z), connection(x, z)
                if h is None or c is None or tide <= c or tide - h <= route["draft"]:
                    return False
    return True


def minimum_safe_tide(route, height, connection, levels):
    """Validate whole routes at supported tides; unknown cells never gain a fallback."""
    return next(
        (tide for tide in sorted(set(levels)) if navigable(route, height, connection, tide)), None
    )


def atlas(base, metadata, conservative=False):
    import numpy as np

    if not metadata:
        return None
    path = base / metadata["assetUrl"]
    if not path.is_file():
        return None
    image = bpy.data.images.load(str(path), check_existing=False)
    image.colorspace_settings.name = "Non-Color"
    image.alpha_mode = "CHANNEL_PACKED"
    width, height = image.size[:]
    pixels = np.empty(width * height * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    # Blender stores bottom-up pixels; the survey atlas metadata uses top-down rows.
    pixels = np.rint(pixels.reshape(height, width, 4)[::-1] * 255).astype(np.uint8)
    bpy.data.images.remove(image)
    return pixel_sampler(pixels, metadata["bounds"], conservative)


def pixel_sampler(pixels, bounds, conservative=False):
    """Match browser sampling; preserve dry sills instead of averaging them away."""
    height, width = pixels.shape[:2]
    west, north, east, south = bounds

    def sample(x, z):
        col = (x - west) / (east - west) * width - 0.5
        row = (z - north) / (south - north) * height - 0.5
        c, r = math.floor(col), math.floor(row)
        if c < 0 or r < 0 or c + 1 >= width or r + 1 >= height:
            return None
        cells = [pixels[r, c], pixels[r, c + 1], pixels[r + 1, c], pixels[r + 1, c + 1]]
        if any(p[3] != 255 or (conservative and p[2] > 127) for p in cells):
            return None
        values = [(int(p[0]) * 256 + int(p[1])) * 0.01 - 512 for p in cells]
        if conservative:
            return max(values)
        tx, tz = col - c, row - r
        return (values[0] * (1 - tx) + values[1] * tx) * (1 - tz) + (
            values[2] * (1 - tx) + values[3] * tx
        ) * tz

    return sample


def silhouette(kind):
    # Dimensions match the browser silhouettes (metres); native Z is up and +Y forward.
    shapes = {
        "bulk-carrier": [
            ((30, 190, 9), (0, 0, 4)),
            ((24, 135, 4), (0, 12, 10)),
            ((24, 20, 16), (0, -62, 16)),
        ],
        "local-ferry": [((4, 9, 1.3), (0, 0, 0.6)), ((3.5, 6, 2), (0, 0, 2))],
        "seabus": [((12, 27, 3.9), (0, 0, 1.8)), ((10.5, 18, 6), (0, 0, 6))],
        "sloop": [
            ((2.8, 9, 1.1), (0, 0, 0.5)),
            ((0.13, 0.13, 12), (0, 0, 6)),
            ((0.06, 3.8, 8), (0, -1.8, 6)),
        ],
        "jet": [
            ((3.5, 35, 3.5), (0, 0, 0)),
            ((34, 5, 0.5), (0, 0, 0)),
            ((13, 3, 0.5), (0, -13, 0.7)),
            ((0.5, 4, 5), (0, -13, 3)),
        ],
        "floatplane": [
            ((1.05, 10.5, 1.05), (0, 0, 0)),
            ((10.2, 1.5, 0.15), (0, 0, 0)),
            ((0.6, 7, 0.6), (-1.2, 0, -1.4)),
            ((0.6, 7, 0.6), (1.2, 0, -1.4)),
        ],
        "helicopter": [
            ((2.5, 5, 2.8), (0, 1, 0)),
            ((0.5, 6, 0.6), (0, -3, 0)),
            ((12, 0.4, 0.06), (0, 0, 2)),
        ],
        "seabird": [((0.3, 0.7, 0.2), (0, 0, 0)), ((1.7, 0.35, 0.07), (0, 0, 0.1))],
        "car": [((1.8, 4.3, 1), (0, 0, 0.6)), ((1.5, 2.3, 0.6), (0, 0, 1.4))],
    }
    vertices, faces = [], []
    for size, offset in shapes[kind]:
        start = len(vertices)
        vertices.extend(
            [
                (
                    offset[0] + x * size[0] / 2,
                    offset[1] + y * size[1] / 2,
                    offset[2] + z * size[2] / 2,
                )
                for z in (-1, 1)
                for y in (-1, 1)
                for x in (-1, 1)
            ]
        )
        faces.extend(
            [
                tuple(start + i for i in face)
                for face in (
                    (0, 2, 3, 1),
                    (4, 5, 7, 6),
                    (0, 1, 5, 4),
                    (2, 6, 7, 3),
                    (0, 4, 6, 2),
                    (1, 3, 7, 5),
                )
            ]
        )
    mesh = bpy.data.meshes.new(f"SIMULATED {kind} shared silhouette")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    return mesh


def linear_keys(obj):
    action = obj.animation_data.action if obj.animation_data else None
    if not action:
        return
    # Blender 4.4+ slotted actions; retain compatibility with older builds.
    curves = []
    for layer in getattr(action, "layers", []):
        for strip in layer.strips:
            for bag in strip.channelbags:
                curves.extend(bag.fcurves)
    if not curves:
        curves = list(getattr(action, "fcurves", []))
    for curve in curves:
        for key in curve.keyframe_points:
            key.interpolation = "CONSTANT" if curve.data_path.startswith("hide_") else "LINEAR"


def bind_tide(obj, ocean, safe_tide):
    """Rebind new or saved boats to the evaluated Ocean, including its tide demo."""
    obj["minimum_validated_world_tide"] = safe_tide
    for path, index, expression in (
        ("location", 2, "level"),
        ("hide_render", None, f"level < {safe_tide!r}"),
        ("hide_viewport", None, f"level < {safe_tide!r}"),
    ):
        curve = obj.driver_add(path) if index is None else obj.driver_add(path, index)
        driver = curve.driver
        # Existing saved scenes may still have the old tide/offset property variables.
        for variable in list(driver.variables):
            driver.variables.remove(variable)
        variable = driver.variables.new()
        variable.name = "level"
        variable.type = "TRANSFORMS"
        variable.targets[0].id = ocean
        variable.targets[0].transform_type = "LOC_Z"
        variable.targets[0].transform_space = "WORLD_SPACE"
        driver.type = "SCRIPTED"
        driver.expression = expression


def create(processed, collections, manifest, ocean):
    root_path = Path(__file__).resolve().parents[2]
    routes_path = root_path / "3d/config/moving-routes.json"
    published = root_path / "client/public/coast-assets"
    if not routes_path.exists() or not (published / "manifest.json").exists():
        return 0
    data = json.loads(routes_path.read_text())
    asset_manifest = json.loads((published / "manifest.json").read_text())
    if any(
        abs(a - b) > 0.01
        for a, b in zip(data["origin"]["utm"][:2], manifest["origin_projected"][:2])
    ):
        raise ValueError("Regenerate moving routes for the current world origin")
    height = atlas(published, asset_manifest.get("depthTexture"))
    connection = atlas(published, asset_manifest.get("marineTexture"), conservative=True)
    collection = bpy.data.collections.new("Living Harbour — SIMULATED")
    bpy.context.scene.collection.children.link(collection)
    collections["Moving"] = collection
    traffic_collection = bpy.data.collections.new("Bridge traffic — optional")
    collection.children.link(traffic_collection)
    traffic_collection.hide_render = True
    traffic_collection.hide_viewport = True
    scene = bpy.context.scene
    settings = manifest["config"]["presentation"]["experience"]
    fps = settings["fps"]
    final_frame = max(scene.frame_end, round(settings["duration_seconds"] * fps))
    tide_levels = sorted(
        set(
            cd + ocean["chart_datum_offset_m"]
            for cd in manifest["config"]["water"]["tide_test_states_cd_m"]
            + [manifest["config"]["water"]["initial_tide_cd_m"]]
        )
    )
    lowest_tide = min(tide_levels)
    routes = data["routes"][:]
    urban_path = processed / "urban/urban.json"
    if urban_path.exists():
        bridges = json.loads(urban_path.read_text()).get("bridges", [])[:4]
        for bridge in bridges:
            for side in (-1, 1):
                points = [[p[0], p[2] + 0.3, -p[1]] for p in bridge["points"]]
                a, b = points[0], points[-1]
                length = math.hypot(b[0] - a[0], b[2] - a[2])
                lane = min(3, bridge["width"] / 4) * side
                dx, dz = (
                    -(b[2] - a[2]) / max(1, length) * lane,
                    (b[0] - a[0]) / max(1, length) * lane,
                )
                for p in points:
                    p[0] += dx
                    p[2] += dz
                if side < 0:
                    points.reverse()
                routes.append(
                    dict(
                        id=f"bridge-{bridge['id']}-{side}",
                        type="vehicle",
                        subtype="car",
                        points=points,
                        phase=15 if side > 0 else 0,
                        speed=11,
                        beam=1.8,
                        draft=0,
                        dwell=1,
                    )
                )
    meshes = {}
    count, suppressed = 0, []
    route_tides = {}
    for route in routes:
        marine = route["type"] in ("vessel", "ferry", "sailboat")
        if marine:
            safe_tide = minimum_safe_tide(route, height, connection, tide_levels)
            if safe_tide is None:
                suppressed.append(route["id"])
                continue
            route_tides[route["id"]] = safe_tide
        kind = route["subtype"]
        if kind not in meshes:
            meshes[kind] = silhouette(kind)
            mat = bpy.data.materials.new(f"SIMULATED {kind}")
            color = (0.22, 0.30, 0.33) if kind == "bulk-carrier" else (0.72, 0.74, 0.69)
            mat.diffuse_color = (*color, 1)
            mat.use_nodes = True
            mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (
                *color,
                1,
            )
            mat.node_tree.nodes.get("Principled BSDF").inputs["Roughness"].default_value = 0.7
            meshes[kind].materials.append(mat)
        obj = bpy.data.objects.new(f"SIMULATED {route['id']}", meshes[kind])
        (traffic_collection if route["type"] == "vehicle" else collection).objects.link(obj)
        obj["source"], obj["live"], obj["type"] = data["source"], False, route["type"]
        if marine:
            bind_tide(obj, ocean, safe_tide)
        # One key per second plus exact end; no per-frame mesh generation.
        for frame in sorted(set(range(1, final_frame + 1, fps)) | {final_frame}):
            position, heading, active = sample_route(route, 1782068400 + (frame - 1) / fps)
            obj.location.x, obj.location.y = position[:2]
            if not marine:
                obj.location.z = position[2]
                obj.keyframe_insert("location", index=2, frame=frame)
            obj.keyframe_insert("location", index=0, frame=frame)
            obj.keyframe_insert("location", index=1, frame=frame)
            obj.rotation_euler.z = -heading
            obj.keyframe_insert("rotation_euler", index=2, frame=frame)
            if not marine:
                obj.hide_render = not active
                obj.hide_viewport = not active
                obj.keyframe_insert("hide_render", frame=frame)
                obj.keyframe_insert("hide_viewport", frame=frame)
        linear_keys(obj)
        count += 1
    report = {
        "mode": "SIMULATED",
        "live": False,
        "source": data["source"],
        "entities": count,
        "suppressed_routes": suppressed,
        "minimum_validated_world_tide": lowest_tide,
        "route_minimum_safe_world_tides": route_tides,
        "shared_meshes": len(meshes),
        "key_interval_seconds": 1,
        "traffic_enabled": False,
        "manual_tide_driver_preserved": True,
    }
    text = bpy.data.texts.new("moving-entities-validation.json")
    text.write(json.dumps(report, indent=2))
    scene["moving_entities_mode"] = "SIMULATED"
    scene["moving_entities_count"] = count
    return count
