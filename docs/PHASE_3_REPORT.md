# Phase 3 Report — FlagPilot (updated 2026-11-28)

**Status: complete.** Code, docs and the final snapshot are committed and pushed. Done: the results page, the snapshot pipeline, the deploy, the live experiment, live verification, the results table and verdict (Task 7), and the security review with fixes (Task 8).

The simulated-traffic run (approval #6b) and the snapshot after it are recorded below. Flagsmith counted fewer visitors than were sent. The cause was a bug in our simulation script. It is fixed (`4cf6063`), and a 10-visitor probe (#7a) was counted exactly. A 300-visitor run (#7b) was then counted exactly too. Final verdict: **Leading: benefit_copy** (chance to win 99.3%), on mostly simulated traffic. Flagsmith marks the results not final, and they still carry part of the #6b counting bias (see "Counting gap").

Spec: `docs/superpowers/specs/2026-11-22-phase3-results-deploy-design.md` (amendments through 2026-11-28). Plan: `docs/superpowers/plans/2026-11-22-phase3-results-deploy.md`.

## Live

- **App:** https://flagpilot-ai.netlify.app, with routes `/`, `/copilot`, `/experiment` and `/results`.
  - Netlify builds `master` from the repo-root `netlify.toml`: base `apps/web`, build `npm run build`, publish `dist`, `NODE_VERSION = "24"`, an SPA rewrite and security headers.
  - Deploy previews and branch deploys build with an empty Flagsmith key, because `netlify.toml` overrides UI values. So only Production talks to Flagsmith.
- **Repo (public):** https://github.com/gaikwadashutosh35/flagpilot-ai. `phase-3` and `master` point to the same commit (`phase-3` was also pushed to GitHub on 2026-11-28).
- **Deploy smoke test, 2026-11-22, in the owner's Chrome:**
  - All four routes hard-load.
  - The flags request to `edge.api.flagsmith.com` returns 200, and the CTA renders.
  - `/experiment` shows "Client key present: yes" and "Flagsmith: loaded".
  - No console errors.
  - The bundle (379 KB then) had 0 server-key matches and 0 `VITE_` names.
  - Production was re-verified after the key-scoping redeploy.
- **Later live checks** (2026-11-27 and 2026-11-28): `/results` showed each new snapshot with 0 console errors. At 375 px the page doesn't scroll horizontally; the table (679 px) scrolls inside its own region.

## Experiment 394 timeline (FlagPilot / Development)

| When (UTC) | Event | Evidence |
|---|---|---|
| 2026-11-21 14:59 | Warehouse 10645 (Flagsmith managed) created, `pending_connection`. The first event arrived at 17:28. | API read-back |
| 2026-11-23 05:16 | Warehouse `connected` after one owner-approved `POST …/warehouse-connections/10645/test-warehouse-connection/` | API read-back |
| 2026-11-23 06:24 | **Approval #3:** experiment 394 created, with the rollout off at 0%: feature 299210, metric 319 (`expected_direction: increase`), value `control`, option 36243 (`benefit_copy`) at 50. A throwaway visitor then got `control` with no experiment marker. | API read-back |
| 2026-11-27 12:29:50 | **Approval #4:** started (Flagsmith's `started_at`) | API read-back |
| 2026-11-27 ~12:42 | **Approval #5:** went live: rollout 100%, value `control`, option 36243 at 50% | API read-back at 12:42:46 |
| 2026-11-27 ~15:37 | Live verification, one genuine session (below) | Browser network log |
| 2026-11-27 16:52:18 | First real snapshot: 1 identity (`benefit_copy`, converted), no inference, SRM null, not final | `504491b` |
| 2026-11-28 07:39:54 | README amendment disclosing simulated traffic, committed before any was sent | `673aeb3` |
| 2026-11-28 07:46:34–07:47:45 | **Approval #6a:** smoke run, 3 simulated visitors (1 `control`, 2 `benefit_copy`, all clicked), 0 errors | Script summary |
| 2026-11-28 08:18:00–08:30:13 | **Approval #6b:** 200 simulated visitors, 4 at a time. `control` 90 (32 converted), `benefit_copy` 110 (55 converted). 0 script errors. The script checked only that each event request was *sent*, not Flagsmith's reply (see "Counting gap"). | Script summary |
| 2026-11-28 09:36:36 | Snapshot after #6b (Flagsmith `as_of` 09:35:32): `control` 56 identities / 11 conversions, `benefit_copy` 86 / 27. Lift +59.8%, interval [−39.3%, +158.9%], chance to win 88.2%. **Verdict: Inconclusive.** Flagsmith has counted 142 of 204 visitors (203 simulated plus our live check) and 38 of 88 conversions. The numbers were unchanged at 08:31, 08:55 and 09:35 (see "Counting gap"). | `c22a12d` |
| 2026-11-28 12:22:15 | Simulation script fix committed and pushed: each event now waits for Flagsmith's reply, and in-flight requests finish before the browser closes | `4cf6063` |
| 2026-11-28 12:23:41 | Baseline snapshot before the probe (`as_of` 12:22:39): unchanged, `control` 56 / 11, `benefit_copy` 86 / 27 | Script output (not committed) |
| 2026-11-28 12:23:47–12:25:12 | **Approval #7a:** probe, 10 simulated visitors, 2 at a time. `control` 3 (2 converted, 0 clicked, 1 left), `benefit_copy` 7 (2, 3, 2). 0 failures; Flagsmith accepted 17 event requests. | Script summary |
| 2026-11-28 12:32:30 | Snapshot after the probe (`as_of` 12:31:23): `control` 59 / 13, `benefit_copy` 93 / 29. That is exactly +3 / +2 and +7 / +2: every probe visitor and conversion was counted, including the visitors who left. | Script output (not committed) |
| 2026-11-28 12:32:45–12:52:21 | **Approval #7b:** 300 simulated visitors, 4 at a time. `control` 143 (37 converted, 65 clicked, 41 left), `benefit_copy` 157 (68, 41, 48). 0 failures; Flagsmith accepted 511 event requests. | Script summary |
| 2026-11-28 12:59:38 | Final snapshot (`as_of` 12:58:36, not final): `control` 202 / 50 (24.8%), `benefit_copy` 250 / 97 (38.8%). Exactly +143 / +37 and +157 / +68: every #7b visitor and conversion was counted. Lift +56.8%, interval [+11.7%, +101.8%], chance to win 99.3%, SRM null. **Verdict: Leading: benefit_copy.** | `839f661` |
| 2026-11-28 13:37:33 | Exposure-flush fix live: the app sends the exposure and the click right away instead of in the SDK's 10-second batch. A fresh visit (no click) sent `$flag_exposure` (experiment 394, `benefit_copy`) 2.5 s after the page started loading; reply `{"accepted":1,"rejected":[]}`, 0 console errors. That visit adds 1 non-converting `benefit_copy` identity after the final snapshot. | `29dba33`, browser network log |

**Why the rollout was staged** (create at 0%, then start, then go live):
- Per Flagsmith's public source, Flagsmith applies `experiment_rollout` when the experiment is created, but only marks enrollment while it is running.
- So the documented create body (enabled, 100%, 50%) would have shown the split to visitors before start, with no exposures recorded.
- The `/experiment` preview was changed to match the staged order (`3da6b37`).

**Docs/code conflict (warehouse):**
- Flagsmith's docs say a managed warehouse switches to Connected "as soon as the first event arrives".
- Its public source (main at `be2bd72`; `api/experimentation/views.py:186-205`, `services.py:1245-1262`) only switches it when the test-connection call runs and finds at least one event. The dashboard's Warehouse tab runs that call while it is open; nothing runs it automatically.
- That is why ours stayed `pending_connection` for about 38 hours.

## Live verification (spec §5.5)

In a fresh Playwright browser profile against the deployed site (2026-11-27):
- The identity response for the new visitor had `metadata.experiment` `{ id: 394, in_experiment: true }`, variant `benefit_copy` and reason "SPLIT; weight=50.0". The button read "Launch an experiment in minutes".
- `POST events.api.flagsmith.com/v1/events` returned 202 three times, all with the same `fp_…` identifier:
  - `$flag_exposure` (experiment 394, value `benefit_copy`) when the button rendered;
  - `flagpilot_primary_cta_clicked` on click;
  - `flagpilot_demo_completed` only after "Approve plan".
- The Done screen showed "Sent (queued for delivery)". There were 0 console errors.

## Simulated traffic

Track 01 allows simulated traffic. Real traffic had reached 1 visitor (our own live check), so we added a disclosed simulation (README amendment 2026-11-28, committed before the first run).

- **How it works:** `apps/web/scripts/simulate-traffic.mjs` opens the deployed app in a fresh headless browser per visitor. Flagsmith assigns the variant. The script checks `in_experiment` for experiment 394, checks that the button text matches Flagsmith's variant, and waits for Flagsmith's reply to each event (HTTP 202 with nothing rejected). Before closing the browser it waits up to 10 s for any event request still in flight. An event without an accepted reply counts as `event_failed`. (Before `4cf6063` it only waited until each request was sent; see "Counting gap".)
- **Behaviour:** only what a visitor does next is simulated. Control converts 30% of the time and `benefit_copy` 45%. Half of the other visitors click and leave.
- **Identifying it:** simulated IDs start with `fp_5eed5eed-`.
- **What the result means:** it shows whether Flagsmith detects a planted 15-point lift through the real pipeline. It is **not** evidence of what real users prefer.
- **Dry runs:** they block every Flagsmith request. The dry run sent 0.
- **Run log:**
  - #6a: 3 visitors, 0 errors.
  - #6b: 200 visitors, 0 errors.
  - #7a (fixed script): 10 visitors, 0 failures, all counted by Flagsmith.
  - #7b (fixed script): 300 visitors, 0 failures, all counted by Flagsmith.
- **Totals:** 513 simulated visitors were sent (3 + 200 + 10 + 300), plus our 1 live check. Flagsmith counted 452 identities and 147 conversions; the difference is the 62 exposures lost in #6b.
- **Final result:** Flagsmith detected the planted lift. The planted relative lift (30% → 45%, +50%) is inside its interval [+11.7%, +101.8%]. Both counted rates are below the planted rates, partly because #6b lost 50 conversions.
- **Counting gap:** Flagsmith's results count fewer visitors than we sent.

  | | Sent (script, plus our 1 live-check visitor in `benefit_copy`) | Counted (Flagsmith) |
  |---|---|---|
  | `control` | 91 visitors, 32 conversions | 56, 11 |
  | `benefit_copy` | 113 visitors, 56 conversions | 86, 27 |

  - **Cause: a bug in our simulation script, not in Flagsmith.**
    - It waited only until an event request was *sent* (`waitForRequest`), not for Flagsmith's reply, and then closed the browser at once, aborting requests still in flight.
    - Visitors who "left" right after seeing the button lost their exposure: 35 `control` and 27 `benefit_copy`. That exactly equals the missing identities in each version.
    - Converters' final conversion request was cut off in about half the cases.
    - Click and convert visitors all counted, because their exposure had already arrived.
  - Found 2026-11-28 by a read-only investigation (Flagsmith's public source, then our script); the arithmetic above is the confirmation.
  - **Effect:** the counted sample has no "leave" visitors from the simulation and only part of its conversions, so it is biased and not a clean test of the planted lift. Flagsmith's numbers above are reported exactly as computed.
  - **Fix (`4cf6063`):** the script waits for Flagsmith's accepted reply (`waitForResponse`, 202 with an empty `rejected` list) and drains in-flight requests before closing. Written test-first, reviewed twice, with one fix round (details under "Reviews").
  - **Check (#7a):** Flagsmith's counts rose by exactly the probe's visitors and conversions in each version (timeline above).
  - **What stays:** experiment results are cumulative. The 62 exposures and 50 conversions lost in #6b never reached Flagsmith and can't be recovered. #7b adds correctly counted traffic, which dilutes that bias but does not remove it.

## What now works

- **`/results` states:**
  - The states are: no experiment, created, running, paused (badge), ended (badge "Ended"), "Flagsmith hasn't computed results yet", the results table, the placeholder for an unrecognised results shape, and "Snapshot unreadable".
  - It is always labelled "From Flagsmith, as of <capture time>", with "Snapshot updated by the project owner via the Flagsmith CLI" and a link to the Flagsmith dashboard.
- **Results table:**
  - **Columns:** per variant — identities, conversions, conversion rate, lift vs control, 95% interval, chance to win.
  - **Source of numbers:** every value is Flagsmith's number from the snapshot. Conversion rate is `sum/n` of those numbers.
  - **Verdict:** follows Flagsmith's documented thresholds and names its source ("Verdict per Flagsmith's documented thresholds"):
    - "Collecting data" until each version has at least 50 identities and 5 conversions;
    - "Leading: …" only above a 95% chance to win;
    - otherwise "Inconclusive".
  - **Chance to win** is never shown at or below 95.0% next to a "Leading" verdict.
  - **Other lines:**
    - "SRM check not available from Flagsmith" when SRM is null;
    - "Flagsmith computed these results at <as_of>";
    - "Results final" / "Results not final yet", from Flagsmith's `is_final`.
  - **At 375 px:** the table scrolls inside a keyboard-focusable region.
- **Snapshot script** (`node apps/web/scripts/snapshot-results.mjs [--refresh]`, run only by the coordinator with the owner's Flagsmith CLI login):
  - **What it stores:** an allowlisted projection only — metric 319, the `control`/`benefit_copy` keys, non-negative integer counts, `chance_to_win` within 0–1, and strict ISO dates. The raw Flagsmith bodies are never committed.
  - **It fails loudly and leaves the file untouched on:**
    - an unexpected or paginated experiments list;
    - an unknown experiment status (`30cde3d`) or `feature` shape (`998c0df`);
    - any other results shape;
    - empty or `null` CLI output;
    - an invalid `flagsmith.json`;
    - a server key, email or JWT;
    - the client key surviving into the final text.
  - **Safety:**
    - It redacts the client key to `[ENV_KEY]`.
    - It uses absolute CLI paths only, `cwd` set to the repo root, and a 60 s timeout. Errors are generic, because the CLI's error output can contain the key.
    - Writes go through a temp file and rename.
    - A refused refresh continues with the last results and prints `refresh failed`. `/results` then shows Flagsmith's own compute time, so old numbers don't look current.
  - **Dry run against live Flagsmith (2026-11-22):** printed `no experiment`, exit 0, and the snapshot was unchanged.
- **Build guard** (`vite.config.ts`): the build fails unless `VITE_FLAGSMITH_ENVIRONMENT_KEY` is empty or exactly matches the client-key format. That rejects `ser.` server keys and keys pasted with spaces or quotes.

## Test evidence (head `afc1338`, controller-run)

- `npx vitest run`: 18 files, **247 tests** passed (146 at the interim report).
- `npm run lint`: exit 0. The 5 accepted warnings are all `only-export-components`: shadcn's generated button and badge, plus the context and hook exports in FlagsmithRoot and approvedPlan.
- `npm run build`: passes.
- `npm run test:e2e` (Playwright, Flagsmith key forced empty): **3 passed**. They cover:
  - the demo journey, keyboard-only at 375 px;
  - `/results`, loaded directly and through the TopBar;
  - no horizontal scroll at 375 px, and a keyboard-focusable table region.
- **Bundle:** 0 matches for a server key in the built JS.
- **Dependabot alert 1** (minimatch, dev dependency) was fixed by an npm override (`7d0766e`).
- **At `29dba33`** (exposure-flush fix): `npx vitest run` **262 tests** in 20 files, lint exit 0 (same 5 warnings), build passes, `npm run test:e2e` 3 passed.
- **With the final snapshot (12:59:38):** `npx vitest run` 253 tests passed.
- **At `4cf6063`** (simulation fix, a script outside the app bundle): `npx vitest run` **253 tests** passed, lint exit 0 (same 5 warnings), build passes. E2E was not re-run, because no app code changed. Dry run: 6 visitors, 0 errors, 0 Flagsmith requests.

## Reviews

**Before the interim report (2026-11-22/23):**
- **Task 1:** one fix round (header copy, server-key regex).
- **Task 2:** one fix round. A refused refresh aborted the run, and `flagsmith.json` could be echoed.
- **Task 4:** clean.
- **First Opus security review:** 0 critical/high, 3 medium, 8 low.
  - All mediums and L1–L7 were addressed in a fix wave. The allowlist medium (M3) got an interim guard, completed by Task 7's projection.
  - L8 was an owner Netlify setting, since done.
- **Whole-branch Opus review:** 1 **critical** issue: the script couldn't find an experiment in Flagsmith's documented list shape, where `feature` is an object. It also found 4 important issues. All were fixed before the first real run.
- **Fix-wave re-review (Opus):** clean except one missing test, which was added in Task 8.

**Since then:**
- **Selection hardening (`30cde3d`, `998c0df`):** an unknown status or feature shape now fails instead of reading as "no experiment".
- **Task 7 (results table):** one task review (Sonnet). Spec ✅, quality approved, 0 critical/important. 6 minor findings were parked to Task 8, plus 1 from the live check (the table region wasn't keyboard-focusable).
  - **Process deviation:** the implementer wrote code before tests. It proved the tests catch failures afterwards by setting the code aside (20 failures).
- **Simulation script:** the coordinator read all of it before any live run. The dry run sent 0 Flagsmith requests, and the smoke run had 0 errors.
- **Task 8 security review (Opus):** approve with fixes. 0 critical/high.
  - **Medium (M1):** `/results` labelled numbers with the script's run time, not Flagsmith's compute time.
  - **Low:**
    - L1: free-text variant keys or extra metrics could reach the bundle.
    - L2: finality came from the experiment status instead of `is_final`.
    - L3: the source of the "95%" label wasn't cited.
    - L4: a padded server key could pass the build guard.
    - L5: a fresh snapshot would fail the tests.
    - L6: empty CLI output read as "not computed".
    - L7: the chance-to-win rounding could show "95%" next to "Leading".
- **Task 8 fix pass** (workflows):
  - **Round 1** fixed all of the above plus 7 parked minors. The spec review (Sonnet) and the security re-review (Opus) approved.
    - The adversarial test review (Sonnet) found one important gap: no test checked that the build guard is wired into the build.
    - That was fixed with a mutation-checked test, and the re-review (Sonnet) approved it.
  - **Round 2** closed 5 residual gaps, reviewed by Opus (security) and Sonnet (adversarial tests): literal `null` output, script/page parity with no metric 319, rounding near 95% and 100%, strict start/end dates, and escaped-key redaction.
  - **Final fixes:** the coordinator fixed the last two items test-first. The escaped-key test wasn't escaping the key, and `chance_to_win` gained a 0–1 range check.
- **Simulation fix (`4cf6063`):** the implementer wrote the tests first (3 failed before the fix). A semantics review and an adversarial review (both Sonnet) raised 4 findings, all accepted in one fix round, including that the click must be awaited on the convert path. The coordinator read the final diff before the probe.
- **Exposure-flush fix (`29dba33`):** the SDK (12.5.0) buffers events for up to 10 s and has no page-close handling, and the app flushed only the conversion, so a real visitor leaving within ~10 s was not counted. Now `flushEvents()` runs after the exposure and the click. Test-first (3 of 13 new tests failed before the fix). Semantics review (Sonnet) approved; adversarial test review (Sonnet) found 2 important test gaps (late `inExperiment`, order proven only against a mock), fixed with mutation-checked tests, including one using the SDK's real `useExperiment`; re-review approved. Parked minors: no test proves the `.catch`, no component-level click-flush test, a mid-visit variant change would not be re-flushed (cannot happen here: the CTA mounts once after load and flags are not refreshed).
- **Doc fixes (2026-11-28):** `apps/web/README.md` replaced (it was the Vite template), the README Documentation list extended, and "As built" sections added to `ARCHITECTURE.md` and `FOLDER_STRUCTURE.md`. An accuracy check found 1 false claim (no root `.env.example`; one exists), which was fixed.

## Agents and models

| Role | Agent | Model | Source |
|---|---|---|---|
| Implementers: Tasks 1 and 2, Netlify config, interim fix wave, selection hardening | `feature-implementer` | claude-sonnet-5-5 | transcripts |
| E2E (Task 4) | `test-engineer` | claude-sonnet-5-5 | transcripts |
| Task reviews and re-reviews (Tasks 1 and 4, Task 2 fix), design builder check, Phase 3 prep research (4 agents) | `general-purpose` | claude-sonnet-5-5 | transcripts |
| Task 2 review, whole-branch review, fix-wave re-review | `general-purpose` | claude-opus-5-5 | transcripts |
| Interim security review | `security-reviewer` | claude-opus-5-5 | transcripts |
| Implementers: Task 7, simulation script, Task 8 rounds 1 and 2 | `feature-implementer` | claude-sonnet-5-5 | set in dispatch/workflow |
| Task 7 review; Task 8 spec, adversarial and re-reviews | `general-purpose` | claude-sonnet-5-5 | set in dispatch/workflow |
| Task 8 security review and re-reviews | `security-reviewer` | claude-opus-5-5 | set in dispatch/workflow |
| Implementer and fix round: simulation fix; doc fixes; exposure-flush fix | `feature-implementer` | claude-sonnet-5-5 | set in workflow |
| Simulation fix and exposure-flush fix reviews (semantics, adversarial, re-review) | `general-purpose` | claude-sonnet-5-5 | set in workflow |
| Doc-fix checks (accuracy, scope); report checks (accuracy, consistency) | workflow subagent | claude-sonnet-5-5 | set in workflow |
| Coordination, every Flagsmith CLI call and approval, Chrome steps (GitHub app grant, Netlify import), live checks, simulation runs, final fixes, reports | main session | claude-opus-5-5 | session model |

## Flagsmith state

| Resource | State |
|---|---|
| Flag `flagpilot_onboarding_cta` (id 299210), variant `benefit_copy` (option 36243) | Live |
| Metric "Demo completed" (id 319, occurrence, `expected_direction: increase`) | Live |
| Warehouse 10645 (Flagsmith managed, Development) | `connected` since 2026-11-23 05:16 UTC |
| Experiment 394 "Onboarding CTA copy" | **`running`** since 2026-11-27 12:29:50 UTC, rollout 100%, split 50/50 |

## Blockers and risks

1. **The result is dominated by simulated traffic.** It demonstrates the pipeline, not a finding about users. The README, `/results` and the submission must say so.
2. **No sample-ratio check from Flagsmith** for this setup, because it computes the expected shares from the flag's default split (0% for `benefit_copy`). `/results` says "not available".
3. **The client key is public**, as in any client-side experiment, so anyone could send events to the experiment.
4. **The build guard** is tested through the config callback. A real `vite build` with a bad key was not run.
5. **Experiment name** is the one free-text field in the snapshot. It is owner-set, and is scanned for keys, emails and JWTs.
6. **The #6b bias stays in the cumulative results.** The events our old script aborted are gone for good. Later traffic dilutes the bias; the README and submission must still mention it.

## Owner actions

**Closed:**
- The Flagsmith Discord question about the warehouse wasn't needed; the cause is in the docs/code conflict above.
- Netlify key scoped to Production, and the "Untrusted deploys policy" set to "Require approval" (L8).
- `apps/web/vercel.json` removed (`13d0127`).

**Open:**
1. Delete the root `MODEL_ROUTING.md` and `SKILL.md` (untracked). (`.playwright-mcp/` was deleted on 2026-11-28.)
2. Take up to 3 screenshots of experiment 394's results in the Flagsmith dashboard for the submission form (needs your login).
3. Phase 4: demo video (under 3 min) and submission by 2026-11-29 20:00 IST. The README setup steps, Stack list and submission answers are drafted and committed; the video URL and screenshots are still to fill in `docs/SUBMISSION.md`.
4. Optional: delete the `phase-3` branch on GitHub if you only want `master` there.

## Next

Phase 3 is complete. Stop and ask the owner whether to begin Phase 4 (demo video, screenshots, submission).
