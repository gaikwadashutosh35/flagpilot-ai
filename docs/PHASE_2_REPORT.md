# Phase 2 Report — FlagPilot AI (2026-11-21)

Branch: `phase-2-core` (from `master` 538701b). Spec: `docs/superpowers/specs/2026-11-21-phase2-core-design.md`. Plan: `docs/superpowers/plans/2026-11-21-phase2-core.md`.

## What now works

- **Landing (`/`):** the CTA copy comes from the real Flagsmith flag `flagpilot_onboarding_cta`.
  - The CTA has a loading gate. Exposure (`useExperiment`) is mounted only if flags load before the timeout, so an exposure is never recorded for copy the visitor didn't see.
  - Without a key, or on an SDK error or timeout, the CTA shows control copy and sends no events.
  - "CTA seen" is recorded only when Flagsmith reports the visitor enrolled in a running experiment.
- **Copilot (`/copilot`):** question → deterministic plan → editable plan with inline validation → review and approve → Done.
  - Approving sends `flagpilot_demo_completed` once per visitor, only after a real exposure, and only while Flagsmith is loaded.
  - Done says truthfully whether the event was sent or skipped, and why.
- **Experiment status (`/experiment`):** shows the Flagsmith state, a shortened visitor ID with whether it persists, and the assigned variant (read without recording an exposure).
  - It also shows a read-only config preview: one block per owner approval, with the target project and environment shown.
- **Identity:** a stable anonymous `fp_<uuid>` ID, the same for exposure and conversion. It falls back to memory when storage is blocked.

## Flagsmith resources (FlagPilot / Development)

| Resource | ID | Created by | Approval |
|---|---|---|---|
| Flag `flagpilot_onboarding_cta` (multivariate, default `control`, enabled) | 299210 | CLI, main session | #1 (owner, in chat) |
| Variant `benefit_copy` (weight 0) | 36243 | CLI, main session | #1 |
| Metric "Demo completed" (`flagpilot_demo_completed`, occurrence, up) | 319 | CLI, main session | #2 (owner, in chat) |
| Experiment create | — | **pending** | #3, waits for the warehouse |
| Experiment start | — | **pending** | #4, separate approval |

- **Warehouse (Development):** `pending_connection`, 0 events received at the last check. Experiment create and start (#3 and #4) run once it shows Connected, per the spec's definition of done.
- **Live check after approval #1:** in the browser, the SDK called `edge.api.flagsmith.com/api/v1/identities/` and the CTA showed control copy with no console errors. The CLI's SDK mode returned `variant: control, experiment: null` for the same visitor.

## Test evidence (head of `phase-2-core`, run by the main session)

- `npx vitest run`: 11 files, 76 tests passed.
- `npm run lint` (Oxlint): exit 0. There are 5 warnings, all `only-export-components` (shadcn's generated button and badge, plus the context and hook exports in FlagsmithRoot and approvedPlan). They only affect Fast Refresh and were accepted.
- `npm run build` (`tsc -b && vite build`): passes.
- `npm run test:e2e` (Playwright, Chromium, port 5180, Flagsmith key forced empty): 2 passed.
  - "Visitor completes the demo without Flagsmith" also asserts zero requests to `*.flagsmith.com`.
  - "Keyboard-only at phone width" runs at 375×812, Tab/Enter/Space only, checking visible focus and no horizontal scroll.

## Reviews

- **Per task:** a task reviewer on every task. 4 tasks needed one fix round:
  - Task 2: the storage guard keys didn't match the spec;
  - Task 3: the landing page made a false claim;
  - Task 7: the metric name and the shell quoting in the preview;
  - Task 9: the copilot overflowed at 375 px, found by the new E2E test.
- **Security review (Opus):** 0 critical or high. The built bundle contains only the browser-safe client key. 1 medium (the preview bundled every approval into one block) and 7 lows, all fixed in the final fix wave.
- **Whole-branch review (Opus):** "ready with fixes". 5 important findings, fixed in the final fix wave:
  - "available" ignored SDK errors and timeouts;
  - "CTA seen" was recorded without a real exposure;
  - Approve could hang on the event flush;
  - the "AI copilot" claim;
  - no test for the provider wiring.
- **Spec amendments:** the spec was amended for the four plan defects the review found.

## Agents and models (from agent transcripts)

| Role | Agent | Model actually used |
|---|---|---|
| Implementers (Tasks 1, 2, 3, 5, 6, 7, the 375 px fix, the final fix wave) | `feature-implementer` | claude-sonnet-5-5 |
| E2E tests (Task 9) | `test-engineer` | claude-sonnet-5-5 |
| Task reviews and re-reviews (Tasks 1, 2, 5, 6, 7, 9) and the design builder check | `general-purpose` | claude-sonnet-5-5 |
| Task 3 review (exposure gate) and the final whole-branch review | `general-purpose` | claude-opus-5-5 |
| Security review | `security-reviewer` | claude-opus-5-5 |
| Coordination, Flagsmith CLI steps (approvals #1 and #2), browser checks, reports | main session | claude-opus-5-5 |

Fable (`architecture-advisor`) was not used; nothing called for that level of escalation.

## Blockers and risks

1. **Warehouse still `pending_connection`:** experiment create and start (#3 and #4) are blocked until it connects. Speed-up: run the dev app and click the CTA once. That sends a real `flagpilot_primary_cta_clicked` event, but it needs owner OK since it sends traffic to Flagsmith.
2. **Code written before the hackathon start:** there is still no official rule on code written before Nov 26, 08:00 IST. Confirm with the organisers and disclose in the README.
3. **Client-side event gates can be bypassed from devtools:** result integrity relies on Flagsmith counting per identity. This is accepted for a no-backend MVP.
4. **Deferred polish (not blocking):**
   - Back from the plan step clears the question;
   - focus management on step changes;
   - per-field ARIA error links;
   - `crypto.randomUUID` needs HTTPS or localhost (the deploy will be HTTPS);
   - E2E focus and scroll checks could be stricter.
5. **Manual Phase 3 check:** use a fresh browser profile, so the owner's existing visitor ID doesn't carry state from Phase 2 testing.

## Next (Phase 3)

When the warehouse is Connected: approval #3 (create the experiment, 50/50), then approval #4 (start it). Then check that real exposures and conversions arrive, build the results view from Flagsmith data with honest collecting and inconclusive states, and deploy.
