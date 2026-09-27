<div align="center">

# &nbsp;Van Beaches

### Real-time beach conditions for Vancouver, BC

[![Live Site](https://img.shields.io/badge/live-vanbeaches.pages.dev-0ea5e9?style=for-the-badge&logo=cloudflareworkers&logoColor=white)](https://vanbeaches.pages.dev)

[![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare_Pages-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Biome](https://img.shields.io/badge/Biome-60A5FA?style=flat-square&logo=biome&logoColor=white)](https://biomejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)

**Weather** &bull; **Tides** &bull; **UV Index** &bull; **Activity Scores** &bull; **Webcams** &bull; **Dark Mode**

</div>

---

## What is this?

Release work remaining is tracked in [FOLLOW_UPS.md](FOLLOW_UPS.md). The coastal
world implementation and validation record is in [3d/COMPLETION.md](3d/COMPLETION.md).

Van Beaches pulls together live weather, tide predictions, and UV data into a single dashboard so you can figure out the best time to hit the beach — no tab-juggling required.

It covers **9 beaches** across Vancouver: English Bay, Kitsilano, Jericho, Spanish Banks, Locarno, Second Beach, Third Beach, Sunset Beach, and Trout Lake.

## Features

| | Feature | Details |
|---|---|---|
| **Live Weather** | Temperature, wind, UV, humidity, and 5-day forecast | [Open-Meteo](https://open-meteo.com/) |
| **Tide Predictions** | Animated chart with high/low markers and a live "now" indicator | [Canadian IWLS API](https://api-iwls.dfo-mpo.gc.ca/) |
| **Best Time to Visit** | Hourly scoring based on weather, UV, tide level, and golden hour | Composite algorithm |
| **Activity Scores** | Swimming, sunbathing, volleyball, kiteboarding rated against conditions | Per-activity weights |
| **Beach Comparison** | Side-by-side compare up to 3 beaches | &mdash; |
| **Favorites** | Save favorite beaches; returning users land on their top pick | LocalStorage |
| **Webcams** | Live feeds where available | &mdash; |
| **Dark Mode** | System-aware with manual toggle | &mdash; |
| **Water Quality** | Status badges (synthetic for now, real API planned) | &mdash; |

## Architecture

```
vanbeaches/
├── client/        React 19 + Vite + Tailwind — the SPA
├── shared/        Types, beach data, API response helpers
├── worker/        Cloudflare Worker — scheduled cache refresh
└── functions/     Cloudflare Pages Functions — on-demand API
```

A **Cloudflare Worker** runs cron jobs to keep a KV cache warm (weather every 30 min, tides hourly, water quality every 6 h). **Pages Functions** serve API requests cache-first, falling back to upstream on a miss. Both share the same KV namespace.

```
┌─────────┐    ┌──────────────────┐    ┌──────────┐
│  Client  │───▶ Pages Functions   │───▶│    KV    │
└─────────┘    └──────────────────┘    └────┬─────┘
                                            │
               ┌──────────────────┐         │
               │  Worker (cron)   │─────────┘
               └───────┬──────────┘
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
       Open-Meteo            DFO IWLS
```

## Getting Started

The interactive coastal world is available at **`/coast`**. Export the existing Blender world with
`pnpm 3d:export`, then run the client normally. See [Phase 2 web runtime](3d/WEB.md) for asset builds,
terrain streaming, profiling, mobile behaviour and deployment bundle setup.
[Phase 3 environment](3d/ENVIRONMENT.md) adds live tides, weather, real solar lighting and a
six-hour-past / 48-hour-ahead timeline with cached data and offline fallbacks.
[Phase 4 estimated activity](CROWD_MODEL.md) adds configurable crowd estimates, semantic activity
masks, animated instanced characters, distance LOD and mobile budgets. Activity is always labeled
as a low-confidence estimate; it is not a live headcount.
[Regional terrain](3d/REGIONAL.md) adds measured North Shore mountains.
[Coastal topology](3d/COASTAL-TOPOLOGY.md) and [urban context](3d/URBAN.md) add tide-dependent
marine connectivity, City **2009** building massing, sourced bridges, roads and park coverage.
[Harbour movement](3d/PHASE7-SOURCES.md) adds explicitly simulated vessels, aircraft and optional
bridge traffic. SeaBus remains suppressed where the surveyed marine corridor cannot be verified.
[Production operations](3d/PRODUCTION.md) covers quality tiers, reproducible releases and acceptance
checks; current browser validation is separate from the earlier phase benchmarks.

**Prerequisites:** Node.js >= 20, pnpm 9

```sh
pnpm install          # install dependencies
pnpm build            # build all workspaces (shared builds first)
pnpm dev              # start local dev server via Wrangler
```

```sh
pnpm check            # lint with Biome
pnpm type-check       # typecheck all workspaces
pnpm test             # run Vitest + Playwright
```

> No API keys required — Open-Meteo and IWLS are both free and open.

## Data Sources

| Source | What it provides | Refresh rate |
|---|---|---|
| [Open-Meteo](https://open-meteo.com/) | Weather, UV index, wind, humidity | 30 min |
| [DFO IWLS](https://api-iwls.dfo-mpo.gc.ca/) | Observed levels and predictions (Vancouver 07735) | 1 h |

## Beach photography

Beach images must show the exact named beach and include verified usage rights. When a verified
image is unavailable, the client uses its condition-aware atmospheric background rather than a
generic stock photo.

Production derivatives should be delivered from a Cloudflare R2 custom domain using
`beaches/{beach-id}/hero-1600.webp`, `hero-960.webp`, and `thumb-640.webp`. Publish only optimized
derivatives, strip EXIF metadata, and serve versioned objects with a one-year immutable cache.

## Offline coastal world

The [3D coastal pipeline](3d/README.md) prepares Vancouver LiDAR, CHS NONNA, regional DEM and
urban source data for Blender and versioned web assets. Its separate Python environment performs
offline asset generation; normal frontend builds restore or reuse those assets without running GIS
or Blender. Genuine survey gaps remain unknown. The City building layer represents 2009, while
harbour movement is simulated rather than a live AIS or aircraft feed.

After refreshing urban/marine assets and exporting existing Blender scenes, run
`python 3d/pipeline.py finalize --threads 4` to update native cameras and evaluated tide bindings
and verify all four saved scenes without regenerating terrain. Run heavyweight GIS, Blender and
browser checks sequentially on constrained hardware. See [production operations](3d/PRODUCTION.md)
for release packaging and validation.

## License

MIT
