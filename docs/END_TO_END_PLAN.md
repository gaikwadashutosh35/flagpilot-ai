# End-to-End Plan

## Project goal

Build FlagPilot AI, an AI-assisted experimentation copilot, and prove its value with one real Flagsmith A/B experiment. The hackathon is Track 01 — Test Something Real.

## Owners and roles

This is a solo project. The human remains the product owner and approval authority.

| Role | Owner | Responsibilities |
|---|---|---|
| Product owner / final decision maker | Ashutosh | Scope, hypothesis, UX decisions, account setup, approvals, submission |
| Lead developer | Ashutosh + Claude Code | Implement, integrate, debug and deploy |
| Planning / architecture reviewer | ECC planning/architecture agents when available | Plan and review boundaries |
| Frontend engineer | Claude Code, ECC frontend skills when available | React UI, accessibility, responsive behaviour |
| Experimentation engineer | Ashutosh + Claude Code | Flagsmith setup, SDK, identity, event instrumentation |
| QA / security reviewer | Claude Code + relevant ECC skills | Tests, secret checks, review, evidence |
| External service owner | Flagsmith Cloud | Feature flags, warehouse, experiment analysis |

Claude/ECC agents are assistants, not independent accountable owners. Ashutosh approves all external service changes and final submission.

## Timeline

The official event page currently lists:
- Hackathon: November 26–29, 2026
- Hacking begins: November 26 at 8:00 AM IST
- Submission closes: November 29 at 8:00 PM IST
- Pre-hackathon webinar: November 23 at 9:30 PM IST (converted from 4:00 PM UTC)

Today is November 21, 2026. Use the following compressed schedule:

| Date | Phase | Outcome |
|---|---|---|
| Nov 21–22 | Phase 1: Setup | Tools, repository, ECC, Flagsmith project and warehouse gate |
| Nov 23–24 | Phase 2: Core build | React app, playground, experiment plan UI, first Flagsmith SDK integration |
| Nov 25–26 | Phase 2 completion | Configure real experiment, verify flag/metric/identity/events; be demo-ready |
| Nov 26–27 | Phase 3: Test and refine | Run test flow, confirm events, results and error states |
| Nov 28 | Phase 3/4: Launch readiness | Deploy, QA, README, screenshots, demo recording |
| Nov 29 | Phase 4: Submission | Final repository and video; submit well before 8 PM IST |

Attend the November 23 webinar and check the official schedule for any updates.

## Phase 1 — Setup and foundation (Nov 21–22)

### Work
- Verify Windows development environment.
- Install/verify Node.js, npm, Git and Claude Code.
- Install ECC using exactly one official installation route.
- Create the repository and project documentation.
- Scaffold React + Vite + TypeScript.
- Install supported Flagsmith SDK.
- Create Flagsmith Cloud project and Development environment.
- Enable managed warehouse and verify status.
- Install/verify Flagsmith CLI v2+ and authenticate.
- Bind the local project to the correct Flagsmith project/environment.
- Run clean local build and dev server.

### Deliverables
- Clean Git repository.
- `CLAUDE.md` and docs committed.
- React app starts locally.
- Flagsmith Cloud project/environment exists.
- Warehouse enabled and connection status recorded.
- ECC plugin enabled.
- SDK dependency installed.
- No secrets committed.

### Exit gate
Do not begin Phase 2 until the app starts, dependencies are valid, ECC is verified, and Flagsmith warehouse/access prerequisites are understood. If warehouse is Pending Connection, initiate its first event early and track the status.

## Phase 2 — Core build and live experiment (Nov 23–26)

### Work
- Build premium app shell and dashboard.
- Build Experiment Playground.
- Build deterministic Copilot Plan flow before LLM.
- Define structured ExperimentPlan schema.
- Implement genuine demo-completion flow.
- Integrate Flagsmith React SDK with events enabled.
- Implement stable anonymous visitor identity.
- Create keyed multivariate flag, metric and experiment using the current official coding-agent workflow.
- Review the proposed configuration.
- Obtain human approval before creation/start.
- Render actual Flagsmith-assigned CTA.
- Record exposure at the point of actual display.
- Record `flagpilot_demo_completed` only after real completion.
- Flush buffered events using documented SDK method.

### Deliverables
- Working UI.
- Live Flagsmith flag and experiment.
- Genuine exposure and conversion path.
- Verified experiment status.
- First events visible in Flagsmith.

### Exit gate
A user can use the deployed or local application, be assigned a Flagsmith variant, complete the real demo journey, and produce the conversion event for the same identity.

## Phase 3 — Testing, analytics and hardening (Nov 26–28)

### Work
- Verify exposure and conversion in Flagsmith.
- Run clearly labelled synthetic traffic only for pipeline verification if needed and permitted.
- Fetch experiment results from Flagsmith.
- Build results view with loading/empty/collecting/inconclusive states.
- Test stable identity and event naming.
- Test error and warehouse-not-ready states.
- Review accessibility and responsive design.
- Run unit, integration and E2E tests.
- Run security review and confirm no secrets in browser bundle.
- Fix production build and deployment issues.

### Deliverables
- Results screen backed by Flagsmith.
- Test report.
- Security check.
- Responsive production build.
- Deployment candidate.

### Exit gate
The judge can reproduce the experiment and understand the result. If sample size is insufficient, the product clearly says collecting/inconclusive rather than inventing a winner.

## Phase 4 — Launch, handoff and submission (Nov 28–29)

### Work
- Deploy frontend and optional API.
- Test on a clean browser/profile.
- Finalize README and architecture description.
- Capture genuine screenshots.
- Record a 2–3 minute demo.
- Check public GitHub repo and deployment.
- Remove secrets and development-only data.
- Verify submission requirements and submit early.

### Deliverables
- Public GitHub repository.
- Working deployment/demo.
- README and setup instructions.
- Demo video.
- Submission form completed.

## Scope and constraints

- Solo developer; no parallel human team.
- Use Claude Code and ECC to accelerate development.
- One well-designed experiment outranks a large feature list.
- Flagsmith Experimentation is currently documented as Beta.
- Warehouse must be connected before experiment creation.
- React/JavaScript SDK experimentation support requires `@flagsmith/flagsmith` 12.4.0+.
- Experiments require remote evaluation and identified users.
- Event identity must remain consistent across exposure and conversion.
- Avoid a database unless there is a real need.
- AI must be optional; deterministic planning must work without a model API key.
- No fake results or claims of statistical significance.
- Protect all admin and LLM credentials.
- Maintain buffer before the submission deadline.

## Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Warehouse not connected in time | Cannot create experiments | Enable/check in Phase 1; send first event early |
| Flagsmith SDK/API mismatch | Integration delay | Follow current official docs and stop on mismatch |
| No genuine completion event | Invalid metric | Implement a real demo-completion action |
| Too little traffic | Inconclusive result | Be transparent; prioritise event pipeline and explain result limits |
| LLM integration consumes time | Core experiment delayed | Deterministic plan first; LLM stretch |
| Overengineering | Missed deadline | One flag, two variants, one primary metric |
| Secret leakage | Security risk | Server-only secrets, .gitignore, bundle scan |
