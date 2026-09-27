"""Persistent inspection collections, geographic properties and an embedded guide."""

import json

import bpy


def subcollection(parent, name):
    result = bpy.data.collections.new(name)
    parent.children.link(result)
    return result


def create(collections, manifest, ocean):
    debug = collections["Debug"]
    gaps = subcollection(debug, "Survey gaps • bounds and source evidence")
    gaps.hide_render = True
    gaps.hide_viewport = True
    ox, oy, _ = manifest["origin_projected"]
    for feature in manifest["coverage_gaps"]["features"]:
        evidence = feature["properties"]
        west, south, east, north = evidence["projected_bounds"]
        mesh = bpy.data.meshes.new(evidence["id"])
        mesh.from_pydata(
            [
                (west - ox, south - oy, 5),
                (east - ox, south - oy, 5),
                (east - ox, north - oy, 5),
                (west - ox, north - oy, 5),
            ],
            [(0, 1), (1, 2), (2, 3), (3, 0)],
            [],
        )
        obj = bpy.data.objects.new(evidence["id"], mesh)
        gaps.objects.link(obj)
        obj.show_in_front = True
        obj["evidence"] = json.dumps(evidence)
    boundaries = subcollection(debug, "Tile boundaries • enable for inspection")
    boundaries.hide_viewport = True
    boundaries.hide_render = True
    conflicts = subcollection(debug, "Source disagreements • largest overlap samples")
    conflicts.hide_render = True
    conflicts.hide_viewport = True
    for index, sample in enumerate(manifest["validation"]["largest_overlap_conflicts"]):
        x, y = sample["local_xy"]
        mesh = bpy.data.meshes.new(f"SourceDisagreement_{index:02}")
        mesh.from_pydata([(x, y, sample["lidar_z_m"]), (x, y, sample["nonna_z_m"])], [(0, 1)], [])
        obj = bpy.data.objects.new(mesh.name, mesh)
        conflicts.objects.link(obj)
        obj.show_in_front = True
        obj["evidence"] = json.dumps(sample)
    for tile in manifest["tiles"]:
        if not tile["active"]:
            continue
        size = manifest["config"]["processing"]["tile_size_m"]
        mesh = bpy.data.meshes.new(tile["id"] + "_bounds")
        mesh.from_pydata(
            [(0, 0, 3), (size, 0, 3), (size, -size, 3), (0, -size, 3)],
            [(0, 1), (1, 2), (2, 3), (3, 0)],
            [],
        )
        obj = bpy.data.objects.new(mesh.name, mesh)
        boundaries.objects.link(obj)
        obj.location = tile["local_transform"]
        obj.show_in_front = True
        obj["projected_bounds"] = tile["projected_bounds"]
        obj["geographic_bounds"] = tile["geographic_bounds"]
    origin = bpy.data.objects.new("Origin • X east / Y north / Z up", None)
    debug.objects.link(origin)
    origin.empty_display_type = "ARROWS"
    origin.empty_display_size = 200
    origin.show_in_front = True
    origin["projected_origin"] = manifest["origin_projected"]
    origin["projected_crs"] = manifest["config"]["horizontal"]["crs"]
    origin["vertical_datum"] = manifest["config"]["vertical"]["world_datum"]
    destinations = subcollection(debug, "Destinations • from shared beach metadata")
    destinations.hide_render = True
    destinations.hide_viewport = True
    for beach in manifest["beaches"]["beaches"]:
        if not beach["inside_aoi"]:
            continue
        obj = bpy.data.objects.new(beach["id"], None)
        destinations.objects.link(obj)
        x, y, z = beach["worldPosition"]
        obj.location = (x, y, z if z is not None else 0)
        obj.empty_display_type = "SPHERE"
        obj.empty_display_size = 30
        obj.show_name = True
        obj["beach_metadata"] = json.dumps(beach)
        obj["elevation_unknown"] = z is None
    status = bpy.data.objects.new(manifest["status"], None)
    debug.objects.link(status)
    status["missing_files"] = json.dumps(manifest["missing_files"])
    status["NON_NAVIGATION"] = "Visualization only; approximate CGVD28/Chart Datum relationship"
    text = bpy.data.texts.new("START HERE — coast controls")
    text.write(f"""VAN BEACHES — PHASE 1 COAST\n
SOURCE STATUS: {manifest["status"]}
SCENE LOD: {manifest["scene_lod"]}
Missing source files: {len(manifest["missing_files"])}
No fabricated terrain fills missing surveys. See Debug and external validation.json.

Select Ocean > Object Properties > Custom Properties:
  tide_height_cd : tide in metres above Chart Datum; try 0.5, 1.5, 3, 4.5, 5
  display_mode   : 0 = natural water; 1 = current water depth; 2 = provenance
  aerial_imagery : 0 = procedural land; 1 = City of Vancouver 2022 aerial textures
Imagery is appearance only, faded out above the intertidal zone to avoid a photographed waterline.
Depth = water surface world Z minus ground world Z. Exposed ground retains land colour.
Provenance: green LIDAR; blue NONNA; orange interpolation/mixed-source faces/LOD edges.
Purple: independent Metro Vancouver 2022 bare-earth measurements filling primary source gaps.
Ocean.location.z is driven by tide_height_cd + chart_datum_offset_m.
Manual tide editing is the default. To animate, assign the saved TideTests action to Ocean.
The action is deliberately unassigned. Timeline markers describe the separate guided demonstration.
Complete-source builds also provide *_shore_experience.blend: open it and press Space.
It uses native camera keyframes and an accelerated 0.5 to 5m CD tide over 20 seconds.
Ocean.play_tide_demo enables that sequence; turn it off to restore manual tide height.
The Shore approach camera stops 1.75m above the prepared beach surface.
For optional buttons: open Text Editor, select 'Coast controls.py — optional sidebar', Run Script.
Return to the viewport, press N and open Coast. Fly from here creates an unanimated camera;
Shift+accent grave starts free flight. Tide may continue playing independently.
No automatic script execution is needed for the saved demonstration or manual properties.
Presentation settings live in config/presentation.json; changing them requires only a Blender rebuild.
In the Python Console, for example:
  bpy.data.objects['Ocean']['tide_height_cd'] = 0.5
  bpy.context.view_layer.update()

Terrain / Seabed / Shoreline collections separate source faces while sharing geometry edges.
Hide Water for unobstructed seafloor inspection. Switch viewport to Material Preview
or Rendered for depth/provenance colours. Use Z > Wireframe to inspect topology.
Debug contains tile bounds, source status, metre axes, and shared beach destinations.
Enable its Tile boundaries / Destinations subcollections as needed.
Survey gaps contains bounding boxes with source-file evidence (actual polygons are in coverage-gaps.geojson).
Rejected source joins contains wireframes of artificial connecting faces excluded from the terrain.
Their measured endpoint heights are unchanged; openings do not imply surveyed continuity.
Overview, Coastal flyby, Spanish Banks beach-level/tide-study and North-up survey cameras are available.
Walk/fly: Shift+accent grave in a 3D viewport (Blender standard shortcut).

Each tile object stores projected/geographic bounds, local transform, source resolution
and LOD metadata. Alternate overview LOD arrays remain in data/processed, not duplicated
in the scene. All geometry is in metres relative to the recorded origin.
The separate vancouver_coast_overview.blend uses measured 10m products for lighter navigation.
The detailed file opens in Solid shading for responsiveness; Z > Material Preview shows water/depth colours.

NONNA data is NOT FOR NAVIGATION. Neither surveying nor flood-risk guidance.
The station offset is approximate and local; CGVD28GVRD is not a rigorously transformed
regional hydrographic datum. Fine resampling of NONNA adds no survey accuracy.
This file was generated; make durable changes in 3d/config or pipeline source.
""")
    provenance = bpy.data.texts.new("world-metadata.json")
    provenance.write(json.dumps(manifest, indent=2))
    if manifest.get("imagery"):
        imagery_notice = bpy.data.texts.new("AERIAL IMAGERY — City of Vancouver 2022")
        imagery_notice.write(json.dumps(manifest["imagery"], indent=2))


