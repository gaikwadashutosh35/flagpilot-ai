# FlagPilot AI — End-to-End Hackathon Project

**Hackathon:** WeMakeDevs × Flagsmith Toggle Wars 2026  
**Track:** Track 01 — Test Something Real  
**Team:** Solo  
**Development:** Claude Code + Everything Claude Code (ECC)

FlagPilot AI is an AI-assisted experimentation copilot. It converts a product question into a structured experiment plan, helps configure a real Flagsmith experiment, instruments a genuine user journey, and explains results returned by Flagsmith.

## Pitch

**From product question to a measurable Flagsmith experiment—with a human in control.**

## The one experiment that matters

Test FlagPilot's own onboarding CTA:

- Flag: `flagpilot_onboarding_cta`
- Control: `Create your first experiment`
- Treatment: `Launch an experiment in minutes`
- Hypothesis: Benefit-oriented CTA copy increases demo completion.
- Primary event: `flagpilot_demo_completed` (a genuine completion event)
- Diagnostic event: `flagpilot_primary_cta_clicked`

Do not call a CTA click a signup or completion. Do not fabricate exposures, conversions, statistical significance or a winning variant. Clearly label synthetic traffic used for pipeline verification.

## Pre-registered decision rule

Written on 2026-11-22, before the experiment was started and before any results existed. It does not change after data arrives.

- **Experiment:** flag `flagpilot_onboarding_cta`. Control is `control`, "Create your first experiment". The treatment is `benefit_copy`, "Launch an experiment in minutes". Traffic is split 50/50.
- **Hypothesis:** benefit-oriented CTA copy increases genuine demo completion.
- **Primary metric:** "Demo completed" (`flagpilot_demo_completed`, occurrence, higher is better). It fires only when a visitor approves an experiment plan, after they have seen the CTA.
- **Measurement window:** from the experiment's start until judging (submissions close Nov 29, 2026, 8:00 PM IST).
- **Minimum sample:** at least 50 identities and at least 5 conversions in each version. This is Flagsmith's own "Collecting data" threshold.
- **Calling a winner:** a version is called the winner only if, once the minimum sample is reached, Flagsmith reports above a 95% chance that it beats the other version.
- **Otherwise:** the result is reported as **inconclusive**, meaning there is no evidence that either copy is better. In that case the current control copy stays the default.
- **Source of numbers:** every number comes from Flagsmith's results, shown on `/results` with the time it was captured. We never compute our own winner, and we never round a number into a claim.
- **Our own traffic:** the team's own test sessions use fresh browser profiles and are disclosed. No synthetic traffic is sent.

### Amendment (2026-11-23, before any data)

- Experiment 394 was created on 2026-11-23, before hacking starts, with the rollout off at 0%, so no visitor has been enrolled or seen the treatment copy (everyone is served control), and no experiment data exists. Start and go-live happen on or after Nov 26, 08:00 IST.
- "Start" in the measurement window means Flagsmith's `started_at` for experiment 394 (approval #4). Visitors only start seeing the split at go-live (approval #5), run minutes later. Both times will be added here when they happen.
- Flagsmith does not report a sample-ratio check for this setup, because it computes the expected shares from the flag's default split, which is 0% for `benefit_copy`. `/results` will say so instead of implying the split is fine.

### Amendment (2026-11-28, before any simulated traffic)

