# Phase 1 — Setup and Foundation

**Target dates:** November 21–22, 2026  
**Owner:** Ashutosh (product decisions and approvals) + Claude Code (assisted setup)  
**Exit condition:** Local React app runs, ECC is enabled, Flagsmith project exists, warehouse/access state is known, no secrets are committed.

## Step 1 — Create the working directory

Open Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force C:\Projects\FlagPilot | Out-Null
Set-Location C:\Projects\FlagPilot
```

Extract this starter kit into this folder. Confirm `CLAUDE.md`, `README.md`, `docs`, `prompts`, and `scripts` are at the repository root.

## Step 2 — Verify tools

Current Vite guidance requires Node.js 20.19+ or 22.12+. ECC also requires Node.js 18+, Git and Claude Code 2.1+ for the Claude plugin. Use Node 22.12+ (or a newer supported LTS) to satisfy the combined toolchain.

```powershell
node --version
npm --version
git --version
claude --version
```

If a command is missing, stop and install/repair it before proceeding. Do not continue with an unsupported Node version.

## Step 3 — Install ECC (choose one route only)

Recommended official guided setup:

```powershell
npx ecc-universal@2.2.3 setup
```

For a personal Windows installation, select:
- Scope: Global user
- Hooks: Standard

Restart Claude Code, then run:

```text
/plugin list
```

Verify `ecc@ecc` is enabled.

Do not install ECC via the native plugin flow and then run a second full manual installation. Do not clone/copy every ECC file into the FlagPilot project. See `ECC_WORKFLOW.md`.

## Step 4 — Create Flagsmith Cloud project

1. Open https://app.flagsmith.com/
2. Create/sign in to your account.
3. Create an organisation/project for FlagPilot.
4. Create a Development environment.
5. Open that environment's Settings → Warehouse.
6. Select the managed Flagsmith warehouse and enable it.
7. Use “Send your first event” if the UI offers it.
8. Keep the page open and monitor status.

Expected states include Created, Pending Connection, Connected or Errored. The first event can take a few hours to process. Do this early. Do not try creating an experiment until the warehouse is Connected.

Do not paste admin keys or credentials into this project, chat or screenshots.

## Step 5 — Install and verify Flagsmith CLI

Check:

```powershell
flagsmith --version
```

It must report v2 or later. On Windows, if the command is unavailable, use the current official Windows installation instructions. The official agent guide lists npm installation as a fallback:

```powershell
npm install -g @flagsmith/cli
flagsmith --version
```

Authenticate interactively:

```powershell
flagsmith login
```

Then inspect projects and environments:

```powershell
flagsmith project list
flagsmith environment list --project <YOUR_PROJECT>
```

Bind the repository to the selected project/environment:

```powershell
flagsmith init --project <YOUR_PROJECT> --environment <YOUR_ENVIRONMENT_KEY>
```

Replace placeholders locally. Do not put credentials or admin keys in docs or source control. Do not paste secret output into chat.

## Step 6 — Scaffold the React app

From `C:\Projects\FlagPilot`:

```powershell
npm create vite@latest apps/web -- --template react-ts
```

Then:

```powershell
Set-Location apps/web
npm install
npm install "@flagsmith/flagsmith@^12.4.0"
npm run build
Set-Location ../..
```

The Flagsmith docs currently list `@flagsmith/flagsmith` 12.4.0+ for React/JavaScript experimentation. Do not implement SDK calls until you have read the matching current React tab in the official Run an Experiment docs.

## Step 7 — Add local environment placeholder

Create `apps/web/.env.local`:

```env
VITE_FLAGSMITH_ENVIRONMENT_KEY=
```

Paste only the browser-safe client environment key from Flagsmith when ready. Do not use a server/admin key here.

Ensure `.env.local` is ignored by Git. The starter `.gitignore` does this.

## Step 8 — Initialise Git and verify

From the project root:

```powershell
git init
git status
```

Check that no `.env.local`, credentials, tokens or keys appear in `git status`.

Run:

```powershell
Set-Location apps/web
npm run dev
```

Open the local URL shown by Vite, normally http://localhost:5173. Stop the server with Ctrl+C after confirming the starter page loads.

Then:

```powershell
npm run build
```

## Step 9 — Phase 1 evidence

Record the following in `docs/PHASE_1_REPORT.md`:
- Node and npm versions (versions only; no tokens)
- Git and Claude Code available
- ECC `/plugin list` verification
- Flagsmith project and environment names (not keys)
- Warehouse status
- CLI version and project binding success/failure (never credentials)
- Vite dev server success
- Production build success
- Any blockers

## Phase 1 completion checklist

- [ ] Windows toolchain passes.
- [ ] ECC plugin enabled.
- [ ] Flagsmith Cloud project and Development environment created.
- [ ] Warehouse is Connected, or Pending status is being tracked with first event initiated.
- [ ] Flagsmith CLI v2+ works and is authenticated.
- [ ] Repo bound to intended Flagsmith project/environment.
- [ ] Vite React TypeScript app created.
- [ ] Flagsmith SDK dependency installed.
- [ ] Dev server loads.
- [ ] Production build passes.
- [ ] No secrets committed.
- [ ] Phase 1 report prepared.

Do not start building the full dashboard or AI copilot in Phase 1. Finish the foundation and request approval for Phase 2.
