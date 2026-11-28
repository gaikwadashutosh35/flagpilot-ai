# FlagPilot web app

The FlagPilot web app: React + Vite + TypeScript, using the Flagsmith React SDK (`@flagsmith/flagsmith`).

## Routes

Defined in `src/app/App.tsx`.

- `/` — landing page with the experiment CTA and the demo (`src/features/playground`)
- `/copilot` — experiment plan intake and editor (`src/features/copilot`)
- `/experiment` — experiment status (`src/features/experiments`)
- `/results` — results from a saved snapshot (`src/features/results`)

## Scripts

Run from this folder (`apps/web`).

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) and build for production
- `npm run lint` — run oxlint
- `npm run preview` — serve the production build locally
- `npm test` — run unit tests with Vitest
- `npm run test:e2e` — run Playwright browser tests (`e2e/`)

## Where code lives

- `src/features/*` — one folder per screen: `copilot`, `experiments`, `playground`, `results`
- `src/lib/flagsmith/` — Flagsmith setup, env key check and event helpers
- `src/lib/identity.ts` — the stable anonymous visitor ID
- `scripts/` — Node scripts for the project owner (`simulate-traffic.mjs`, `snapshot-results.mjs`) and their tests

## Environment

One variable, set in `.env.local` (see `.env.example`):

- `VITE_FLAGSMITH_ENVIRONMENT_KEY` — the Flagsmith client environment key. Never put a server key (`ser.*`) or any other secret here.

## Full setup

See the "Setup" section in the root [README.md](../../README.md), including its Windows note under "Run the tests".
