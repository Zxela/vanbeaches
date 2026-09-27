"""Extract terrain only from saved Phase 1 Blender worlds; never export water/debug.

blender --background --python export_world.py -- --output 3d/output/web-raw
The small GLB writer preserves indexed geometry, local metre coordinates and holes.
"""

import argparse
import hashlib
import json
import struct
import sys
from pathlib import Path

import bpy
import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def web_coordinates(points):
    """Right-handed rotation, not a reflection: east, up, south."""
    points = np.asarray(points)
    return points[..., [0, 2, 1]] * [1, 1, -1]


def write_glb(path, positions, faces, colors, uv, texture=None):
    binary = bytearray()
    views, accessors = [], []

    def view(data):
        binary.extend(b"\0" * (-len(binary) % 4))
        index = len(views)
        views.append({"buffer": 0, "byteOffset": len(binary), "byteLength": len(data)})
        binary.extend(data)
        return index

    def accessor(data, kind, component):
        index = len(accessors)
        entry = {
            "bufferView": view(data.tobytes()),
            "componentType": component,
            "count": len(data),
            "type": kind,
        }
        if kind == "VEC3" and component == 5126:
            entry.update(min=data.min(axis=0).tolist(), max=data.max(axis=0).tolist())
        accessors.append(entry)
        return index

    # Area-weighted smooth normals, with retained holes and original triangle winding.
    normals = np.zeros_like(positions)
    triangles = positions[faces]
    cross = np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0])
    for corner in range(3):
        np.add.at(normals, faces[:, corner], cross)
    normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-12)
    primitive = {
        "attributes": {
            "POSITION": accessor(positions.astype("<f4"), "VEC3", 5126),
            "NORMAL": accessor(normals.astype("<f4"), "VEC3", 5126),
            "COLOR_0": accessor(colors.astype("<f4"), "VEC3", 5126),
            "TEXCOORD_0": accessor(uv.astype("<f4"), "VEC2", 5126),
        },
        "indices": accessor(faces.astype("<u4").ravel(), "SCALAR", 5125),
        "material": 0,
    }
    material = {"pbrMetallicRoughness": {"metallicFactor": 0, "roughnessFactor": 1}}
    doc = {
        "asset": {"version": "2.0", "generator": "Van Beaches Phase 2"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": [primitive]}],
        "materials": [material],
        "bufferViews": views,
        "accessors": accessors,
    }
    if texture:
        doc["images"] = [{"bufferView": view(texture), "mimeType": "image/png"}]
        doc["textures"] = [{"source": 0}]
        material["pbrMetallicRoughness"]["baseColorTexture"] = {"index": 0}
    binary.extend(b"\0" * (-len(binary) % 4))
    doc["buffers"] = [{"byteLength": len(binary)}]
    encoded = json.dumps(doc, separators=(",", ":")).encode()
    encoded += b" " * (-len(encoded) % 4)
    path.write_bytes(
        struct.pack("<III", 0x46546C67, 2, 28 + len(encoded) + len(binary))
        + struct.pack("<II", len(encoded), 0x4E4F534A)
        + encoded
        + struct.pack("<II", len(binary), 0x004E4942)
        + binary
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "output/web-raw")
    parser.add_argument("--name", default="vancouver_coast")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])
    args.output.mkdir(parents=True, exist_ok=True)
    records = []
    source_hashes = {}
    source_key = None
    for suffix, lod in (("_overview", 1), ("", 2)):
        source = ROOT / "output" / f"{args.name}{suffix}.blend"
        bpy.ops.wm.open_mainfile(filepath=str(source))
        manifest = json.loads(bpy.data.texts["world-metadata.json"].as_string())
        if source_key is not None and source_key != manifest["config_sha256"]:
            raise ValueError(
                "Detailed and overview Blender worlds have different source configurations"
            )
        source_key = manifest["config_sha256"]
        if not manifest["source_acquisition_complete"]:
            raise ValueError("Web release requires complete Phase 1 acquisition")
        beach_source = ROOT.parent / manifest["beaches"]["source"]
        if (
            hashlib.sha256(beach_source.read_bytes()).hexdigest()
            != manifest["beaches"]["source_sha256"]
        ):
            # Phase 1 hashes decoded text, normalizing Windows line endings.
            if (
                hashlib.sha256(beach_source.read_text(encoding="utf-8").encode()).hexdigest()
                != manifest["beaches"]["source_sha256"]
            ):
                raise ValueError("Beach metadata changed; rebuild Phase 1 before export")
        source_hashes[source.name] = {
            "bytes": source.stat().st_size,
            "configSha256": manifest["config_sha256"],
        }
        groups = {}
        for collection in ("Terrain", "Seabed", "Shoreline"):
            for obj in bpy.data.collections[collection].objects:
                if obj.type != "MESH" or "metadata" not in obj:
                    continue
                tile = json.loads(obj["metadata"])
                if lod == 2 and tile["lod"] != "coastal":
                    continue
                groups.setdefault(tile["id"], []).append(obj)
        for tile_id, objects in sorted(groups.items()):
            tile = json.loads(objects[0]["metadata"])
            positions, faces, total = [], [], 0
            photo = None
            for obj in objects:
                mesh = obj.data
                mesh.calc_loop_triangles()
                points = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
                mesh.vertices.foreach_get("co", points)
                points = points.reshape(-1, 3)
                # Include any saved object transforms explicitly relative to the tile anchor.
                matrix = np.array(obj.matrix_world)
                points = points @ matrix[:3, :3].T + matrix[:3, 3] - tile["local_transform"]
                indices = np.empty(len(mesh.loop_triangles) * 3, dtype=np.int32)
                mesh.loop_triangles.foreach_get("vertices", indices)
                positions.append(points)
                faces.append(indices.reshape(-1, 3) + total)
                total += len(points)
                for material in mesh.materials:
                    if material and material.use_nodes:
                        for node in material.node_tree.nodes:
                            if node.type == "TEX_IMAGE" and node.image:
                                photo = node.image
            positions = np.concatenate(positions)
            uv = np.column_stack((positions[:, 0] / 500, -positions[:, 1] / 500))
            colors = np.tile([0.24, 0.32, 0.19], (len(positions), 1))
            texture = None
            if photo and photo.packed_file:
                texture = bytes(photo.packed_file.data)
                pixels = np.empty(len(photo.pixels), dtype=np.float32)
                photo.pixels.foreach_get(pixels)
                width, height = photo.size
                pixels = pixels.reshape(height, width, 4)
                samples = pixels[
                    np.clip(((1 - uv[:, 1]) * (height - 1)).astype(int), 0, height - 1),
                    np.clip((uv[:, 0] * (width - 1)).astype(int), 0, width - 1),
                ]
                colors = colors * (1 - samples[:, 3:]) + samples[:, :3] * samples[:, 3:]
            name = f"{tile_id}.glb"
            positions = web_coordinates(positions).astype(np.float32)
            write_glb(args.output / name, positions, np.concatenate(faces), colors, uv, texture)
            transform = web_coordinates(tile["local_transform"]).tolist()
            records.append(
                {
                    "id": tile_id.rsplit("_", 1)[0],
                    "lod": lod,
                    "file": name,
                    "worldTransform": transform,
                    "bounds": {
                        "min": (positions.min(axis=0) + transform).tolist(),
                        "max": (positions.max(axis=0) + transform).tolist(),
                    },
                    "geographicBounds": tile["geographic_bounds"],
                    "sourceResolution": tile["source_resolution"],
                    "spacingMetres": tile["spacing_m"],
                }
            )
        print(f"Extracted {len(groups)} LOD {lod} tiles", flush=True)
    # Config + provenance metadata only; raw GIS source manifests stay offline.
    (args.output / "export.json").write_text(
        json.dumps(
            {
                "tiles": records,
                "config": manifest["config"],
                "origin": manifest["origin_projected"],
                "projectedBounds": manifest["projected_bounds"],
                "beaches": manifest["beaches"],
                "sources": source_hashes,
                "cameraAnchors": manifest["camera_anchors"],
                "status": manifest["status"],
                "configSha256": manifest["config_sha256"],
            },
            indent=2,
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
