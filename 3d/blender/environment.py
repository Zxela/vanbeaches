"""Metre-scale cameras and restrained Pacific daylight."""

import math

import bpy
from mathutils import Vector


def create(collections, manifest):
    scene = bpy.context.scene
    presentation = manifest["config"]["presentation"]
    light = presentation["light"]
    world = bpy.data.worlds.new("Pacific daylight")
    world.use_nodes = True
    scene.world = world
    tree = world.node_tree
    sky = tree.nodes.new("ShaderNodeTexSky")
    sky.sky_type = "NISHITA"
    sky.sun_elevation = math.radians(light["sun_elevation_degrees"])
    sky.sun_rotation = math.radians(light["sun_rotation_degrees"])
    sky.air_density = 1.2
    sky.dust_density = 1.8
    sky.sun_disc = False
    tree.links.new(sky.outputs[0], tree.nodes.get("Background").inputs["Color"])
    tree.nodes.get("Background").inputs["Strength"].default_value = light["sky_strength"]
    # A quiet background keeps absent survey regions legible from an elevated camera.
    light_path = tree.nodes.new("ShaderNodeLightPath")
    camera_background = tree.nodes.new("ShaderNodeBackground")
    camera_background.inputs["Color"].default_value = (0.085, 0.115, 0.14, 1)
    camera_background.inputs["Strength"].default_value = 0.5
    mix = tree.nodes.new("ShaderNodeMixShader")
    # Downward camera rays retain a quiet survey backdrop; above the horizon use
    # the physical sky. The background Reflection output points back along the ray.
    coordinates = tree.nodes.new("ShaderNodeTexCoord")
    direction = tree.nodes.new("ShaderNodeSeparateXYZ")
    tree.links.new(coordinates.outputs["Reflection"], direction.inputs[0])
    below_horizon = tree.nodes.new("ShaderNodeMath")
    below_horizon.operation = "GREATER_THAN"
    below_horizon.inputs[1].default_value = 0.0
    tree.links.new(direction.outputs["Z"], below_horizon.inputs[0])
    camera_mask = tree.nodes.new("ShaderNodeMath")
    camera_mask.operation = "MULTIPLY"
    tree.links.new(below_horizon.outputs[0], camera_mask.inputs[0])
    tree.links.new(light_path.outputs["Is Camera Ray"], camera_mask.inputs[1])
    tree.links.new(camera_mask.outputs[0], mix.inputs[0])
    tree.links.new(tree.nodes.get("Background").outputs[0], mix.inputs[1])
    tree.links.new(camera_background.outputs[0], mix.inputs[2])
    tree.links.new(mix.outputs[0], tree.nodes.get("World Output").inputs["Surface"])
    data = bpy.data.lights.new("Coastal sun", "SUN")
    data.energy = light["sun_energy"]
    data.angle = math.radians(1.0)
    sun = bpy.data.objects.new("Coastal sun", data)
    collections["Lighting"].objects.link(sun)
    elevation, azimuth = sky.sun_elevation, sky.sun_rotation
    direction = Vector(
        (
            math.cos(elevation) * math.cos(azimuth),
            math.cos(elevation) * math.sin(azimuth),
            math.sin(elevation),
        )
    )
    sun.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()
    west, south, east, north = manifest["projected_bounds"]
    ox, oy, _ = manifest["origin_projected"]
    width, height = east - west, north - south
    centre = Vector(((west + east) / 2 - ox, (south + north) / 2 - oy, -5))
    span = max(width, height)

    def camera(name, location, target, lens):
        data = bpy.data.cameras.new(name)
        data.lens = lens
        data.clip_start = 0.2
        data.clip_end = span * 8
        obj = bpy.data.objects.new(name, data)
        collections["Cameras"].objects.link(obj)
        obj.location = location
        obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()
        return obj

    scene.camera = camera(
        "Overview", centre + Vector((-span * 0.42, -span * 0.72, span * 0.85)), centre, 30
    )
    beaches = {b["id"]: b for b in manifest["beaches"]["beaches"]}
    spanish = beaches["spanish-banks"]["worldPosition"]
    kits = beaches["kitsilano-beach"]["worldPosition"]
    camera(
        "Point Grey to Kitsilano",
        (spanish[0] - 1500, spanish[1] + 3200, 2300),
        ((spanish[0] + kits[0]) / 2, spanish[1], 0),
        32,
    )
    flyby = camera(
        "Coastal flyby", (spanish[0] - 1200, spanish[1] + 650, 220), (kits[0], kits[1], 0), 32
    )
    flyby.location = (spanish[0] - 1200, spanish[1] + 650, 220)
    flyby.keyframe_insert("location", frame=1)
    flyby.location = (kits[0] - 500, kits[1] + 450, 130)
    flyby.keyframe_insert("location", frame=320)
    flyby.location = (spanish[0] - 1200, spanish[1] + 650, 220)
    beach_anchor = manifest["camera_anchors"]["spanish_banks_beach"]["local_ground_position"]
    camera(
        "Spanish Banks • beach level",
        (beach_anchor[0], beach_anchor[1], (beach_anchor[2] or 0) + 3),
        (beach_anchor[0] + 1200, beach_anchor[1] + 150, 0),
        28,
    )
    camera(
        "Spanish Banks • tide study",
        (spanish[0] - 600, spanish[1] + 1700, 1150),
        (spanish[0] + 250, spanish[1] + 450, 0),
        42,
    )
    plan = camera("North-up • survey overview", centre + Vector((0, 0, span)), centre, 40)
    plan.rotation_euler = (0, 0, 0)
    plan.data.type = "ORTHO"
    aspect = (
        manifest["config"]["blender"]["resolution"][0]
        / manifest["config"]["blender"]["resolution"][1]
    )
    plan.data.ortho_scale = max(width, height * aspect) * 1.06
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.exposure = light["exposure"]
    scene.render.engine = manifest["config"]["blender"]["render_engine"]
    scene.cycles.samples = manifest["config"]["blender"]["samples"]
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = manifest["config"]["blender"][
        "resolution"
    ]
    scene.render.resolution_percentage = 100
