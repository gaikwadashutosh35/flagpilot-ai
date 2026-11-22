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
