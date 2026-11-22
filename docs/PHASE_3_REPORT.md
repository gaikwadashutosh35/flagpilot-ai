# Phase 3 Report — FlagPilot AI (interim, 2026-11-22)

**Status: interim.** Results page, snapshot pipeline, tests, public repo, Netlify deploy, security review and fixes are done. Experiment create/start, live verification and the real results view (plan Tasks 6–7) are **blocked on the Flagsmith warehouse**, still `pending_connection`.

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
| Warehouse (Flagsmith managed) | **`pending_connection`**. It has received 1 event (the owner-approved CTA click on 2026-11-21 17:28 UTC) and has stayed pending for over 12 hours. |
| Experiment | Not created. Approvals #3 (create) and #4 (start) wait on the warehouse. |

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

1. **Flagsmith:** ask in the Flagsmith Discord why the Development warehouse is stuck in Pending Connection after receiving an event.
2. **Netlify:** scope `VITE_FLAGSMITH_ENVIRONMENT_KEY` to the Production context and keep fork deploy previews on "require approval". Otherwise preview builds of this public repo could send traffic into the experiment (security L8).
3. **`apps/web/vercel.json`:** this file is unused since the move to Netlify. Delete it with your OK.

## Blockers and risks

1. **Warehouse:** until it connects, there is no experiment, no exposures and no real results. `/results` honestly shows "No experiment running yet."
2. **Before the first real snapshot (Task 6),** harden selection so that an item matching the flag with an unknown status or `feature` shape throws instead of reading as "no experiment" (parked finding).
3. **Results shape:** it is still unconfirmed. Task 7 will replace the raw bundled bodies with an allowlisted projection (security M3) and add the missing final-text test.

## Next

When the warehouse is Connected, Task 6 runs: approval #3, approval #4, a live check in a fresh browser profile, then the first real snapshot plus a spec amendment for the results shape. Task 7 follows: the results table and verdict. Then a final report update.
