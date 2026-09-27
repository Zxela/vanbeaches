"""Reusable tide-aware shaders. Shader geometry positions are in world metres."""

import bpy


def node(tree, kind, name=None):
    result = tree.nodes.new(kind)
    if name:
        result.name = result.label = name
    return result


def driver(socket, ocean, property_name, expression="value"):
    curve = socket.driver_add("default_value")
    variable = curve.driver.variables.new()
    variable.name = "value"
    if isinstance(ocean, bpy.types.Scene):
        variable.targets[0].id_type = "SCENE"
    variable.targets[0].id = ocean
    variable.targets[0].data_path = f'["{property_name}"]'
    curve.driver.expression = expression


def math_node(tree, operation, a, b=None):
    result = node(tree, "ShaderNodeMath")
    result.operation = operation
    for index, value in enumerate((a, b)):
        if value is None:
            continue
        if isinstance(value, (float, int)):
            result.inputs[index].default_value = value
        else:
            tree.links.new(value, result.inputs[index])
    return result.outputs[0]


def mix(tree, factor, first, second):
    result = node(tree, "ShaderNodeMixRGB")
    tree.links.new(factor, result.inputs[0])
    for index, value in ((1, first), (2, second)):
        if isinstance(value, tuple):
            result.inputs[index].default_value = value
        else:
            tree.links.new(value, result.inputs[index])
    return result.outputs[0]


def value(tree, ocean, prop, expression="value"):
    result = node(tree, "ShaderNodeValue", prop)
    driver(result.outputs[0], ocean, prop, expression)
    return result.outputs[0]


def water_level(tree, ocean):
    """Read the evaluated physical surface, including the optional tide demonstration."""
    result = node(tree, "ShaderNodeValue", "Actual water elevation (world metres)")
    curve = result.outputs[0].driver_add("default_value")
    variable = curve.driver.variables.new()
    variable.name = "level"
    variable.type = "TRANSFORMS"
    variable.targets[0].id = ocean
    variable.targets[0].transform_type = "LOC_Z"
    variable.targets[0].transform_space = "WORLD_SPACE"
    curve.driver.expression = "level"
    return result.outputs[0]


def ramp(tree, source, low, high):
    result = node(tree, "ShaderNodeMapRange")
    result.interpolation_type = "SMOOTHERSTEP"
    result.inputs["From Min"].default_value = low
    result.inputs["From Max"].default_value = high
    tree.links.new(source, result.inputs["Value"])
    return result.outputs["Result"]


def noise(tree, position, scale, detail=2):
    result = node(tree, "ShaderNodeTexNoise")
    result.inputs["Scale"].default_value = scale
    result.inputs["Detail"].default_value = detail
    tree.links.new(position, result.inputs["Vector"])
    return result.outputs["Fac"]


def base(name):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    tree = material.node_tree
    tree.nodes.clear()
    output = node(tree, "ShaderNodeOutputMaterial")
    return material, tree, output