def assert_scene(scene, manifest, ocean):
    """Verify persistent controls and collection contents before saving."""
    offset = manifest["config"]["vertical"]["chart_datum_offset_m"]
    initial = ocean["tide_height_cd"]
    demonstration = ocean.get("play_tide_demo", False)
    ocean["play_tide_demo"] = False
    for tide in manifest["config"]["water"]["tide_test_states_cd_m"]:
        ocean["tide_height_cd"] = tide
        ocean.update_tag()
        bpy.context.view_layer.update()
        evaluated = ocean.evaluated_get(bpy.context.evaluated_depsgraph_get())
        if abs(evaluated.location.z - (tide + offset)) > 1e-5:
            raise RuntimeError("Tide driver failed")
    ocean["tide_height_cd"] = initial
    ocean["play_tide_demo"] = demonstration
    ocean.update_tag()
    bpy.context.view_layer.update()
    initial_mode = ocean["display_mode"]
    optical_tree = bpy.data.objects["Water absorption volume"].data.materials[0].node_tree
    for mode in (0, 1, 2):
        ocean["display_mode"] = mode
        ocean.update_tag()
        bpy.context.view_layer.update()
        tree = optical_tree.evaluated_get(bpy.context.evaluated_depsgraph_get())
        density = (
            next(n for n in tree.nodes if n.type == "VOLUME_ABSORPTION")
            .inputs["Density"]
            .default_value
        )
        if "Marine absorption enabled density" in tree.nodes:
            # Connectivity multiplies this driven density. Inspect the live driver input,
            # not the now-unused default value of the linked absorption socket.
            absorption = next(n for n in tree.nodes if n.type == "VOLUME_ABSORPTION")
            if not absorption.inputs["Density"].is_linked:
                raise RuntimeError("Marine absorption mask must remain connected")
            density = tree.nodes["Marine absorption enabled density"].outputs[0].default_value
        if (mode == 0 and density <= 0) or (mode > 0 and abs(density) > 1e-8):
            raise RuntimeError("Water optics must clear in depth/provenance modes")
    ocean["display_mode"] = initial_mode
    ocean.update_tag()
    bpy.context.view_layer.update()
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
        if name not in bpy.data.collections:
            raise RuntimeError(f"Missing collection {name}")
    if not len(bpy.data.collections["Seabed"].objects):
        raise RuntimeError("No measured bathymetry in Blender scene")
    if manifest["source_acquisition_complete"] and not len(bpy.data.collections["Terrain"].objects):
        raise RuntimeError("Complete scene must contain LiDAR land")
    if scene.unit_settings.scale_length != 1 or not scene.camera:
        raise RuntimeError("Invalid world units or missing default camera")
    actual_faces = sum(
        len(obj.data.polygons)
        for name in ("Terrain", "Seabed", "Shoreline")
        for obj in bpy.data.collections[name].objects
    )
    expected_faces = sum(tile["faces"] for tile in manifest["tiles"] if tile["active"])
    if actual_faces != expected_faces:
        raise RuntimeError("Scene mesh count does not match chosen LOD products")
    if not any("Rejected source joins" in c.name for c in bpy.data.collections):
        raise RuntimeError("Missing rejected-join diagnostics")
    if not any("Survey gaps" in c.name for c in bpy.data.collections):
        raise RuntimeError("Missing survey-gap diagnostics")
    expected_images = len(
        {
            tile["imagery"]["file"]
            for tile in manifest["tiles"]
            if tile["active"] and tile.get("imagery")
        }
    )
    packed_images = sum(
        image.packed_file is not None and not image.get("marine_connectivity", False)
        for image in bpy.data.images
    )
    if packed_images != expected_images:
        raise RuntimeError("Scene is missing packed aerial textures")
