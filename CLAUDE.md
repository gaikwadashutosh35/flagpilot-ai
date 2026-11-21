# FlagPilot AI — Project Instructions for Claude Code

## Mission

Build FlagPilot AI for Flagsmith Toggle Wars 2026, targeting Track 01 — Test Something Real.

FlagPilot is an AI-assisted experimentation copilot. It turns product questions into reviewed experiment plans, helps configure real Flagsmith experiments, instruments a real user journey, and explains results from Flagsmith.

## Read before coding

Read:
- `README.md`
- `docs/END_TO_END_PLAN.md`
- `docs/PROJECT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/FOLDER_STRUCTURE.md`
- `docs/PHASE_1_SETUP.md`
- `docs/FLAGSMITH_SETUP.md`
- `docs/ECC_WORKFLOW.md`
- `docs/SECURITY_AND_APPROVALS.md`
- `docs/TESTING_DEMO_SUBMISSION.md`

## Authority order

1. User's explicit current-session instructions.
2. This file and the project specification.
3. Current official Flagsmith docs for SDK, CLI, API, experiment and warehouse behaviour.
4. Current ECC documentation and actually installed ECC skills/agents.
5. General engineering practices.

If sources conflict, stop and report the conflict. Do not guess.

## Development rules

- TypeScript-first.
- Prefer the smallest working vertical slice.
- Avoid unnecessary packages, backend services and database setup.
- A deterministic experiment-plan template must work without an LLM key.
- Add an LLM provider only after the real Flagsmith experiment works.
- Use ECC selectively; inspect installed version and actual commands/skills first.
- Do not assume slash-command names from old tutorials.
- ECC is a developer workflow, not a production runtime dependency.
- Never install ECC twice or copy its entire repository into this project.

## Model routing

Use the `model-task-router` skill and `docs/MODEL_ROUTING.md` for delegation.

- Haiku: `repo-scout` (read-only scouting).
- Sonnet: `feature-implementer`, `test-engineer`.
- Opus: `security-reviewer` (read-only).
- Fable: `architecture-advisor` (read-only).

Escalate only when justified; never use Opus/Fable for every task. The main session coordinates, reviews diffs and verifies tests. Do not pass a model override to project agents. In Workflow scripts, set the model per the routing table.

After every delegated task report: Task assigned, Agent selected, Model actually used, Files changed, Tests executed, Remaining issues.

## Track 01 proof experiment

Flag: `flagpilot_onboarding_cta`

Control key: `control`
Control text: `Create your first experiment`

Treatment key: `benefit_copy`
Treatment text: `Launch an experiment in minutes`

Hypothesis: Benefit-oriented CTA copy increases genuine demo completion.

Primary metric: `flagpilot_demo_completed`. This must be emitted only after the user completes the actual demo/onboarding flow.

Diagnostic event: `flagpilot_primary_cta_clicked`.

Use a stable random anonymous visitor ID or authenticated internal ID. Do not use personal data as experiment identity. The same identity must be used for evaluation/exposure and conversion.

## Flagsmith rules

- Experimentation currently requires a connected warehouse.
- Use remote evaluation; do not design around local evaluation.
- Use a supported SDK version and current documented APIs.
- React/JavaScript experimentation requires `@flagsmith/flagsmith` 12.4.0+ per current docs.
- Use keyed flag variations.
- Exposure must be recorded where the user actually experiences the variation.
- Conversion must be sent at the genuine completion action.
- Flush buffered events using the SDK-supported method.
- Never use local random assignment as a substitute for Flagsmith.
- Never invent SDK methods, CLI arguments, API endpoints, plan features or results.

## Human approval

Require separate explicit user approval before:
- creating/modifying the flag, metric or experiment;
- starting/stopping an experiment;
- changing rollout allocation;
- rolling out a winner;
- sending synthetic traffic to shared environments.

Do not bundle create + start + rollout into one approval.

## Security

- Browser may receive only the Flagsmith client environment key as documented.
- Server/admin key, CLI credentials, database service-role key and LLM key stay server-side.
- Never expose secrets in `VITE_*` variables.
- Validate API inputs and LLM output.
- Treat model output as untrusted.
- Never run arbitrary model-generated shell commands.
- Redact credentials and personal data from logs.
- Keep `.env` files out of Git.

## Testing

Add tests for:
- stable identity;
- experiment variant rendering;
- exposure conditions;
- exact event name;
- conversion completion condition;
- approval gates;
- loading/error/inconclusive results states.

Run lint, typecheck, unit tests, relevant E2E tests and production build before claiming completion.

## Milestone reporting

After each milestone report:
1. Changes made.
2. Files created/modified.
3. Commands executed.
4. Verification evidence and failures.
5. Manual setup still required.
6. Risks/blockers.
7. Next milestone.

Stop after Phase 1 and ask the user whether to begin Phase 2. Do not start Phase 2 automatically.