def ground(ocean, config, image=None):
    material, tree, output = base("Coast • tide / depth / provenance")
    material.diffuse_color = (0.34, 0.43, 0.31, 1)
    geometry = node(tree, "ShaderNodeNewGeometry")
    separate = node(tree, "ShaderNodeSeparateXYZ")
    tree.links.new(geometry.outputs["Position"], separate.inputs[0])
    elevation = separate.outputs["Z"]
    level = water_level(tree, ocean)
    depth = math_node(tree, "SUBTRACT", level, elevation)
    dry = math_node(tree, "GREATER_THAN", elevation, level)
    settings = config["presentation"]["ground"]
    upper = ramp(tree, elevation, 4.0, 8.0)
    wet = ramp(tree, depth, -settings["wet_transition_m"], 0.03)
    natural = mix(tree, wet, tuple(settings["dry_sand"]), tuple(settings["wet_sand"]))
    patches = noise(tree, geometry.outputs["Position"], 0.065, 3)
    variation = mix(tree, patches, (0.62, 0.68, 0.65, 1), (1, 0.96, 0.85, 1))
    tint = node(tree, "ShaderNodeMixRGB", "Subtle sediment variation (appearance only)")
    tint.blend_type = "MULTIPLY"
    tint.inputs[0].default_value = 0.48
    tree.links.new(natural, tint.inputs[1])
    tree.links.new(variation, tint.inputs[2])
    natural = tint.outputs[0]
    natural = mix(tree, upper, natural, (0.115, 0.19, 0.095, 1))
    normal = node(tree, "ShaderNodeSeparateXYZ")
    tree.links.new(geometry.outputs["Normal"], normal.inputs[0])
    slope = math_node(tree, "LESS_THAN", normal.outputs["Z"], 0.78)
    natural = mix(tree, slope, natural, (0.23, 0.25, 0.23, 1))
    if image is not None:
        # Tile-local metre coordinates avoid storing redundant UVs on millions of loops.
        # Bake this planar mapping to UVs in a future exporter, not at web runtime.
        coordinates = node(tree, "ShaderNodeTexCoord")
        scale = node(tree, "ShaderNodeVectorMath")
        scale.operation = "SCALE"
        scale.inputs[3].default_value = 1 / config["processing"]["tile_size_m"]
        tree.links.new(coordinates.outputs["Object"], scale.inputs[0])
        shift = node(tree, "ShaderNodeVectorMath")
        shift.operation = "ADD"
        shift.inputs[1].default_value = (0, 1, 0)
        tree.links.new(scale.outputs[0], shift.inputs[0])
        photo = node(tree, "ShaderNodeTexImage", "City of Vancouver • 2022 orthophoto")
        photo.image = image
        photo.extension = "CLIP"
        tree.links.new(shift.outputs[0], photo.inputs["Vector"])
        imagery = config["imagery"]
        high_water = (
            max(config["water"]["tide_test_states_cd_m"])
            + config["vertical"]["chart_datum_offset_m"]
        )
        fade = math_node(
            tree, "SUBTRACT", elevation, high_water + imagery["minimum_height_above_high_tide_m"]
        )
        fade = math_node(tree, "DIVIDE", fade, imagery["fade_height_m"])
        fade.node.use_clamp = True
        weight = math_node(tree, "MULTIPLY", fade, photo.outputs["Alpha"])
        weight = math_node(tree, "MULTIPLY", weight, value(tree, ocean, "aerial_imagery"))
        natural = mix(tree, weight, natural, photo.outputs["Color"])
    bands = config["water"]["depth_bands"]
    color = tuple(bands[-1]["color"])
    for band in reversed(bands[:-1]):
        below = math_node(tree, "LESS_THAN", depth, band["max_m"])
        color = mix(tree, below, color, tuple(band["color"]))
    color = mix(tree, dry, color, natural)
    mode = value(tree, ocean, "display_mode")
    depth_mode = math_node(tree, "COMPARE", mode, 1.0)
    final = mix(tree, depth_mode, natural, color)
    provenance = node(tree, "ShaderNodeObjectInfo")
    provenance_mode = math_node(tree, "GREATER_THAN", mode, 1.5)
    final = mix(tree, provenance_mode, final, provenance.outputs["Color"])
    bsdf = node(tree, "ShaderNodeBsdfPrincipled")
    tree.links.new(final, bsdf.inputs["Base Color"])
    roughness = math_node(tree, "MULTIPLY_ADD", wet, -0.48)
    roughness.node.inputs[2].default_value = 0.82
    tree.links.new(roughness, bsdf.inputs["Roughness"])
    # Centimetre/millimetre surface normals add visual scale without changing survey Z.
    relief = node(tree, "ShaderNodeBump", "Sand texture, not elevation data")
    relief.inputs["Distance"].default_value = settings["sand_relief_m"]
    tree.links.new(noise(tree, geometry.outputs["Position"], 2.8), relief.inputs["Height"])
    grain = node(tree, "ShaderNodeBump", "Fine sediment grain")
    grain.inputs["Distance"].default_value = settings["grain_relief_m"]
    tree.links.new(noise(tree, geometry.outputs["Position"], 90), grain.inputs["Height"])
    tree.links.new(relief.outputs["Normal"], grain.inputs["Normal"])
    detail_weight = math_node(tree, "LESS_THAN", mode, 0.5)
    tree.links.new(detail_weight, relief.inputs["Strength"])
    tree.links.new(detail_weight, grain.inputs["Strength"])
    tree.links.new(grain.outputs["Normal"], bsdf.inputs["Normal"])
    tree.links.new(bsdf.outputs[0], output.inputs["Surface"])
    return material


