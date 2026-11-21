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
5. Create experiment with hypothesis, metric and allocation.
6. Review dry-run config.
7. Obtain explicit approval before start.
8. Start and verify status is running.
9. Integrate the React SDK using current official docs.
10. Identify visitor with stable non-PII ID.
11. Use `useExperiment` where the variant is rendered, or use documented manual exposure flow if evaluation and display occur separately.
12. Track conversion only after genuine demo completion.
13. Flush buffered events with documented SDK method.
14. Verify event arrival and fetch results from Flagsmith.

The official React docs show `useExperiment` records exposure when the component renders. The JavaScript client uses `getExperimentFlag` at the point of exposure; `flushEvents()` is documented for flushing buffered events.

## Result policy

- Results come from Flagsmith.
- Never fabricate a winner, probability, lift or significance.
- Clearly show sample sizes and uncertainty only when returned.
- Show Collecting data / Inconclusive if insufficient.
- Synthetic traffic may validate the pipeline if allowed, but it is not real customer impact and must be labelled.
