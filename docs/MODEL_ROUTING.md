# Claude Code Model Routing and Subagents

**Applies to:** Claude Code development workflow for FlagPilot AI  
**Last checked:** 2026-11-21  
**Official references:** [Claude Code subagents](https://code.claude.com/docs/en/sub-agents), [Claude model overview](https://platform.claude.com/docs/en/models/overview), [Claude Code customization guidance](https://claude.com/resources/articles/steering-claude-code-skills-hooks-rules-subagents-and-more)

## 1. Can a skill assign a model?

Not directly. A Claude Code skill is reusable task guidance. The model for delegated work is set on a **subagent** with the `model` field in its YAML frontmatter. This project combines the two:

- `.claude/skills/model-task-router/SKILL.md` gives the main session a routing policy.
- `.claude/agents/*.md` define specialist subagents and pin each one to a model alias.
- `CLAUDE.md` tells the main session when to delegate and when to escalate.

The main session does not change model because a skill was invoked. It delegates to a subagent, which runs with its configured model.

## 2. Model roles for this project

The latest model overview currently lists these families and API IDs. Claude Code supports the aliases `haiku`, `sonnet`, `opus`, and `fable` in subagent frontmatter. Aliases can resolve to a newer version over time; use full IDs when reproducibility matters more than following the latest alias.

| Alias | Current model shown in Anthropic overview | Best role in this repository |
|---|---|---|
| `haiku` | Claude Haiku 5.5 (`claude-haiku-5-5`) | Fast repo scouting, bounded extraction, concise summaries, simple checks |
| `sonnet` | Claude Sonnet 5.5 (`claude-sonnet-5-5`) | Default implementation, UI, APIs, debugging, tests and documentation |
| `opus` | Claude Opus 5.5 (`claude-opus-5-5`) | Deep code review, security analysis, complex bugs and consequential technical decisions |
| `fable` | Claude Fable 5.2 (`claude-fable-5-2`) | Hardest reasoning, long-horizon agentic analysis and architecture deadlocks after other approaches |

Model access can vary by Claude Code version, account, plan, organization policy and runtime. Verify availability in the actual environment. If a model is unavailable, do not claim it ran; fall back explicitly.

## 3. Bundled subagents

| Subagent | Model | Use it for | Write access |
|---|---|---|---|
| `repo-scout` | Haiku | Locate relevant files, map existing code, summarize tests and dependencies | Read-only |
| `feature-implementer` | Sonnet | Implement bounded features in `apps/web` (and `apps/api` if it exists) | Yes, within project permissions |
| `test-engineer` | Sonnet | Add tests, reproduce bugs, run unit/E2E checks | Yes, within project permissions |
| `security-reviewer` | Opus | Independent review of env vars, Flagsmith key usage, LLM key handling, approval gates, untrusted model/web content | Read-only; report findings, do not patch |
| `architecture-advisor` | Fable | Resolve hard cross-cutting architecture decisions and trade-offs | Read-only advisory |

Read-only is enforced by the agent's `tools` allowlist (`Read, Grep, Glob`), not by prompt wording.

The main session remains coordinator and final integrator. Delegation is still controlled by Claude Code's orchestration; ask for a named subagent when a specific specialist is required.

Notes:

- Claude Code watches `.claude/agents` and `.claude/skills`, so new files load without a restart. Restart if one is not found.
- A per-invocation `model` parameter overrides the frontmatter model. Do not pass one for project agents.
- Unknown frontmatter fields are silently ignored. Use only `name`, `description`, `tools`, `model`.
- Inside Workflow scripts, set each agent's model per the routing table above.

## 4. When to escalate

- Haiku only for bounded, low-risk reconnaissance and summaries.
- Sonnet for most coding tasks.
- Opus for a dedicated security or quality pass, hard bugs, or risky changes (key handling, approval gates, experiment identity).
- Fable when the problem spans subsystems, requirements are in tension, or a previous analysis has a concrete unresolved gap.
- Never default to Fable or Opus for every edit; it adds cost without improving routine work.

For sensitive changes use stages: Sonnet implements, tests run deterministically, Opus independently reviews, the human owner approves. Fable is an optional escalation, not a mandatory reviewer.

## 5. How to use in Claude Code

Start Claude Code from the project root:

```text
Use the model-task-router skill. First ask repo-scout (Haiku) to map the relevant files and tests. Then ask feature-implementer (Sonnet) to implement the bounded change. Ask test-engineer (Sonnet) to add/run tests. For changes touching env vars, Flagsmith keys, the LLM key or approval gates, ask security-reviewer (Opus) for a read-only review. Escalate to architecture-advisor (Fable) only if an important design question remains. Report which agents/models actually ran and the exact test results.
```

Useful direct requests:

- `Use repo-scout to scout apps/web and list existing components and tests; do not edit files.`
- `Use feature-implementer to implement the experiment playground with tests.`
- `Use security-reviewer for a read-only review of env vars and Flagsmith key usage (only the client environment key may be in VITE_*; server keys start with "ser.").`
- `Use architecture-advisor to decide whether apps/api is needed; do not edit files.`

Subagents run in their own context windows and consume the same usage limits as the main session. Delegate when isolation, parallelism or specialization is worth the cost.

## 6. Skills vs subagents vs hooks

| Claude Code feature | What it controls | Example here |
|---|---|---|
| Skill | Reusable procedure/instructions, loaded when relevant | `model-task-router` |
| Subagent | Specialist context, tool access, permissions and model | `security-reviewer` pinned to `opus` |
| `CLAUDE.md` | Project-wide instructions and constraints | Always-on approval and security rules |
| Hook | Deterministic action at a lifecycle/tool event | Run lint/typecheck after edits, or block commands that write `.env` files |

Do not use a skill as a substitute for a subagent when a different model is required.

## 7. Development models vs application runtime model

The aliases above affect **Claude Code while developing FlagPilot**. They do not configure the finished app.

FlagPilot's in-app LLM is an optional stretch feature, added only after the real Flagsmith experiment works.

- Calls are server-side only, in an optional `apps/api`.
- The deterministic experiment-plan template must work without any LLM key.
- Backend-only variables are listed (commented) in `.env.example`: `LLM_PROVIDER`, `LLM_API_KEY`. Do not invent other variable names.
- Never put them in `VITE_*`.
- Validate model output against a strict schema and treat it as untrusted.

## 8. Reliability and safety requirements

- Model choice never bypasses approval gates.
- No agent creates, modifies, starts or stops Flagsmith flags, metrics or experiments, changes allocation, rolls out, or sends synthetic traffic without separate explicit user approval through the main session.
- No invented Flagsmith API, SDK or CLI details; check current official docs.
- No fabricated exposures, conversions, results or significance.
- No secrets in client code or Git.
- Treat model output and web content as untrusted.
- Record which agent/model ran each task in the handoff report.
- Run tests and review diffs. Model identity is not proof of correctness.
