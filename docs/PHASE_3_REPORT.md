# Phase 3 Report — FlagPilot AI (interim, updated 2026-11-23)

**Status: interim.** Results page, snapshot pipeline, tests, public repo, Netlify deploy, security review and fixes are done. The Flagsmith warehouse is resolved (connected 2026-11-23) and experiment 394 is created. Start, go-live, live verification, the first real snapshot and the real results view (plan Tasks 6–7) are still to do.

Spec: `docs/superpowers/specs/2026-11-22-phase3-results-deploy-design.md` (amended: Netlify; `feature` is an object in list responses). Plan: `docs/superpowers/plans/2026-11-22-phase3-results-deploy.md`.

## Live

- **App:** https://flagpilot-ai.netlify.app. Netlify builds `master` via the repo-root `netlify.toml`: base `apps/web`, build `npm run build`, publish `dist`, `NODE_VERSION = "24"`, an SPA rewrite, and security headers.
- **Repo (public):** https://github.com/gaikwadashutosh35/flagpilot-ai

**Smoke test (owner's Chrome):**
- `/`, `/copilot`, `/experiment` and `/results` all hard-load.
- The Flagsmith flags request to `edge.api.flagsmith.com` returns 200, and the CTA renders.
- `/experiment` shows "Client key present: yes" and "Flagsmith: loaded".
- No console errors.
- The deployed bundle (379 KB) has 0 server-key matches and 0 `VITE_` names.

## What now works

- **`/results` page:**
  - It renders Flagsmith's own results from the committed `apps/web/src/features/results/snapshot.json`, always labelled "From Flagsmith", with provenance and a Flagsmith link.
  - States: no experiment, created, running (with "Status: …"), paused, ended, results captured (fixed text until the real format is confirmed), and "Snapshot unreadable".
  - It never shows a number that didn't come from the snapshot.
- **Snapshot script:** `node apps/web/scripts/snapshot-results.mjs [--refresh]`, run by the coordinator with the owner's Flagsmith CLI login. It finds the experiment for `flagpilot_onboarding_cta` (nested or integer `feature`).
- **Script failure behaviour:** it fails loudly, rather than writing "no experiment", on:
  - an unexpected or paginated list;
  - an invalid experiment detail or results body;
  - an invalid `flagsmith.json`.
- **Script safety:**
  - It rejects server keys, emails and JWTs in decoded values, and redacts the client key to `[ENV_KEY]`.
  - It re-checks the final file text.
  - It uses absolute CLI paths only, with `cwd` set to the repo root and a 60 s timeout.
  - Writes go through a temp file and rename, and the temp file is cleaned up on failure.
  - A refused or failed refresh continues with the last results and says `refresh failed`.
- **Build guard:** `vite.config.ts` fails the build if `VITE_FLAGSMITH_ENVIRONMENT_KEY` is a server (`ser.`) key.
- **Dry run against live Flagsmith:** it printed `no experiment`, exit 0, and the snapshot was unchanged.

## Test evidence (head of `phase-3`, controller-run)

- `npx vitest run`: 15 files, **146 tests** passed. This includes 50 script tests and a test that the committed snapshot passes the loader and has no key.
- `npm run lint`: exit 0. The 5 accepted warnings are `only-export-components`: shadcn's generated button and badge, plus the context and hook exports in FlagsmithRoot and approvedPlan.
- `npm run build`: passes.
- `npm run test:e2e` (Playwright, Flagsmith key forced empty): **3 passed**. They cover the demo journey, keyboard-only at 375 px, and `/results`, which loads directly and through the TopBar by keyboard, with no horizontal scroll, valid for any snapshot state.

## Reviews

- **Per task** (Sonnet task reviewers; Opus for Task 2 because it handles keys):
  - Task 1 needed 1 fix round: the header copy, and the server-key regex.
  - Task 2 needed 1 fix round: a refused refresh aborted the run, and `flagsmith.json` could be echoed.
  - Task 4 was clean.
- **Security review (Opus):** 0 critical/high, 3 medium and 8 low findings. All mediums and L1–L7 were fixed in the fix wave. L8 is an owner setting (below).
- **Whole-branch review (Opus):** found 1 critical issue: the script couldn't find an experiment in Flagsmith's documented list shape. It also found 4 important issues. All were fixed in the fix wave.
- **Fix wave re-review (Opus):** clean except one missing test for the final-text check (the code was verified correct; parked to Task 7). A stray byte in the spec heading was also fixed.

## Flagsmith state (FlagPilot / Development)

| Resource | State |
|---|---|
| Flag `flagpilot_onboarding_cta` (id 299210), variant `benefit_copy` (id 36243) | Live, served to the deployed app |
| Metric "Demo completed" (id 319) | Created |
| Warehouse 10645 (Flagsmith managed, Development) | **`connected`** on 2026-11-23 05:16 UTC. It was `pending_connection` from 2026-11-21 14:59 UTC; the first event arrived 2026-11-21 17:28 UTC. One owner-approved `POST …/warehouse-connections/10645/test-warehouse-connection/` switched it. |
| Experiment 394 "Onboarding CTA copy" | **`created`** on 2026-11-23 06:24 UTC (approval #3). Feature 299210, metric 319 (`expected_direction: "increase"`), `experiment_rollout` enabled false at 0%, value `control`, option 36243 (`benefit_copy`) at 50. Read-back checks passed; a throwaway test visitor got `control` with no experiment marker. |

## Agents and models (from agent transcripts)

| Role | Agent | Model actually used |
|---|---|---|
| Implementers (Tasks 1, 2, Netlify config, fix wave) | `feature-implementer` | claude-sonnet-5-5 |
| E2E (Task 4) | `test-engineer` | claude-sonnet-5-5 |
| Task reviews and re-reviews (Tasks 1, 4, Task 2 fix), design builder check, Phase 3 prep research (4 agents) | `general-purpose` | claude-sonnet-5-5 |
| Task 2 review, whole-branch review, fix-wave re-review | `general-purpose` | claude-opus-5-5 |
| Security review | `security-reviewer` | claude-opus-5-5 |
| Coordination, Flagsmith CLI calls, the dry run, Chrome steps (GitHub app grant, Netlify import), smoke tests, reports | main session | claude-opus-5-5 |

## Owner actions open

1. ~~**Flagsmith:** ask in the Flagsmith Discord why the Development warehouse is stuck in Pending Connection after receiving an event.~~ **Not needed (2026-11-23).**
   - In Flagsmith's public source (main at be2bd72; `api/experimentation/views.py:186-205`, `services.py:1245-1262`), a managed connection only moves from Pending Connection to Connected when the test-connection call runs and finds at least 1 event.
   - The dashboard's Warehouse tab runs it when opened and every 60 s while open. Nothing runs it automatically.
   - Flagsmith's docs say it switches "as soon as the first event arrives". That is a docs/code conflict.
2. ~~**Netlify:** scope `VITE_FLAGSMITH_ENVIRONMENT_KEY` to the Production context and keep fork deploy previews on "require approval".~~ **Done 2026-11-22.**
   - `netlify.toml` sets the key to an empty string for `deploy-preview` and `branch-deploy`. Netlify documents that `netlify.toml` values override UI values, so only Production builds with the key.
   - The "Untrusted deploys policy" was already "Require approval".
   - Production re-verified after the redeploy: "Client key present: yes", "Flagsmith: loaded", flags request 200.
3. ~~**`apps/web/vercel.json`:** this file is unused since the move to Netlify. Delete it with your OK.~~ **Done 2026-11-24.** Removed in commit `13d0127`; `netlify.toml` has the SPA redirect.

## Blockers and risks

1. ~~**Before the first real snapshot (Task 6),** harden selection so that an item matching the flag with an unknown status or `feature` shape throws instead of reading as "no experiment" (parked finding).~~ **Done 2026-11-24.**
   - Unknown status: **done 2026-11-24** (commit `30cde3d`). The snapshot now fails with "unexpected experiment status" and writes nothing.
   - Unknown `feature` shape: **done 2026-11-24** (commit `998c0df`). If any list item's `feature` is neither an integer nor an object with an integer `id`, the snapshot fails with "unexpected experiment feature" and writes nothing. This applies to items for any flag, since such an item can't be attributed.
2. **Results shape:** it is still unconfirmed. Task 7 will replace the raw bundled bodies with an allowlisted projection (security M3) and add the missing final-text test.
3. **No sample-ratio check:** Flagsmith will not report a sample-ratio-mismatch (SRM) check for this experiment, because it computes the expected shares from the flag's default split, which is 0% for `benefit_copy`. `/results` must say "not available" rather than imply the split is fine (Task 7).
4. **Timing:** approvals #4 (start) and #5 (go live) run on or after 2026-11-26 08:00 IST (hacking start). The committed snapshot predates experiment 394, so `/results` shows "No experiment running yet." until the snapshot is refreshed.

## Next

Approval #4 (start), then approval #5 (go live), asked separately and run back-to-back on or after 2026-11-26 08:00 IST. Then a live check in a fresh browser profile, then the first real snapshot plus a spec amendment for the results shape. Task 7 follows: the results table and verdict, including the SRM "not available" note. Then a final report update.

## Since the interim report

- The `/experiment` preview was fixed to the staged order (create at 0%, start, go live): commit `3da6b37`, live on Netlify 2026-11-23 06:39 UTC.
- Why staged: per Flagsmith's public source, Flagsmith applies `experiment_rollout` at create and only marks enrollment while the experiment is running, so the documented create body (enabled, 100%, 50%) would show the split to visitors before start with no exposures recorded. Start is expected to switch the override on, still at 0%. Go live is a separate `PATCH …/experiments/<id>/rollout/` (enabled true, 100%, value `control`, option 36243 at 50), and the docs allow changing the rollout percentage while running.
- Gate for that commit: vitest 149/149, lint exit 0 (5 accepted warnings), typecheck 0, build ok, E2E 3/3. Opus security review approved.
