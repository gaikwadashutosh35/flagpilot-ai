# Toggle Wars submission — draft answers

Form: https://www.wemakedevs.org/hackathons/flagsmith/submit. **[FILL]** marks something only the owner can supply.

---

## Part 1 — Project details

**Project title**

FlagPilot

**Which tracks are you entering?**

[Track 1] Test Something Real

**Demo video**

[FILL: YouTube or Loom URL, under 3 minutes, public or unlisted]

**GitHub repository**

https://github.com/gaikwadashutosh35/flagpilot-ai

**Live demo or deployment**

https://flagpilot-ai.netlify.app

**What did you build, and what problem does it solve?**

Teams want to run A/B tests, but the hard part isn't the toggle. It's agreeing on a hypothesis, picking a metric that means something, and not fooling yourself when the numbers come back.

FlagPilot is a small copilot for that:
- You type a product question.
- It drafts an experiment plan: hypothesis, variants, primary metric, diagnostic event, allocation and risks.
- You review and edit it, then approve it.
- Every number on its results page comes from Flagsmith.

Today the plan comes from a deterministic template. We chose not to add an LLM until the real experiment worked.

To prove the loop end to end, FlagPilot tests itself. Its own onboarding button is a Flagsmith multivariate flag with two copies:
- "Create your first experiment" (control)
- "Launch an experiment in minutes" (benefit copy)

Completing the copilot demo is the conversion.

Everything privileged — creating, starting and launching the experiment — ran through the Flagsmith CLI, and each step needed a separate human approval.

Who would use it: product engineers and PMs who want a guard-railed path from "should we change this?" to a Flagsmith experiment they can explain.

**Which parts of Flagsmith did you use?**

☑ Feature flags · ☑ Experimentation (A/B tests) · ☑ Flagsmith CLI · ☑ Flagsmith API · ☑ Flagsmith Cloud

---

## Part 2 — Track details

**[Track 1] Walk us through your experiment**

**Hypothesis** (pre-registered in the README on 2026-11-22, before any data): benefit-oriented button copy increases genuine demo completion.

**Variants:**
- Flag `flagpilot_onboarding_cta` (multivariate, keyed).
- `control` = "Create your first experiment".
- `benefit_copy` = "Launch an experiment in minutes".
- The React SDK (`@flagsmith/flagsmith` 12.5.0) evaluates the flag remotely for an anonymous random visitor ID, `fp_<uuid>`. It contains no personal data. The same ID is used for evaluation, exposure and conversion.

**Split:**
- Experiment 394, 50/50, 100% of visitors, on Flagsmith's managed warehouse.
- We rolled it out in stages through the CLI, each with its own approval: create with the rollout off, start, then go live.
- Flagsmith applies the rollout at create but only records enrollment while the experiment is running. So creating at 100% would have shown the split to visitors with no exposures recorded.

**Metric and events:**
- **Exposure:** `useExperiment` records a `$flag_exposure` event only where the button actually renders. If Flagsmith doesn't load within 3 s, the visitor sees control and no exposure is recorded.
- **Primary metric (319):** `flagpilot_demo_completed`, sent only when the visitor approves a plan at the end of the demo, after being exposed, at most once per visitor.
- **Diagnostic event:** `flagpilot_primary_cta_clicked`.
- **Live verification:** we checked every event in a fresh browser (HTTP 202, same visitor ID).

**Traffic (disclosed):**
- Real traffic between go-live and the first simulation (about 19 hours) was our own one verification visit.
- So we added simulated traffic, as Track 01 allows. We committed the change to the README *before* sending any of it.
- A script drives the deployed app with headless browsers. Flagsmith assigns each visitor's variant, and the real app sends the events.
- The script only decides what a visitor does: control converts 30% of the time and benefit copy 45%. Simulated IDs start with `fp_5eed5eed-`.
- Runs: 3 visitors (smoke test) and 200 visitors, then, after we fixed a bug in the script (below), a 10-visitor check and 300 visitors. 513 simulated visitors in total.
- So the experiment tests whether Flagsmith detects a planted 15-point lift through a real pipeline. It is **not** a claim about which copy real users prefer.