def ocean_material(ocean, config):
    material, tree, output = base("Pacific • surface")
    material.diffuse_color = (0.07, 0.28, 0.34, 0.45)
    shader = node(tree, "ShaderNodeBsdfPrincipled")
    shader.inputs["Base Color"].default_value = (0.08, 0.28, 0.29, 1)
    shader.inputs["Metallic"].default_value = 0
    shader.inputs["IOR"].default_value = 1.333
    shader.inputs["Transmission Weight"].default_value = 1.0
    shader.inputs["Roughness"].default_value = config["presentation"]["water"]["roughness"]
    for index in range(3):
        curve = shader.inputs["Base Color"].driver_add("default_value", index)
        variable = curve.driver.variables.new()
        variable.name = "value"
        variable.targets[0].id = ocean
        variable.targets[0].data_path = f'["water_colour"][{index}]'
        curve.driver.expression = "value"
    geometry = node(tree, "ShaderNodeNewGeometry")
    mapping = node(tree, "ShaderNodeMapping")
    tree.links.new(geometry.outputs["Position"], mapping.inputs["Vector"])
    curve = mapping.inputs["Rotation"].driver_add("default_value", 2)
    variable = curve.driver.variables.new()
    variable.name = "value"
    variable.targets[0].id = ocean
    variable.targets[0].data_path = '["wave_direction_degrees"]'
    curve.driver.expression = "value * 0.017453292519943295"
    # A small normal animation, independent of geometric tide elevation.
    fps = config["presentation"]["experience"]["fps"]
    for index, expression in ((0, f"frame / {fps} * value"), (1, f"frame / {fps} * value * 0.3")):
        curve = mapping.inputs["Location"].driver_add("default_value", index)
        variable = curve.driver.variables.new()
        variable.name = "value"
        variable.targets[0].id = ocean
        variable.targets[0].data_path = '["wave_speed"]'
        curve.driver.expression = expression
    noise = node(tree, "ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 0.65
    noise.inputs["Detail"].default_value = 2
    tree.links.new(mapping.outputs[0], noise.inputs["Vector"])
    bump = node(tree, "ShaderNodeBump")
    driver(bump.inputs["Distance"], ocean, "wave_amplitude_m")
    driver(bump.inputs["Strength"], ocean, "wind_strength", "min(1.0, 0.55 + value)")
    tree.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    ripples = node(tree, "ShaderNodeTexNoise", "Wind ripples")
    ripples.inputs["Scale"].default_value = 6
    tree.links.new(mapping.outputs[0], ripples.inputs["Vector"])
    fine_bump = node(tree, "ShaderNodeBump")
    driver(fine_bump.inputs["Distance"], ocean, "wave_amplitude_m", "value * 0.12")
    fine_bump.inputs["Strength"].default_value = 0.3
    tree.links.new(ripples.outputs["Fac"], fine_bump.inputs["Height"])
    tree.links.new(bump.outputs["Normal"], fine_bump.inputs["Normal"])
    tree.links.new(fine_bump.outputs["Normal"], shader.inputs["Normal"])
    transparent = node(tree, "ShaderNodeBsdfTransparent")
    mode = value(tree, ocean, "display_mode", "min(1.0, value)")
    blend = node(tree, "ShaderNodeMixShader")
    tree.links.new(mode, blend.inputs[0])
    tree.links.new(shader.outputs[0], blend.inputs[1])
    tree.links.new(transparent.outputs[0], blend.inputs[2])
    tree.links.new(blend.outputs[0], output.inputs["Surface"])
    return material


def water_volume(ocean, config):
    material, tree, output = base("Pacific — underwater light absorption")
    settings = config["presentation"]["water"]
    absorption = node(tree, "ShaderNodeVolumeAbsorption")
    absorption.inputs["Color"].default_value = settings["absorption_colour"]
    driver(
        absorption.inputs["Density"],
        ocean,
        "display_mode",
        f"{settings['absorption_density']} if value < 0.5 else 0.0",
    )
    tree.links.new(absorption.outputs[0], output.inputs["Volume"])
    return material
