"""Read the existing constrained TypeScript metadata; never maintain a duplicate list."""

import hashlib
import re

from gis.common import ROOT


def destinations(world):
    path = ROOT.parent / "shared/src/data/beaches.ts"
    source = path.read_text(encoding="utf-8")
    # Deliberately strict adapter for the current literal layout. Fail on schema drift.
    pattern = re.compile(
        r"\bid:\s*'(?P<id>[^']+)',\s*name:\s*'(?P<name>[^']+)',\s*"
        r"slug:\s*'(?P<slug>[^']+)',\s*location:\s*\{\s*"
        r"latitude:\s*(?P<lat>-?[\d.]+),\s*longitude:\s*(?P<lon>-?[\d.]+)\s*\}",
        re.M,
    )
    records = list(pattern.finditer(source))
    if not records or len(records) != len(re.findall(r"^\s+id:", source, re.M)):
        raise ValueError("Beach metadata schema changed; update 3d/gis/beaches.py adapter")
    result = []
    for match in records:
        record = match.groupdict()
        lon, lat = float(record.pop("lon")), float(record.pop("lat"))
        result.append(
            {
                **record,
                "longitude": lon,
                "latitude": lat,
                "inside_aoi": world.inside(lon, lat),
                "worldPosition": world.local(lon, lat, None),
                "position_z_status": "not_sampled",
            }
        )
    return {
        "source": "shared/src/data/beaches.ts",
        "source_sha256": hashlib.sha256(source.encode()).hexdigest(),
        "beaches": result,
    }
