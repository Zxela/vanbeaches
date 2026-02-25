# Van Beaches

Real-time beach conditions dashboard for Vancouver, BC.

**Live site:** https://vanbeaches.pages.dev

## Features

- **Live weather** — temperature, wind, UV index, humidity, and 5-day forecast powered by [Open-Meteo](https://open-meteo.com/)
- **Tide predictions** — animated tide chart with high/low markers and a live "now" indicator, sourced from the [Canadian IWLS API](https://api-iwls.dfo-mpo.gc.ca/)
- **Best time to visit** — hourly scoring based on weather, UV, tide level, and golden hour
- **Activity recommendations** — swimming, sunbathing, volleyball, kiteboarding scored against current conditions
- **Beach comparison** — side-by-side comparison of up to 3 beaches
- **Favorites & smart redirect** — save favorite beaches; returning users land on their top pick
- **Webcam embeds** — live webcam feeds where available
- **Dark mode** — system-aware with manual toggle
- **Water quality** — status badges (synthetic data for now, real API integration planned)

## Beaches

English Bay, Kitsilano Beach, Jericho Beach, Spanish Banks, Locarno Beach, Second Beach, Third Beach, Sunset Beach, and Trout Lake.

## Architecture

Monorepo with three workspaces:

```
client/      React 19 + Vite + Tailwind — the SPA
shared/      Types, beach data, and API response helpers
worker/      Cloudflare Worker — scheduled cache refresh
functions/   Cloudflare Pages Functions — on-demand API
```

The **worker** runs cron jobs to keep a Cloudflare KV cache warm (weather every 30 min, tides every hour, water quality every 6 hours). The **Pages Functions** serve API requests cache-first, falling back to upstream APIs on a miss. Both share the same KV namespace.

## Tech Stack

- **Frontend:** React 19, React Router 7, Framer Motion, Tailwind CSS 3
- **Backend:** Cloudflare Pages Functions + Cloudflare Workers
- **Storage:** Cloudflare KV
- **Data sources:** Open-Meteo (weather), DFO-MPO IWLS (tides)
- **Tooling:** TypeScript, Vite, Vitest, Playwright, Biome, pnpm

## Development

**Prerequisites:** Node.js >= 20, pnpm 9

```sh
pnpm install
pnpm build            # build all workspaces (shared must build first)
pnpm dev              # serve client + Pages Functions locally via Wrangler
```

Other commands:

```sh
pnpm check            # lint (Biome)
pnpm type-check       # typecheck all workspaces
pnpm test             # run tests
```

No API keys are required — Open-Meteo and IWLS are both free and open.
