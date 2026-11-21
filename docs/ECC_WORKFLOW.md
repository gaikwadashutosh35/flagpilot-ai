# Everything Claude Code (ECC) Workflow

Repository: https://github.com/affaan-m/ECC

ECC adds specialised agents, skills, hooks, memory, rules and security tooling to supported coding-agent workflows. It is not an application dependency.

## Windows requirements

Current ECC repository guidance:
- Node.js 18+
- Git
- Claude Code 2.1+ on PATH

Vite has a higher Node requirement; use Node 22.12+ for the combined stack.

## Recommended installation

Choose one installation path. Current ECC 2.2 guided setup:

```powershell
npx ecc-universal@2.2.3 setup
```

Select Global user and Standard hooks for a typical personal machine. Restart Claude Code and verify:

```text
/plugin list
```

Confirm `ecc@ecc` is enabled.

Do not combine the native plugin install with a second full manual installation. Do not clone the whole ECC repo into the FlagPilot app unless a specific documented component is intentionally selected.

## How to use ECC

- Planning / architecture: before major features.
- TDD: identity, experiment event and approval logic.
- Frontend skills: dashboard and responsive UI.
- Security review: credentials, LLM and Flagsmith privileged operations.
- Code review: after a milestone.
- Build repair: only after capturing failing output.

Inspect the installed ECC version and use only commands/skills actually present. Slash-command names can change; do not guess. ECC's current docs describe a skills-first workflow.

## Development loop

Plan → inspect skill → write tests → implement one vertical slice → run checks → review → report → ask before privileged Flagsmith action.

## Avoid

- Invoking every agent for every task.
- Multiple agents editing the same files concurrently.
- Installing ECC twice.
- Committing global ECC settings or secrets.
- Letting ECC override current Flagsmith API/SDK documentation.
