# Folder Structure

## As built (2026-11-28)

The tree below is the plan. These points differ from the repo.

- There is no `apps/api`, and no `tests/` folder. Both a root `.env.example` and `apps/web/.env.example` exist. The web app reads `apps/web/.env.local`.
- Tests sit next to the code (`*.test.ts`, `*.test.tsx`) and in `apps/web/e2e/` (Playwright).
- `apps/web/src/hooks`, `types`, `styles` and `lib/api` do not exist. Styles are in `src/index.css`.
- `apps/web/src/lib` has `flagsmith/`, `identity.ts`, `storage.ts` and `utils.ts`.
- `apps/web/scripts/` holds `simulate-traffic.mjs`, `snapshot-results.mjs`, `snapshot-lib.mjs` and their tests.
- The root `scripts/` folder holds `phase1-scaffold.ps1` and `verify-environment.ps1`.
- The repo root also has `netlify.toml` and `flagsmith.json`.

```text
flagpilot-ai/
├── CLAUDE.md                         # Persistent Claude Code project rules
├── README.md                         # Project pitch, setup and demo overview
├── .gitignore                        # Excludes secrets, builds and dependencies
├── .env.example                      # Names/placeholders only; no real secrets
├── apps/
│   ├── web/                          # React + Vite + TypeScript frontend
│   │   ├── public/                   # Static assets
│   │   └── src/
│   │       ├── app/                  # Router, providers and app composition
│   │       ├── components/
│   │       │   ├── layout/           # Sidebar, header and page shell
│   │       │   └── ui/               # Reusable accessible UI primitives
│   │       ├── features/
│   │       │   ├── copilot/          # Intake, structured plan and approvals
│   │       │   ├── experiments/      # Experiment setup and lifecycle views
│   │       │   ├── playground/       # Flag-controlled CTA and completion flow
│   │       │   └── results/          # Flagsmith-sourced results
│   │       ├── lib/
│   │       │   ├── flagsmith/        # SDK init, identity and event helpers
│   │       │   └── api/              # Typed API client
│   │       ├── hooks/                # Reusable React hooks
│   │       ├── types/                # Shared frontend types
│   │       └── styles/               # Global styles and design tokens
│   └── api/                          # Optional Express backend, only if needed
│       └── src/
│           ├── routes/                # HTTP routes
│           ├── services/              # LLM and server-side Flagsmith services
│           ├── schemas/               # Request/response validation
│           └── middleware/            # Rate limits and error handling
├── docs/                             # Product, architecture and runbooks
├── prompts/                          # Claude Code task prompts
├── scripts/                           # Windows setup and validation scripts
└── tests/
    ├── e2e/                           # Playwright browser journeys
    └── fixtures/                      # Non-production test data
```

## Keep the repo lean

Do not create a backend just because it appears in the diagram. Start with `apps/web`. Add `apps/api` only when the LLM provider key or privileged Flagsmith API operation needs server-side handling.

Do not commit `.env.local`, API keys, Flagsmith admin credentials, test user data or build output.
