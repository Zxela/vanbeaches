"""Portable indexed GLBs from the exact GIS TINs also consumed by Blender."""

import json
import shutil
import struct
from collections import defaultdict

import numpy as np

from gis.common import ROOT, sha256, write_json
from mesh_geometry import shore_skirts


def add_regional_destinations(manifest, horizons):
    """Expose existing measured regional camera anchors when coastal DEM coverage is absent."""
    import math

    existing = {beach["id"] for beach in manifest["beaches"]}
    for beach in horizons["beaches"]:
        if beach["id"] in existing:
            continue
        position = beach["position"]
        angle = math.radians(beach["heading"])
        dx, dz = math.sin(angle), -math.cos(angle)
        target = [position[0] + dx * 400, position[1] - 3, position[2] + dz * 400]
        manifest["beaches"].append(
            {
                "id": beach["id"],
                "slug": beach["id"],
                "worldPosition": position,
                "cameraTarget": position,
                "cameraApproach": [
                    position[0] - dx * 500,
                    position[1] + 220,
                    position[2] - dz * 500,
                ],
                "preferredAltitude": 220,
                "beachView": {"position": position, "target": target},
                "source": "existing measured regional horizon observer; no fabricated coastal elevation",
            }
        )


def glb(vertices, faces):
    positions = vertices[:, [0, 2, 1]].copy().astype("<f4")
    positions[:, 2] *= -1
    indices = faces.astype("<u4")
    normals = np.zeros_like(positions)
    tri = positions[indices]
    face_normals = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    for i in range(3):
        np.add.at(normals, indices[:, i], face_normals)
    normals /= np.maximum(1e-10, np.linalg.norm(normals, axis=1)[:, None])
    arrays = [positions, normals, indices]
    binary, views, accessors = b"", [], []
    for i, array in enumerate(arrays):
        blob = array.tobytes()
        views.append(
            {
                "buffer": 0,
                "byteOffset": len(binary),
                "byteLength": len(blob),
                "target": 34963 if i == 2 else 34962,
            }
        )
        accessor = {
            "bufferView": i,
            "componentType": 5125 if i == 2 else 5126,
            "count": int(array.size if i == 2 else len(array)),
            "type": "SCALAR" if i == 2 else "VEC3",
        }
        if i == 0:
            accessor.update(min=array.min(axis=0).tolist(), max=array.max(axis=0).tolist())
        accessors.append(accessor)
        binary += blob
    doc = {
        "asset": {"version": "2.0", "generator": "Van Beaches measured regional TIN"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1}, "indices": 2}]}],
        "buffers": [{"byteLength": len(binary)}],
        "bufferViews": views,
        "accessors": accessors,
    }
    encoded = json.dumps(doc, separators=(",", ":")).encode()
    encoded += b" " * (-len(encoded) % 4)
    return (
        struct.pack("<III", 0x46546C67, 2, 28 + len(encoded) + len(binary))
        + struct.pack("<II", len(encoded), 0x4E4F534A)
        + encoded
        + struct.pack("<II", len(binary), 0x004E4942)
        + binary
    )


def export(world, output=None):
    base = world.processed / "regional"
    source = json.loads((base / "regional.json").read_text())
    if source["worldConfigSha256"] != world.key or not source["horizonPass"]:
        raise ValueError("Regional geometry does not match the verified coastal world")
    output = output or ROOT.parent / "client/public/coast-assets"
    manifest = json.loads((output / "manifest.json").read_text())
    tiles = []
    groups = defaultdict(list)
    for tile in source["tiles"]:
        groups[
            (tile["bounds"][0] // 8000 * 8000, tile["bounds"][1] // 8000 * 8000, tile["lod"])
        ].append(tile)
    for (x, y, lod), members in sorted(groups.items()):
        positions, triangles, count = [], [], 0
        for member in members:
            if sha256(base / member["file"]) != member["sourceSha256"]:
                raise ValueError(
                    "Regional mesh changed after validation; rerun regional processing"
                )
            with np.load(base / member["file"]) as mesh:
                v, f = shore_skirts(mesh["vertices"], mesh["faces"])
                positions.append(v)
                triangles.append(f + count)
                count += len(v)
        vertices, faces = np.concatenate(positions), np.concatenate(triangles)
        tile = {
            "id": f"regional_{x}_{y}",
            "lod": lod,
            "spacing": min(t["spacing"] for t in members),
            "sourcePixels": {"MRDEM": sum(t["sourcePixels"]["MRDEM"] for t in members)},
        }
        # Remove unused vertices before export, saving ocean and interior-coast payload.
        used, inverse = np.unique(faces, return_inverse=True)
        vertices, faces = vertices[used], inverse.reshape(-1, 3)
        centre = (vertices.min(axis=0) + vertices.max(axis=0)) / 2
        blob = glb(vertices - centre, faces)
        import hashlib

        digest = hashlib.sha256(blob).hexdigest()
        name = f"{tile['id']}-lod{tile['lod']}-{digest[:12]}.glb"
        (output / name).write_bytes(blob)
        points = vertices[:, [0, 2, 1]].copy()
        points[:, 2] *= -1
        tiles.append(
            {
                "id": tile["id"],
                "lod": tile["lod"],
                "layer": "regional",
                "assetUrl": name,
                "bounds": {"min": points.min(axis=0).tolist(), "max": points.max(axis=0).tolist()},
                "worldTransform": [float(centre[0]), float(centre[2]), float(-centre[1])],
                "triangles": len(faces),
                "bytes": len(blob),
                "sha256": digest,
                "source": "HRDEM + MRDEM" if tile["sourcePixels"]["MRDEM"] else "HRDEM",
                "sourceSpacing": tile["spacing"],
            }
        )
    budgets = source["config"]["budgets"]
    measured = {
        "coarseTriangles": sum(t["triangles"] for t in tiles if t["lod"] == 0),
        "detailTriangles": sum(t["triangles"] for t in tiles if t["lod"] == 1),
        "downloadBytes": sum(t["bytes"] for t in tiles),
        "textureBytes": 0,
        "drawCalls": sum(t["lod"] == 0 for t in tiles),
    }
    for key, limit in budgets.items():
        if measured[key] > limit:
            raise ValueError(f"Regional {key}: {measured[key]} exceeds {limit}")
    name = f"horizons-{sha256(base / 'horizons.json')[:12]}.json"
    shutil.copyfile(base / "horizons.json", output / name)
    add_regional_destinations(manifest, json.loads((base / "horizons.json").read_text()))
    manifest["tiles"] = [t for t in manifest["tiles"] if t.get("layer") != "regional"] + tiles
    manifest["regional"] = {
        "horizonsUrl": name,
        "earthRadiusMetres": source["config"]["earth_radius_m"]
        if source["config"]["curvature"]
        else 0,
        "snow": source["config"]["snow"],
        "budgets": budgets,
        "measured": measured,
        "maxDistanceMetres": source["config"]["survey_radius_m"],
        "sourceAttribution": "Natural Resources Canada, CanElevation HRDEM Mosaic DTM and MRDEM DTM. Open Government Licence – Canada.",
        "verticalOffsetMetres": source["config"]["cgvd2013_to_world_m"],
    }
    shutil.copyfile(ROOT / "NOTICE.md", output / "NOTICE.txt")
    write_json(output / "manifest.json", manifest)
    write_json(world.metadata / "latest-regional-export.json", manifest["regional"])
    print(json.dumps(measured, indent=2), flush=True)
