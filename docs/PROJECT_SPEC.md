# Product Specification

## Product

FlagPilot AI — an AI-assisted experimentation copilot for developers and small product teams.

## Problem

Developers have ideas to improve onboarding or conversion but struggle to translate them into a well-instrumented A/B test.

## Solution

FlagPilot helps create a structured hypothesis, define variants and metrics, review the proposed configuration, run the experiment through Flagsmith, and interpret Flagsmith-sourced results.

## Primary journey

1. Enter a product question.
2. Complete missing experiment details.
3. Review generated hypothesis, variants and metric.
4. Approve the plan.
5. Review Flagsmith dry-run configuration.
6. Approve resource creation.
7. Approve experiment start separately.
8. View the actual Flagsmith-controlled variant.
9. Complete a real demo activation step.
10. Send conversion event.
11. Read results from Flagsmith.
12. Consider a separate human-approved rollout.

## Flagship experiment

| Field | Definition |
|---|---|
| Flag | `flagpilot_onboarding_cta` |
| Control key | `control` |
| Control copy | Create your first experiment |
| Treatment key | `benefit_copy` |
| Treatment copy | Launch an experiment in minutes |
| Hypothesis | Benefit-oriented CTA copy increases demo completion |
| Primary metric | `flagpilot_demo_completed` |
| Diagnostic event | `flagpilot_primary_cta_clicked` |
| Allocation | 50/50 if supported by experiment configuration |

`flagpilot_demo_completed` must occur only after an actual completion action. Do not record conversion on a CTA click.

## MVP

- Dashboard and navigation
- Experiment Playground
- Deterministic copilot plan generator
- Plan editor and approval
- Flagsmith integration status
- Real flag and experiment
- Stable identity
- Exposure and conversion instrumentation
- Results from Flagsmith
- Error, empty and inconclusive states
- README, deployment and demo

## Later/stretch

- LLM-based proposal generation
- Privileged configuration automation
- Experiment history
- Downloadable summary
- Human-approved rollout

## Acceptance criteria

- Flagsmith assigns the actual variant.
- Remote evaluation is used.
- Same stable identity is used for exposure and conversion.
- Event names match exactly.
- Exposure is recorded only when the variation is experienced.
- Conversion is recorded only after genuine completion.
- Results come from Flagsmith.
- Empty/inconclusive states are honest.
- Privileged actions require separate confirmation.
- Secrets never appear in client bundle or Git.
