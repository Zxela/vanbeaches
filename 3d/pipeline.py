"""Run from the repository root: python 3d/pipeline.py --help."""

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

from gis.common import ROOT, World


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "command",
        choices=[
            "discover",
            "data",
            "process",
            "imagery",
            "blender",
            "world",
            "validate",
            "preview",
            "export",
            "regional",
            "regional-export",
            "finalize",
            "urban",
            "urban-export",
            "marine",
        ],
    )
    parser.add_argument("--config", type=Path)
    parser.add_argument(
        "--source", choices=["all", "lidar", "bathymetry", "supplemental"], default="all"
    )
    parser.add_argument(
        "--refresh", action="store_true", help="Explicitly refresh cached downloads"
    )
    parser.add_argument(
        "--allow-partial",
        action="store_true",
        help="Build an explicitly incomplete inspection scene",
    )
    parser.add_argument("--render", action="store_true")
    parser.add_argument(
        "--step", type=int, default=2, help="Preview frame interval; 1 renders full 24fps"
    )
    parser.add_argument("--stills", action="store_true", help="Preview five checkpoints only")
    parser.add_argument(
        "--lod",
        choices=["coastal", "overview"],
        default="coastal",
        help="Blender mesh selection; overview writes a separate lightweight .blend",
    )
    parser.add_argument("--blender", default=os.environ.get("BLENDER"))
    parser.add_argument(
        "--threads", type=int, default=4, help="Maximum Blender worker threads (default: 4)"
    )
    args = parser.parse_args()
    world = World(args.config)
    command = args.command
    if command == "finalize":
        executable = args.blender or shutil.which("blender")
        if not executable and os.name == "nt":
            candidates = sorted(
                Path("C:/Program Files/Blender Foundation").glob("Blender */blender.exe")
            )
            executable = str(candidates[-1]) if candidates else None
        if not executable:
            raise FileNotFoundError("Set BLENDER or pass --blender")
        for suffix in ("", "_shore_experience", "_overview", "_overview_shore_experience"):
            path = ROOT / "output" / f"{world.config['name']}{suffix}.blend"
            if path.exists():
                subprocess.run(
                    [
                        executable,
                        "--background",
                        "--threads",
                        str(max(1, args.threads)),
                        str(path),
                        "--python-exit-code",
                        "1",
                        "--python",
                        str(ROOT / "blender/finalize_world.py"),
                    ],
                    check=True,
                )
        return 0
    if command in ("urban", "urban-export"):
        from gis.urban import run as urban

        urban(world, args.refresh)
        return 0
    if command == "marine":
        from gis.marine import publish

        publish(world)
        return 0
    if command in ("regional", "regional-export"):
        from export.export_regional import export as export_regional

        if command == "regional":
            from gis.preprocess_regional_dem import run

            run(world, args.refresh)
        from gis.validate_regional import validate as validate_regional

        validate_regional(world)
        export_regional(world)
        return 0
    if command == "export":
        regional_report = world.processed / "regional/regional.json"
        if regional_report.exists():
            import json

            regional = json.loads(regional_report.read_text())
            if not regional["horizonPass"] or regional["worldConfigSha256"] != world.key:
                raise ValueError("Regional terrain must pass validation before a combined release")
        from export.optimize_assets import optimize
        from export.generate_manifest import generate

        executable = args.blender or shutil.which("blender")
        if not executable and os.name == "nt":
            candidates = sorted(
                Path("C:/Program Files/Blender Foundation").glob("Blender */blender.exe")
            )
            executable = str(candidates[-1]) if candidates else None
        if not executable:
            raise FileNotFoundError("Set BLENDER or pass --blender /path/to/blender")
        raw = ROOT / "output/web-raw"
        output = ROOT.parent / "client/public/coast-assets"
        subprocess.run(
            [
                executable,
                "--background",
                "--threads",
                str(max(1, args.threads)),
                "--python-exit-code",
                "1",
                "--python",
                str(ROOT / "export/export_world.py"),
                "--",
                "--output",
                str(raw),
                "--name",
                world.config["name"],
            ],
            check=True,
        )
        optimize(raw, output)
        generate(raw, output)
        if (world.processed / "regional/regional.json").exists():
            from export.export_regional import export as export_regional

            export_regional(world, output)
        if (world.processed / "urban/urban.json").exists():
            from gis.urban import run as urban

            urban(world)
        from gis.marine import publish

        publish(world, output)
        return 0
    if command in ("discover", "world", "data"):
        from gis.acquire import discover, fetch

        discover(world, args.refresh)
        if command != "discover":
            ready = fetch(world, args.source, args.refresh)
            if not ready and not args.allow_partial:
                print("Sources missing. See 3d/data/metadata/acquisition-*.json and README.")
                return 2
            if args.source in ("all", "supplemental"):
                from gis.supplements import acquire

                acquire(world, args.refresh)
    if command in ("process", "world"):
        from gis.preprocess import process
        from gis.build_coast import build

        process(world, args.allow_partial)
        build(world, args.allow_partial)
    if command in ("validate", "world", "process"):
        from gis.validate_data import validate

        report = validate(world)
        if not report["structural_checks_pass"]:
            return 3
        if command == "validate" and not report["numerical_acceptance_pass"]:
            return 2
    if command in ("imagery", "world"):
        from gis.imagery import prepare

        prepare(world, args.refresh)
    if command == "world":
        from gis.urban import run as urban

        urban(
            world,
            args.refresh,
            update_manifest=(ROOT.parent / "client/public/coast-assets/manifest.json").exists(),
        )
    if command in ("blender", "world", "preview"):
        executable = args.blender or shutil.which("blender")
        if not executable and os.name == "nt":
            candidates = sorted(
                Path("C:/Program Files/Blender Foundation").glob("Blender */blender.exe")
            )
            executable = str(candidates[-1]) if candidates else None
        if not executable:
            raise FileNotFoundError("Set BLENDER or pass --blender /path/to/blender")
        if command == "preview":
            suffix = "_overview" if args.lod == "overview" else ""
            blend = ROOT / "output" / (world.config["name"] + suffix + ".blend")
            if not blend.exists():
                raise FileNotFoundError("Run blender first")
            call = [
                executable,
                "--background",
                "--threads",
                str(max(1, args.threads)),
                str(blend),
                "--python-exit-code",
                "1",
                "--python",
                str(ROOT / "blender/render_experience.py"),
                "--",
                "--step",
                str(args.step),
            ]
            if args.stills:
                call.append("--stills")
            subprocess.run(call, check=True)
            return 0
        manifest = world.processed / "world.json"
        if not manifest.exists():
            raise FileNotFoundError("Run process first")
        call = [
            executable,
            "--background",
            "--threads",
            str(max(1, args.threads)),
            "--factory-startup",
            "--python-exit-code",
            "1",
            "--python",
            str(ROOT / "blender/build_scene.py"),
            "--",
            "--manifest",
            str(manifest),
            "--lod",
            args.lod,
        ]
        if args.allow_partial:
            call.append("--allow-partial")
        if args.render:
            call.append("--render")
        subprocess.run(call, check=True)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print(f"Pipeline stopped: {error}", file=sys.stderr)
        sys.exit(1)