**Final results (from Flagsmith, computed 2026-11-28 12:58 UTC):**
- control: 202 identities, 50 conversions (24.8%)
- benefit_copy: 250 identities, 97 conversions (38.8%)
- Lift vs control: +56.8%. 95% interval: [+11.7%, +101.8%]. Chance to win: 99.3%.
- Verdict, per our pre-registered rule: **Leading: benefit_copy**. The interval excludes zero and the chance to win is above 95%.
- Flagsmith detected the planted lift: we planted 30% vs 45% (a relative +50%), which is inside its interval. Flagsmith counted every visitor and conversion from the 300-visitor run.
- Flagsmith marks these results not final (the experiment is still running). They also still carry part of the bias from the first run, whose 62 exposures and 50 conversions never reached Flagsmith (see below).
- This shows the pipeline works end to end. It is **not** a finding about real users.

**First results, after the 200-visitor run (from Flagsmith, snapshot 2026-11-28 09:36 UTC):**
- control: 56 identities, 11 conversions (19.6%)
- benefit_copy: 86 identities, 27 conversions (31.4%)
- Lift vs control: +59.8%. 95% interval: [−39.3%, +158.9%]. Chance to win: 88.2%.
- Verdict, per our pre-registered rule (at least 50 identities and 5 conversions per version; "leading" only above 95% chance to win; otherwise inconclusive): **Inconclusive**.
- The point estimate favours the benefit copy, but the interval still crosses zero. So the honest call is inconclusive, even though the simulation planted a lift.
- **Counting gap, and our bug:** Flagsmith counted 142 of 204 visitors (203 simulated plus our own live check) and 38 of 88 conversions.
  - The cause was our simulation script. It waited only until each event request was sent, then closed the headless browser, aborting requests still in flight.
  - Every visitor who left right after seeing the button lost their exposure: 35 control and 27 benefit copy, exactly the missing counts. About half the final conversion requests were cut off too.
  - So this sample is biased, and we report Flagsmith's numbers exactly as computed.
  - **What we did:** we fixed the script. It now waits for Flagsmith to accept each event (HTTP 202, nothing rejected) and for requests in flight to finish before it closes the browser.
  - A 10-visitor check then moved Flagsmith's counts by exactly what we sent: control +3 identities / +2 conversions, benefit copy +7 / +2. That included the visitors who left right away.
  - Then we ran 300 more visitors with the fixed script.
  - The lost events never reached Flagsmith and can't be recovered. So the final results still carry some of that bias, diluted by the correctly counted traffic.
- Flagsmith reports no sample-ratio check for this setup, because it computes expected shares from the flag's default split, which is 0% for benefit_copy. FlagPilot's `/results` page says so rather than implying the split is fine.

**[Track 1] Experiment results (screenshots)**

[FILL: up to 3 screenshots from the Flagsmith dashboard for experiment 394. Suggested: the results scorecard, the exposures chart, and the experiment configuration/rollout.]

---

## Part 3 — Feedback

**What did you like about Flagsmith, and what would you improve?**

**Liked:**
- `useExperiment` records exposure exactly where the variant renders, which makes honest exposure tracking easy.
- The CLI's `flagsmith api` made every privileged step scriptable and easy to gate behind a human approval.
- The managed warehouse needed no infrastructure.
- The results include `chance_to_win` and a credible interval, which made a disciplined verdict possible.

**Would improve:**
1. **Warehouse status.** The docs say a managed warehouse turns Connected "as soon as the first event arrives". In the source, it only flips when the test-connection call runs, which happens while the Warehouse tab is open. Ours sat in Pending Connection for about 38 hours with events already received.
2. **Rollout at create.** The documented create body (enabled, 100%) applies the split immediately, but enrollment is only recorded once the experiment is running. So visitors can see the treatment before start, with no exposures recorded. A warning, or creating with the rollout off by default, would help.
3. **Sample-ratio check.** It's computed against the flag's default split. With a 0% default for the variation (the experiment holds the 50/50), it silently returns null. Using the experiment's own allocation would make it useful.
4. **Results API docs.** The results and exposures response shapes (`n`, `sum`, `inference.lift`, `ci_low`, `ci_high`, `chance_to_win`, `is_final`) aren't documented. We read the dashboard's TypeScript types to get them right.
5. **Small things:** the refresh endpoints' 5-minute limit isn't visible until you hit it, and it would help to know how long processing takes after an event before results include it.
