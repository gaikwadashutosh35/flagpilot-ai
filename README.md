# FlagPilot

**Hackathon:** WeMakeDevs × Flagsmith Toggle Wars 2026  
**Track:** Track 01 — Test Something Real  
**Team:** Solo  
**Development:** Claude Code + Everything Claude Code (ECC)

FlagPilot is an experimentation copilot. It turns a product question into a reviewed experiment plan, helps configure a real Flagsmith experiment, instruments a genuine user journey, and shows the results Flagsmith returns.

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

### Amendment (2026-11-28, after the first results: a bug in our script, and more traffic)

Written after we had seen the first results (09:36 UTC: Inconclusive).

- **What went wrong.** Flagsmith counted 142 of the 204 visitors (203 simulated plus our live check) and 38 of 88 conversions. The cause was our script, not Flagsmith. It closed each headless browser as soon as an event request was *sent*, aborting requests still in flight. Visitors who left right after seeing the button lost their exposure (35 control, 27 `benefit_copy`, exactly the missing counts), and about half the conversions were cut off.
- **Fix.** The script now waits for Flagsmith to accept each event (HTTP 202, nothing rejected) and for in-flight requests to finish before closing ([`4cf6063`](https://github.com/gaikwadashutosh35/flagpilot-ai/commit/4cf6063)).
- **Check.** A 10-visitor probe (12:23–12:25 UTC) moved Flagsmith's counts by exactly what was sent: control +3 visitors / +2 conversions, `benefit_copy` +7 / +2.
- **More traffic.** We then sent 300 more simulated visitors with the fixed script (12:32–12:52 UTC), same behaviour rates. In total that is 513 simulated visitors (3 + 200 + 10 + 300), more than the "about 200" planned above. We decided on the extra run after seeing the first results; the reason was the counting bug, and the decision rule is unchanged.
- **What stays.** The events lost in the first run never reached Flagsmith and can't be recovered. Results are cumulative, so the final numbers still carry part of that bias, diluted by the correctly counted traffic.
- **Final results** (Flagsmith, computed 2026-11-28 12:58 UTC, not final): control 202 identities / 50 conversions (24.8%), `benefit_copy` 250 / 97 (38.8%). Lift +56.8%, 95% interval [+11.7%, +101.8%], chance to win 99.3%. **Verdict: Leading: benefit_copy.** Flagsmith counted every visitor and conversion from the 300-visitor run (+143 / +37 control, +157 / +68 `benefit_copy`). The planted relative lift (30% → 45%, +50%) is inside Flagsmith's interval. This shows the pipeline detects a planted effect; it says nothing about real users.

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

**Results page.** [`/results`](https://flagpilot-ai.netlify.app/results) shows Flagsmith's own numbers from the latest snapshot, with the time it was captured, the time Flagsmith computed them, and whether Flagsmith marks them final.
- The table has identities, conversions, conversion rate, lift vs control, 95% interval and chance to win.
- The verdict follows Flagsmith's documented thresholds: "Collecting data" until each version has at least 50 identities and 5 conversions; "Leading: …" only above a 95% chance to win; otherwise "Inconclusive". The verdict is labelled with its source.
- Flagsmith reports no sample-ratio check for this setup, so the page says "SRM check not available from Flagsmith".

**Live verification (2026-11-27).** A fresh browser on the deployed site checked the whole path:
- Flagsmith's response marked the visitor as in experiment 394 with variant `benefit_copy`, and the button showed "Launch an experiment in minutes".
- Three event POSTs were accepted (HTTP 202), all with the same visitor ID: `$flag_exposure` on render, the click, and `flagpilot_demo_completed` only after "Approve plan".

**Simulated traffic** (see the 2026-11-28 amendments) goes through this same path on the deployed site: Flagsmith assigns the variant, and the app's own SDK calls send the exposure and events. Since [`4cf6063`](https://github.com/gaikwadashutosh35/flagpilot-ai/commit/4cf6063), the script counts an event only when Flagsmith's events endpoint replies 202 with nothing in its `rejected` list.

## Stack

- **App:** React 19, Vite 8, TypeScript 7, react-router 8. One static single-page app in `apps/web`.
- **UI:** Tailwind CSS 4 and shadcn/ui components (Base UI). The results view is a plain table, with no chart library.
- **Flagsmith:**
  - The `@flagsmith/flagsmith` 12.5.0 JavaScript/React SDK (remote evaluation, `useExperiment`, events).
  - Flagsmith Cloud with the managed warehouse.
  - The Flagsmith CLI v2 for the approved experiment steps and the results snapshot.
- **Plan copilot:** a deterministic template (`apps/web/src/features/copilot/plan.ts`). No LLM is called, so no AI key exists anywhere.
- **Tests and checks:** Vitest, React Testing Library, Playwright and Oxlint.
- **Hosting:** Netlify (static, `netlify.toml`). There is no backend, database or server-side secret.

## Setup

### Try it live

Open https://flagpilot-ai.netlify.app and click the button.
- You're assigned a version by Flagsmith.
- Finish the demo by approving a plan.
- [`/results`](https://flagpilot-ai.netlify.app/results) shows Flagsmith's numbers from the latest snapshot.

### Run it locally (no Flagsmith account needed)

You need Git, npm and Node.js 22.12 or newer (Netlify builds with Node 24).

```bash
git clone https://github.com/gaikwadashutosh35/flagpilot-ai.git
cd flagpilot-ai/apps/web
npm ci
npm run dev
```

Open http://localhost:5173.
- Without a Flagsmith key, the whole demo works.
- It always shows the control copy, and it makes no Flagsmith requests.

### Connect your own Flagsmith project

1. In Flagsmith Cloud, create a project and use its Development environment.
2. Connect the Flagsmith-managed warehouse (Environment Settings → Warehouse). Experiments need it.
   - If it stays "Pending Connection" after events arrive, open the Warehouse tab: that is what runs the connection check. See [`docs/FLAGSMITH_SETUP.md`](docs/FLAGSMITH_SETUP.md).
3. Create a multivariate flag `flagpilot_onboarding_cta`:
   - its value is `control` (the flag's value acts as the control);
   - add one variation with value `benefit_copy` and key `benefit_copy`. A variation without a key isn't counted in experiment exposures.
4. Create a metric on the event `flagpilot_demo_completed`, expected direction "increase".
5. Add your key in `apps/web/.env.local` (git-ignored):

   ```bash
   cp .env.example .env.local
   # then set VITE_FLAGSMITH_ENVIRONMENT_KEY=<your Development client-side environment key>
   ```

   - Use the environment's **client-side** key only, never a server-side key.
   - As a safety net, the build fails on a `ser.…` key or a malformed value (stray spaces, quotes, wrong characters).
6. Run `npm run dev` and open `/experiment`. It should show "Client key present: yes" and "Flagsmith: loaded".
7. Create the experiment on that flag and metric with Flagsmith's experiment wizard ([docs](https://docs.flagsmith.com/experimentation/run-an-experiment)), and launch it.
   - For our own run we used the API in stages instead: create with the rollout off, then start, then go live at 100%.
   - That way no visitor saw the split before exposures were recorded. Why and how is in the "Experiment flow" section of [`docs/FLAGSMITH_SETUP.md`](docs/FLAGSMITH_SETUP.md).

### Run the tests

From `apps/web`:

```bash
npx vitest run          # unit and component tests
npm run lint            # exit 0; 5 "only-export-components" warnings are expected
npm run build           # type-check and production build
npx playwright install chromium   # first time only
npm run test:e2e        # browser tests; Flagsmith is forced off
```

**Windows:** if every Vitest file fails with "failed to find the current suite", your shell's working directory has a lowercase drive letter (`c:\…`). `cd` into the same folder as `C:\…` and run it again.

### Refresh the results snapshot (project owner)

`/results` reads `apps/web/src/features/results/snapshot.json`. To update it:

1. Install the Flagsmith CLI v2 ([setup guide](https://docs.flagsmith.com/experimentation/set-up-with-a-coding-agent)) and run `flagsmith login`.
   - The script looks for it in `~/.local/bin`, then on `PATH`, or at an absolute path in `FLAGSMITH_BIN`.
2. The script reads the `environment` field of the repo-root `flagsmith.json`.
   - Ours is committed and holds only the public client key.
   - For your own project run `flagsmith init --project <PROJECT> --environment <ENVIRONMENT_KEY>`.
3. From the repo root, run:

   ```bash
   node apps/web/scripts/snapshot-results.mjs --refresh
   ```

4. Commit the changed file to update the live page.

The script stores only the fields the page shows, and refuses to write if anything unexpected comes back.

### Simulated traffic (project owner)

[`apps/web/scripts/simulate-traffic.mjs`](apps/web/scripts/simulate-traffic.mjs) is how the disclosed simulation (see the 2026-11-28 amendment above) was generated.

To try it without sending anything, run these from `apps/web` (run `npx playwright install chromium` once first).

Terminal 1, the dev server:

```bash
VITE_FLAGSMITH_ENVIRONMENT_KEY= npm run dev -- --port 5180 --strictPort
```

Terminal 2:

```bash
node scripts/simulate-traffic.mjs --dry-run --url http://localhost:5180 --count 6
```

- It prints one JSON line. A good dry run shows `"error":0` and `"blockedFlagsmithRequests":0`.
- **Dry runs block every Flagsmith request** in the browser, so nothing is sent even if your dev server has a key.
  - That matters on PowerShell, which can't set an empty variable: assigning `''` removes it, so Vite falls back to your `.env.local`. Just run `npm run dev -- --port 5180 --strictPort`.
- Stop this dev server before `npm run test:e2e`, which needs port 5180 for itself.

Please don't run it live against our site: it would add visitors to our experiment.

### Contributor workflow

This repo was built with Claude Code. Agent rules are in `CLAUDE.md`, and the original scaffold steps are in `docs/PHASE_1_SETUP.md`.

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
- `docs/PHASE_1_REPORT.md` — Phase 1 report
- `docs/PHASE_2_REPORT.md` — Phase 2 report
- `docs/PHASE_3_REPORT.md` — Phase 3 report
- `docs/SUBMISSION.md` — draft answers for the hackathon submission form
- `apps/web/README.md` — web app routes, scripts and code layout

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
