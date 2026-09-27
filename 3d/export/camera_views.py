"""Compose views using existing measured anchors; never move the beach or city."""

import json
from pathlib import Path

from gis.common import write_json


DIRECTIONS = {
    "kitsilano-beach": (0.75, -0.66),
    "jericho-beach": (0.8, -0.6),
    "spanish-banks": (0.8, -0.6),
    "locarno-beach": (0.8, -0.6),
    "english-bay": (0.65, -0.76),
    "third-beach": (0.2, -0.98),
}

# Offshore camera positions preserve beach foreground and the distant skyline/horizon.
CONTEXT = {
    "kitsilano-beach": ((-650, 140, -250), (500, 35, -850)),
    "jericho-beach": ((-500, 180, -350), (1000, 35, -1000)),
    "spanish-banks": ((-600, 180, -300), (1200, 30, -1000)),
    "locarno-beach": ((-500, 180, -350), (1000, 35, -1000)),
    "english-bay": ((-550, 170, 350), (400, 30, -700)),
    "third-beach": ((-500, 150, 150), (250, 30, -750)),
}


def compose(manifest):
    for beach in manifest["beaches"]:
        if beach["id"] not in DIRECTIONS:
            continue
        dx, dz = DIRECTIONS[beach["id"]]
        target = beach["worldPosition"]
        approach, aim = CONTEXT[beach["id"]]
        beach["cameraApproach"] = [target[i] + approach[i] for i in range(3)]
        beach["cameraTarget"] = [target[i] + aim[i] for i in range(3)]
        if beach.get("beachView"):
            p = beach["beachView"]["position"]
            beach["beachView"]["target"] = [p[0] + dx * 600, p[1] - 2, p[2] + dz * 600]
    return manifest


if __name__ == "__main__":
    path = Path(__file__).resolve().parents[2] / "client/public/coast-assets/manifest.json"
    write_json(path, compose(json.loads(path.read_text(encoding="utf-8"))))