- **Times.** Experiment 394 started at 2026-11-27 12:29:50 UTC (Flagsmith's `started_at`, approval #4). It went live, meaning a 100% rollout split 50/50, at about 12:42 UTC the same day (approval #5).
- **Real traffic so far.** By 2026-11-27 16:52 UTC Flagsmith had recorded **1 visitor**: the team's own live check in a fresh browser profile (`benefit_copy`, converted). That is far below the 50-per-version minimum.
- **Change: simulated traffic.** The hackathon's Track 01 rules allow simulated traffic. We replace "No synthetic traffic is sent" with a disclosed simulation:
  - About 200 simulated visitors, each in a fresh headless browser, go through the **deployed app**. Flagsmith assigns each one a variant and records the exposure. The click and conversion events are the same ones a real visitor sends.
  - The script chooses only what a visitor does after seeing the button: **control converts 30% of the time and `benefit_copy` 45%**. Half of the visitors who don't convert click the button and then leave.
  - Simulated visitor IDs start with `fp_5eed5eed-`. The script is [`apps/web/scripts/simulate-traffic.mjs`](apps/web/scripts/simulate-traffic.mjs).
- **What the result means.** Flagsmith can't separate simulated visitors from real ones, so the result is dominated by the simulation. It shows whether Flagsmith detects a **planted** 15-point lift through our real pipeline. **It is not evidence about which copy real users prefer.** The decision rule above (minimum sample, above 95% to call a leader, otherwise inconclusive) is unchanged and is applied to Flagsmith's numbers as they come back.

## How FlagPilot uses Flagsmith

Flagsmith decides which copy each visitor sees, records who saw it and who converted, and computes the result. FlagPilot never assigns variants itself and never computes its own winner.

| Part of Flagsmith | How FlagPilot uses it |
|---|---|
| **Feature flag** (multivariate) | `flagpilot_onboarding_cta` holds both CTA versions as keyed variations: `control` and `benefit_copy`. |
| **JavaScript/React SDK** `@flagsmith/flagsmith` 12.5.0 | Remote evaluation for an identified visitor ([`FlagsmithRoot.tsx`](apps/web/src/lib/flagsmith/FlagsmithRoot.tsx)). The identity is a random anonymous ID (`fp_<uuid>`) stored in the browser. It contains no personal data, and the same ID is used for evaluation, exposure and conversion ([`identity.ts`](apps/web/src/lib/identity.ts)). |
| **Exposure** | Recorded by the SDK's `useExperiment` hook, and only where the button is actually rendered ([`CtaExposure.tsx`](apps/web/src/features/playground/CtaExposure.tsx)). The SDK sends a `$flag_exposure` event tagged with experiment 394. If Flagsmith hasn't loaded within 3 s, the visitor sees the control copy and **no exposure is recorded**. |
| **Events** | `flagpilot_primary_cta_clicked` (diagnostic) on click. `flagpilot_demo_completed` (the metric) only when the visitor approves a plan at the end of the demo, and only if they were exposed, at most once per visitor. Events are flushed with the SDK's `flushEvents()` ([`events.ts`](apps/web/src/lib/flagsmith/events.ts)). |
| **Experimentation** | Experiment 394, "Onboarding CTA copy": metric 319 "Demo completed" (`expected_direction: increase`), a 50/50 split, and Flagsmith's managed warehouse. |
| **Flagsmith CLI and API** | Every privileged step ran from the CLI (`flagsmith api …`), each after its own human approval, in stages: create with the rollout off at 0%, then start, then go live at 100%. A snapshot script ([`snapshot-results.mjs`](apps/web/scripts/snapshot-results.mjs)) fetches Flagsmith's results and stores only an allowlist of fields in a committed file. It rejects server keys and redacts the client key. |
| **Flagsmith Cloud** | Hosted Flagsmith, with the Development environment's client key as the only key in the browser bundle. |

**Results page.** [`/results`](https://flagpilot-ai.netlify.app/results) shows Flagsmith's own numbers from the latest snapshot, with the time it was captured.
- The table has identities, conversions, conversion rate, lift vs control, 95% interval and chance to win.
- The verdict follows Flagsmith's documented thresholds: "Collecting data" until each version has at least 50 identities and 5 conversions; "Leading: …" only above a 95% chance to win; otherwise "Inconclusive". The verdict is labelled with its source.
- Flagsmith reports no sample-ratio check for this setup, so the page says "SRM check not available from Flagsmith".

**Live verification (2026-11-27).** A fresh browser on the deployed site checked the whole path:
- Flagsmith's response marked the visitor as in experiment 394 with variant `benefit_copy`, and the button showed "Launch an experiment in minutes".
- Three event POSTs were accepted (HTTP 202), all with the same visitor ID: `$flag_exposure` on render, the click, and `flagpilot_demo_completed` only after "Approve plan".

## Stack

- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui (add after the initial scaffold)
- `@flagsmith/flagsmith` React/JavaScript SDK with experimentation support
- Node.js + Express only for server-side LLM calls and/or privileged Flagsmith operations when needed
- Recharts for displaying Flagsmith-sourced results
- Vitest + React Testing Library + Playwright
- Vercel for web; Render/Railway for API only if an API is actually needed
- PostgreSQL is deferred unless a real product requirement needs persistence

## Quick start

1. Read `CLAUDE.md`.
2. Follow `docs/PHASE_1_SETUP.md`.
3. Run `scripts/verify-environment.ps1`.
4. Install ECC using the current official ECC instructions in `docs/ECC_WORKFLOW.md`.
5. Run `scripts/phase1-scaffold.ps1`.
6. Follow `prompts/PHASE_1_CLAUDE_PROMPT.md`.
7. Do not begin Phase 2 until Phase 1 gates pass and the user approves.

## Documentation

- `docs/END_TO_END_PLAN.md` — phases, owners, dates and milestones
- `docs/PROJECT_SPEC.md` — product and acceptance criteria
- `docs/ARCHITECTURE.md` — architecture and data flows
- `docs/FOLDER_STRUCTURE.md` — directory tree
- `docs/PHASE_1_SETUP.md` — exact first-phase actions
- `docs/FLAGSMITH_SETUP.md` — Flagsmith prerequisites/runbook
- `docs/ECC_WORKFLOW.md` — ECC usage
- `docs/SECURITY_AND_APPROVALS.md` — secrets, AI and human approvals
- `docs/TESTING_DEMO_SUBMISSION.md` — validation and submission

## Official links

- Hackathon: https://www.wemakedevs.org/hackathons/flagsmith
- Schedule: https://www.wemakedevs.org/hackathons/flagsmith/schedule
- Resources: https://www.wemakedevs.org/hackathons/flagsmith/resources
- Flagsmith experiment setup with coding agent: https://docs.flagsmith.com/experimentation/set-up-with-a-coding-agent
- Flagsmith run experiment: https://docs.flagsmith.com/experimentation/run-an-experiment
- Flagsmith warehouse: https://docs.flagsmith.com/experimentation/connect-a-warehouse
- ECC: https://github.com/affaan-m/ECC

## Non-negotiables

- Flagsmith must control the actual rendered experiment variant.
- Use remote evaluation and stable identified users.
- Exposure and conversion events must use the supported SDK flow and same identity.
- The conversion event must occur at a genuine success action.
- No server/admin key or LLM secret in browser code.
- Human approval before create, start, stop, modify or rollout.
- Official Flagsmith documentation takes precedence over guessed methods/endpoints.
