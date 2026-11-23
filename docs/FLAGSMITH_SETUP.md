# Flagsmith Setup and Experiment Runbook

Official docs:
- Agent setup: https://docs.flagsmith.com/experimentation/set-up-with-a-coding-agent
- Run experiment: https://docs.flagsmith.com/experimentation/run-an-experiment
- Warehouse: https://docs.flagsmith.com/experimentation/connect-a-warehouse

## Prerequisites

- Flagsmith Cloud or supported local instance.
- A connected warehouse for the target environment.
- Flagsmith CLI v2+ for the coding-agent workflow.
- React/JavaScript SDK `@flagsmith/flagsmith` 12.4.0+ for experimentation.
- Identified users.
- Remote evaluation.

## Cloud warehouse

In the Development environment:
1. Environment Settings → Warehouse.
2. Select Flagsmith managed warehouse.
3. Enable and confirm.
4. Send the first event if prompted.
5. Wait until status is Connected.

A new connection may stay Pending Connection while waiting for the first event; the first event can take a few hours to process. Each environment has one warehouse connection. Experiments cannot be created until a warehouse is in place.

Tip: a Flagsmith-managed connection only moves from Pending Connection to Connected when its test-connection call runs and finds at least 1 event. Nothing runs it automatically. The dashboard's Warehouse tab runs it when opened and every 60 s while open. If events have arrived but the status is still pending, open the Warehouse tab, or, with owner approval, run `POST …/warehouse-connections/<id>/test-warehouse-connection/` once. Flagsmith's docs say it switches "as soon as the first event arrives"; the public source behaves as above.

## CLI

```powershell
flagsmith --version
flagsmith login
flagsmith project list
flagsmith environment list --project <PROJECT>
flagsmith init --project <PROJECT> --environment <ENVIRONMENT_KEY>
```

Use placeholders locally. Never print or commit credentials. Follow current CLI docs for Windows installation and any version changes.

## Flag and metric

Proposed flag: `flagpilot_onboarding_cta`

Keyed values:
- control
- benefit_copy

Control text: `Create your first experiment`
Treatment text: `Launch an experiment in minutes`

Primary metric: `flagpilot_demo_completed`
Aggregation: occurrence
Direction: up
Definition event name must exactly match code.

Diagnostic event: `flagpilot_primary_cta_clicked`.

## Experiment flow

1. Verify warehouse Connected.
2. Create the multivariate flag with keyed variants using documented CLI/API workflow.
3. Verify variants and keys.
4. Create metric with exact conversion event.
5. Create the experiment (approval #3) with hypothesis, metric and the rollout off: `enabled: false`, `rollout_percentage: 0`, value `control`, `benefit_copy` at 50. Verify status `created`.
6. Review dry-run config.
7. Start (approval #4): `POST …/experiments/<id>/start/` with no body (do not use `--input -`). Verify status is running.
8. Go live (approval #5): `PATCH …/experiments/<id>/rollout/` with `enabled: true`, `rollout_percentage: 100`, value `control`, `benefit_copy` at 50. Verify with a GET.
   Run the live verification after go-live (#5), not after start.
9. Integrate the React SDK using current official docs.
10. Identify visitor with stable non-PII ID.
11. Use `useExperiment` where the variant is rendered, or use documented manual exposure flow if evaluation and display occur separately.
12. Track conversion only after genuine demo completion.
13. Flush buffered events with documented SDK method.
14. Verify event arrival and fetch results from Flagsmith.

Why staged: per Flagsmith's public source, Flagsmith applies `experiment_rollout` at create, and only marks enrollment (`experiment.inExperiment`) while the experiment is running. The documented create body (enabled, 100%, 50%) would show the 50/50 split to visitors before start with no exposures recorded. Flagsmith docs differ here: they show that body at create. Start is expected to switch the override on, still at 0%. Go live is a separate rollout change; the docs allow changing the rollout percentage while running. Approvals #4 and #5 are asked separately.

The official React docs show `useExperiment` records exposure when the component renders. The JavaScript client uses `getExperimentFlag` at the point of exposure; `flushEvents()` is documented for flushing buffered events.

## Result policy

- Results come from Flagsmith.
- Never fabricate a winner, probability, lift or significance.
- Clearly show sample sizes and uncertainty only when returned.
- Show Collecting data / Inconclusive if insufficient.
- Synthetic traffic may validate the pipeline if allowed, but it is not real customer impact and must be labelled.
