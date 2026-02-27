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
| [DFO IWLS](https://api-iwls.dfo-mpo.gc.ca/) | Tide predictions (Point Atkinson) | 1 h |

## License

MIT
