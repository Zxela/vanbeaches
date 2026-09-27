"""Use the lockfile-pinned Node optimizer from the Python project build."""

import os
import shutil
import subprocess
from pathlib import Path


def optimize(raw, output):
    node = os.environ.get("NODE") or shutil.which("node")
    if not node:
        raise FileNotFoundError("Node 22+ must be on PATH (or set NODE)")
    script = Path(__file__).with_suffix(".mjs")
    subprocess.run([node, str(script), str(raw), str(output)], check=True)
