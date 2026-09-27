"""Render a reproducible shore/tide review movie from a generated Blender world."""

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from experience import activate, verify  # noqa: E402


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--step", type=int, default=2, help="Render every Nth frame (1 = full 24fps)"
    )
    parser.add_argument(
        "--stills", action="store_true", help="Render five checkpoints instead of a movie"
    )
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])
    if args.step < 1:
        raise ValueError("Frame step must be positive")
    manifest = json.loads(bpy.data.texts["world-metadata.json"].as_string())
    if "shore-experience-validation.json" not in bpy.data.texts:
        raise ValueError(
            "Complete the source acquisition and rebuild before rendering a shore demonstration"
        )
    settings = manifest["config"]["presentation"]["experience"]
    scene, ocean = bpy.context.scene, bpy.data.objects["Ocean"]
    activate(scene, ocean)
    checks = verify(scene, ocean)
    scene.render.resolution_x = settings["preview_width"]
    scene.render.resolution_y = settings["preview_height"]
    scene.render.resolution_percentage = 100
    scene.cycles.samples = settings["preview_samples"]
    scene.render.use_persistent_data = True
    scene.render.image_settings.file_format = "PNG"
    # Use an available NVIDIA device for this offline review; CPU remains supported.
    preferences = bpy.context.preferences.addons["cycles"].preferences
    try:
        preferences.compute_device_type = "OPTIX"
        preferences.get_devices()
        devices = [device for device in preferences.devices if device.type == "OPTIX"]
        if devices:
            for device in preferences.devices:
                device.use = device in devices
            scene.cycles.device = "GPU"
    except (TypeError, RuntimeError):
        scene.cycles.device = "CPU"
    suffix = "_overview" if manifest["scene_lod"] == "overview" else ""
    output = Path(bpy.data.filepath).parent
    fingerprint = hashlib.sha256(
        (
            json.dumps(manifest, sort_keys=True) + str(Path(bpy.data.filepath).stat().st_mtime_ns)
        ).encode()
    ).hexdigest()
    directory = (
        output
        / ("shore-preview" + suffix)
        / (fingerprint[:12] + f"-step{args.step}" + ("-stills" if args.stills else ""))
    )
    directory.mkdir(parents=True, exist_ok=True)
    index_path = directory / "render-index.json"
    signature = {"scene": fingerprint, "step": args.step, "stills": args.stills}
    reuse = index_path.exists() and json.loads(index_path.read_text()) == signature
    index_path.write_text(json.dumps(signature, indent=2))
    frames = (
        [
            1,
            round(settings["arrival_seconds"] * scene.render.fps / 2),
            round(settings["arrival_seconds"] * scene.render.fps),
            round(
                (settings["tide_start_seconds"] + settings["tide_end_seconds"])
                * scene.render.fps
                / 2
            ),
            scene.frame_end,
        ]
        if args.stills
        else list(range(1, scene.frame_end + 1, args.step))
    )
    report = {
        "checks": checks,
        "render_device": scene.cycles.device,
        "scene_lod": manifest["scene_lod"],
        "note": "Accelerated tide demonstration. Rendered review, not interactive viewport performance.",
        "rendered_fps": scene.render.fps / args.step,
        "frames": [],
    }
    for index, frame in enumerate(frames, start=1):
        scene.frame_set(frame)
        target = directory / (f"checkpoint-{frame:04d}.png" if args.stills else f"{index:04d}.png")
        started = time.perf_counter()
        if not reuse or not target.exists():
            scene.render.filepath = str(target)
            bpy.ops.render.render(write_still=True)
        report["frames"].append(
            {
                "frame": frame,
                "tide_cd_m": ocean.location.z - ocean["chart_datum_offset_m"],
                "seconds": round(time.perf_counter() - started, 3),
                "file": str(target.relative_to(output)),
            }
        )
        print(f"Shore review {index}/{len(frames)} (frame {frame})", flush=True)
    if not args.stills:
        ffmpeg = shutil.which("ffmpeg")
        if ffmpeg:
            movie = output / ("shore-experience" + suffix + ".mp4")
            subprocess.run(
                [
                    ffmpeg,
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-y",
                    "-framerate",
                    str(scene.render.fps / args.step),
                    "-i",
                    str(directory / "%04d.png"),
                    "-frames:v",
                    str(len(frames)),
                    "-c:v",
                    "libx264",
                    "-crf",
                    "19",
                    "-pix_fmt",
                    "yuv420p",
                    "-movflags",
                    "+faststart",
                    str(movie),
                ],
                check=True,
            )
            report["movie"] = movie.name
        else:
            report["movie"] = None
            report["encoding_note"] = (
                "Install ffmpeg and rerun; matching PNG frames will be reused."
            )
    (
        output / ("shore-preview-report" + suffix + ("-stills" if args.stills else "") + ".json")
    ).write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
