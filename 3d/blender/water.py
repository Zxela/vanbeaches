"""The Ocean object is both an independent surface and the persistent controller."""

import bpy

import marine
from materials import ocean_material, water_volume


def create(collection, manifest):
    bounds, origin = manifest["projected_bounds"], manifest["origin_projected"]
    west, south, east, north = bounds
    vertices = [
        (west - origin[0], south - origin[1], 0),
        (east - origin[0], south - origin[1], 0),
        (east - origin[0], north - origin[1], 0),
        (west - origin[0], north - origin[1], 0),
    ]
    mesh = bpy.data.meshes.new("OceanSurface")
    mesh.from_pydata(vertices, [], [(0, 1, 2, 3)])
    ocean = bpy.data.objects.new("Ocean", mesh)
    collection.objects.link(ocean)
    config = manifest["config"]
    water = config["water"]
    ocean["tide_height_cd"] = water["initial_tide_cd_m"]
    ocean["chart_datum_offset_m"] = config["vertical"]["chart_datum_offset_m"]
    ocean["display_mode"] = 0 if manifest["source_acquisition_complete"] else 1
    ocean["play_tide_demo"] = False
    ocean.id_properties_ui("display_mode").update(
        min=0, max=2, description="0 Natural; 1 Depth; 2 Provenance"
    )
    ocean.id_properties_ui("tide_height_cd").update(
        min=-2.0,
        max=8.0,
        description="Metres above Chart Datum; Vancouver station 07735 approximation",
    )
    for name in ("wave_amplitude_m", "wave_direction_degrees", "wave_speed", "wind_strength"):
        ocean[name] = water[name]
    ocean["water_colour"] = config["presentation"]["water"]["surface_colour"]
    ocean["test_states_cd_m"] = water["tide_test_states_cd_m"]
    ocean["non_navigation"] = True
    ocean["aerial_imagery"] = 1.0 if manifest.get("imagery", {}).get("texture_count", 0) else 0.0
    ocean.id_properties_ui("aerial_imagery").update(
        min=0.0, max=1.0, description="Blend licensed City 2022 imagery above the intertidal zone"
    )
    curve = ocean.driver_add("location", 2)
    for name, prop in (("tide", "tide_height_cd"), ("offset", "chart_datum_offset_m")):
        variable = curve.driver.variables.new()
        variable.name = name
        variable.targets[0].id = ocean
        variable.targets[0].data_path = f'["{prop}"]'
    curve.driver.expression = "tide + offset"
    ocean.data.materials.append(ocean_material(ocean, config))
    marine_mask = marine.load_mask(manifest)
    if marine_mask:
        marine.surface(ocean.data.materials[0], ocean, marine_mask)
        ocean["marine_mask_sha256"] = marine_mask[1]["sha256"]
        ocean["marine_mask_status"] = (
            "Measured tide-dependent connectivity; sourced optical sea only in unknown survey cells"
        )
        ocean["marine_optical_only_cells"] = marine_mask[1].get("opticalOnlyCells", 0)
    else:
        ocean["marine_mask_status"] = "Not exported; legacy independent tide plane"
    # A closed, transparent volume absorbs light below the independent tide surface.
    # Its bounds describe water, never inferred seabed. Depth/debug modes disable it.
    floor = config["presentation"]["water"]["volume_floor_m"]
    volume_mesh = bpy.data.meshes.new("Water absorption bounds")
    volume_mesh.from_pydata(
        vertices + [(x, y, floor) for x, y, _ in vertices],
        [],
        [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)],
    )
    volume = bpy.data.objects.new("Water absorption volume", volume_mesh)
    collection.objects.link(volume)
    volume.parent = ocean
    # Separate optical boundaries to prevent coincident-surface absorption artifacts.
    volume.location.z = -0.025
    volume.display_type = "WIRE"
    volume.hide_select = True
    volume.data.materials.append(water_volume(ocean, config))
    if marine_mask:
        marine.volume(volume.data.materials[0], ocean, marine_mask, config)
    volume["purpose"] = "Optical absorption only; bounds do not represent surveyed depths"
    # Unassigned action: useful presets without animation overriding manual edits.
    for frame, tide in zip(config["blender"]["animation_frames"], water["tide_test_states_cd_m"]):
        ocean["tide_height_cd"] = tide
        ocean.keyframe_insert(
            data_path='["tide_height_cd"]', frame=frame, group="Tide tests (CD metres)"
        )
    action = ocean.animation_data.action
    action.name = "TideTests • assign to Ocean to animate"
    action.use_fake_user = True
    ocean.animation_data.action = None
    ocean["tide_height_cd"] = water["initial_tide_cd_m"]
    return ocean
