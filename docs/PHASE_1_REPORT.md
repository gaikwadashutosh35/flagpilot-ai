# Phase 1 Report — FlagPilot AI (2026-11-21)

## Toolchain
- Node v26.13.0 (satisfies Vite 8 engines ^20.19.0 || >=22.12.0), npm 11.7.0, git 2.55.0.windows.4, Claude Code 2.1.329.

## App scaffold (apps/web)
- Created with `npx --yes create-vite@latest apps/web --template react-ts --no-interactive` (create-vite 9.3.4).
- Versions from package-lock: vite 8.3.8, react 19.3.1, react-dom 19.3.1, typescript 7.0.2, oxlint 1.94.0 (template default linter), @flagsmith/flagsmith 12.5.0 (installed as ^12.4.0; experimentation needs 12.4.0+).
- `npm run lint` exit 0, no warnings. `npm run build` (tsc -b && vite build) exit 0. npm install: 0 vulnerabilities, no engine warnings.
- Dev server: starter page loaded in the browser with 0 console errors. It ran on port 5174 because port 5173 is held by another process on this machine.
- Env: apps/web/.env.example holds the placeholder `VITE_FLAGSMITH_ENVIRONMENT_KEY=` (browser-safe client key only). apps/web/.env.local exists with a blank value and is ignored by Git (apps/web/.gitignore rule `*.local`). dist/ and node_modules/ are ignored.

## Flagsmith
- CLI: v2.0.0, installed with the official PowerShell installer; authenticated via browser login (credentials in the OS keychain, nothing on disk in the repo).
- Organisation: Ashubuilds. Project: FlagPilot. Environments: Development, Production.
- Repo bound to FlagPilot / Development with `flagsmith init --project FlagPilot --environment <client key> --yes`. This wrote flagsmith.json at the repo root containing only the project ID and the client-side environment key (the CLI schema rejects server keys). Committed per the official CLI docs and the owner's decision.
- Warehouse (Development): Flagsmith managed warehouse, status **Pending Connection**. A test event was sent on 2026-11-21; 0 events received so far. Processing the first event can take up to a few hours. Experiments cannot be created until the status is Connected.
- Experiments and Metrics sections are visible in the dashboard for this project.

## ECC
- Not installed — deliberate deviation approved by the project owner. Reasons: its setup adds about 27 global hooks, edits ~/.claude/settings.json (can set includeCoAuthoredBy: false), native Windows is "supported with limitations" with an open hook-timeout issue, and the existing setup already covers planning, TDD, review and verification. Development delegation uses the project's model-routing agents instead (.claude/agents, .claude/skills/model-task-router, docs/MODEL_ROUTING.md).

## Deviations from the starter kit
- Starter kit contents moved from a subfolder to the repository root.
- scripts/phase1-scaffold.ps1 was not used: it runs create-vite without --no-interactive (would stop at prompts) and creates empty apps/api folders the docs say not to create yet. Equivalent commands were run directly.
- ECC skipped (above).

## Security checks
- Pattern scan of all files to be committed found no secrets (only a blank placeholder in scripts/phase1-scaffold.ps1).
- No server/admin key, LLM key or token exists in the repo. .env.local is ignored.

## Blockers and risks
1. Warehouse is Pending Connection — re-check before creating any experiment in Phase 2.
2. Free-plan entitlement for Experimentation is not confirmed by any official source (the dashboard does show Experiments and Metrics).
3. No official rule found on whether code written before hacking starts (Nov 26, 2026, 8:00 AM IST) may be included; to confirm with organisers and disclose in the README.
4. ~~Flagsmith docs say an experiment starts as soon as it is created, so "approve create" and "approve start" cannot be separate steps.~~ **Corrected in Phase 2:** the official coding-agent guide creates an experiment with `POST …/experiments/` and starts it with a separate `POST …/experiments/<id>/start/`, so create and start get separate approvals.
5. Port 5173 is occupied by another local process (Vite falls back to 5174).

## Phase 1 exit checklist
- [x] Windows toolchain passes
- [ ] ECC plugin enabled — skipped by owner decision (see ECC)
- [x] Flagsmith Cloud project and Development environment created
- [x] Warehouse Pending, first (test) event initiated and being tracked
- [x] Flagsmith CLI v2+ works and is authenticated
- [x] Repo bound to FlagPilot / Development
- [x] Vite React TypeScript app created
- [x] Flagsmith SDK dependency installed
- [x] Dev server loads
- [x] Production build passes
- [x] No secrets committed (verified before the initial commit)
- [x] Phase 1 report prepared
