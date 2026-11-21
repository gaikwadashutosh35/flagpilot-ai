# Master Prompt — FlagPilot AI End-to-End Build

Act as the principal engineer and technical lead for FlagPilot AI, a solo WeMakeDevs × Flagsmith Toggle Wars submission targeting Track 01 — Test Something Real.

Follow `CLAUDE.md` as the source of project rules. Read `docs/END_TO_END_PLAN.md`, `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/FLAGSMITH_SETUP.md`, `docs/ECC_WORKFLOW.md`, `docs/SECURITY_AND_APPROVALS.md`, and `docs/TESTING_DEMO_SUBMISSION.md`.

## Product outcome

Build an AI-assisted experimentation copilot that translates a product question into an approved experiment plan, configures a real Flagsmith experiment, renders real Flagsmith variants, records exposure and genuine conversion events, and explains results fetched from Flagsmith.

The real experiment is the Track 01 proof. The AI interface is the differentiator.

## Engineering choices

- React + Vite + TypeScript.
- Tailwind + shadcn/ui after scaffold.
- `@flagsmith/flagsmith` 12.4.0+ for React experimentation.
- Express only if backend-only LLM/privileged integration is actually required.
- Recharts for Flagsmith results.
- Vitest and Playwright.
- No database until a concrete persistence requirement exists.
- ECC selectively for plan, TDD, frontend, review and security.

## Experiment

Flag: `flagpilot_onboarding_cta`
Control key `control`: `Create your first experiment`
Treatment key `benefit_copy`: `Launch an experiment in minutes`
Hypothesis: Benefit-oriented CTA increases genuine demo completion.
Primary event: `flagpilot_demo_completed`.
Diagnostic event: `flagpilot_primary_cta_clicked`.

Conversion must happen only after real completion. Use stable anonymous identity, remote evaluation and same identity for exposure/conversion.

## Work in gated phases

### Phase 1 — Foundation
Use `prompts/PHASE_1_CLAUDE_PROMPT.md`. Complete only setup/scaffold and report. Stop for approval.

### Phase 2 — Core product
After explicit approval:
- App shell and dashboard.
- Experiment intake and deterministic typed plan.
- Plan editor and approval.
- Experiment Playground with real completion step.
- Flagsmith SDK integration and stable identity.
- Use official docs for every API/method.
- Obtain separate user approval before any Flagsmith create/start action.

### Phase 3 — Test and refine
- Verify exposure and conversion.
- Read actual Flagsmith results.
- Add honest collecting/inconclusive states.
- Unit, integration, E2E, accessibility and security tests.
- Deploy candidate.

### Phase 4 — Launch and submission
- Deploy.
- Final README and architecture.
- Record demo video.
- Confirm public repository and submission.
- Submit before deadline.

## Mandatory rules

- No invented Flagsmith API/method/CLI details.
- Stop on exact integration errors; do not guess.
- No admin or LLM secret in client bundle.
- No fake data in real results screens.
- No automated privileged operation without approval.
- No overengineering or extra features before real experiment.
- Use current official docs, not memory.
- Report changed files and test evidence after every milestone.

Begin with Phase 1 only. Inspect the repository and report the setup plan before making changes. Stop at Phase 1 exit gate.
