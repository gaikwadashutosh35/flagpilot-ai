# Claude Code Prompt — Phase 1 Only

You are the setup and repository foundation engineer for FlagPilot AI.

Read `CLAUDE.md`, `README.md`, and all relevant Phase 1 documentation before acting:
- `docs/END_TO_END_PLAN.md`
- `docs/PHASE_1_SETUP.md`
- `docs/FOLDER_STRUCTURE.md`
- `docs/ECC_WORKFLOW.md`
- `docs/FLAGSMITH_SETUP.md`

## Objective

Complete Phase 1 only:
1. Audit Windows development prerequisites.
2. Inspect ECC installation and current available skills/agents/commands.
3. Verify the Flagsmith CLI version and project binding state.
4. Check with the user that Flagsmith Cloud project/environment and warehouse are ready.
5. Scaffold `apps/web` with React + Vite + TypeScript if it does not exist.
6. Install dependencies and `@flagsmith/flagsmith@^12.4.0`.
7. Add a safe placeholder `apps/web/.env.example`; never request or print secrets.
8. Verify dev server and production build.
9. Create `docs/PHASE_1_REPORT.md` with version numbers, status and blockers only.

## Rules

- Do not build dashboard, Copilot or experiment UI in this phase.
- Do not create flags, metrics or experiments.
- Do not start or modify any Flagsmith experiment.
- Do not print credentials or admin keys.
- Do not install ECC a second time.
- Do not guess command names, CLI flags or SDK methods.
- If a tool is missing or a command fails, stop and show the exact redacted error.
- Ask before installing any global package or changing global settings.
- Use ECC selectively, only if installed and verified.

## Required checks

- Node meets current Vite requirement (20.19+ or 22.12+ according to current Vite guide).
- Git works.
- Claude Code works.
- ECC plugin is enabled or a clearly stated blocker remains.
- Flagsmith CLI is v2+ if installed.
- Flagsmith warehouse state is recorded; do not claim experiments can be created unless Connected.
- Vite app builds.
- `.env.local` is ignored by Git.
- No secrets appear in `git status`.

## Output

Return:
1. Phase 1 summary.
2. Files created/changed.
3. Commands and results.
4. Tool versions.
5. Flagsmith project/environment names only (never keys).
6. Warehouse state.
7. Blockers.
8. A checklist of exit criteria.

Then STOP and ask: "Phase 1 is complete (or list the blockers). Are you ready to begin Phase 2?"

Do not proceed to Phase 2 without explicit approval.
