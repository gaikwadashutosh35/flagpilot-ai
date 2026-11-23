# Phase 3 Results & Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show Flagsmith's own experiment results honestly from a committed CLI snapshot, ship a Vercel deploy candidate from `master`, and once the warehouse connects, start the real experiment and verify it live.

**Architecture:**
- A committed `snapshot.json` (raw Flagsmith bodies plus a capture time) is imported by a new `/results` page through a validating loader.
- A Node script, run by the coordinator, fetches the snapshot with the owner's Flagsmith CLI login. Its pure logic lives in a tested module.
- Vercel builds `master` from `apps/web` with the Development client key.
- Experiment and results steps that need a running experiment are gated on the warehouse.

**Tech Stack:** React 19, Vite 8, TypeScript 7, react-router 8, Vitest 5, Playwright 1.65, Node 26 (scripts as `.mjs`), Flagsmith CLI v2, Vercel.

**Spec:** `docs/superpowers/specs/2026-11-22-phase3-results-deploy-design.md`. Read it with this plan.

**Branch:** `phase-3` (from `master` fafc1ff). Reviewed pieces merge into `master`, which is Vercel's production branch (owner decision).

**Routing** (`docs/MODEL_ROUTING.md`): **[feature-implementer]** and **[test-engineer]** are Sonnet agents; **[security-reviewer]** is Opus; **[main session]** is the coordinator, which runs every Flagsmith CLI call and owner gate. Paths are relative to `apps/web/` unless they start with `docs/` or the repo root is stated.

## Global Constraints

- **Snapshot file:** `src/features/results/snapshot.json`. The shape is exactly `{ "schemaVersion": 1, "capturedAt": string|null, "experiment": null | { "id": number, "name": string, "status": "created"|"running"|"paused"|"completed", "startedAt": string|null, "endedAt": string|null }, "exposures": unknown|null, "results": unknown|null }`. `capturedAt` is required (an ISO string) whenever `experiment` is non-null. The committed initial file is the all-null object.
- **Page copy, verbatim:**
  - Header lines (always shown): "From Flagsmith, as of <capturedAt formatted in the visitor's locale>" (with no experiment: "From Flagsmith" plus "No snapshot captured yet") and "Snapshot updated by the project owner via the Flagsmith CLI".
  - Dashboard link to `https://app.flagsmith.com/` with the text "Open Flagsmith (Flagsmith login required)".
  - State copy: "No experiment running yet." · "Experiment created, not started yet." · "Flagsmith hasn't computed results yet." · "Snapshot unreadable".
  - Badges: "Paused" · "Ended — results final".
- Before the real results mapping exists (Task 7), a non-null `results` shows exactly "Results captured from Flagsmith — detailed view coming once the format is confirmed." It never renders raw numbers.
- No number on `/results` that didn't come from the snapshot. No winner claim beyond spec §5.4.
- **Script safety:** abort (non-zero exit, snapshot untouched) if any fetched body contains `ser.`. Replace every occurrence of the client environment key with `[ENV_KEY]` before writing. Never print a raw body or a key.
- Experiment selection: the experiment whose `feature` equals the `flagpilot_onboarding_cta` flag ID, preferring status `running` > `paused` > `created` > `completed`.
- Refresh at most once per 5 minutes, and only with `--refresh`.
- **Vercel:** `vercel.json` is `{ "rewrites": [ { "source": "/(.*)", "destination": "/index.html" } ] }`. `package.json` `"engines": { "node": ">=22.12" }`. Env `VITE_FLAGSMITH_ENVIRONMENT_KEY` is the Development client key.
- Tests import from `vitest` (no globals). Never stage `.env.local`, `node_modules`, `dist`, root `MODEL_ROUTING.md`/`SKILL.md`. End commits with the Co-Authored-By line for the model that wrote them.
- Every Flagsmith write (experiment create, start, go-live rollout PATCH, refresh) runs only from the main session, after its own owner approval in chat. Refresh is pre-approved as part of the snapshot routine (spec §5.2), but every run is logged.

## Review Focus

1. **Results present before the format is known.** A snapshot with non-null `results` must render the fixed "Results captured…" line, never crash or dump JSON. (Task 1 test.)
2. **Malformed snapshot.** Bad `schemaVersion`, an unknown status, a missing or invalid `capturedAt` with a non-null experiment, or a non-object experiment must all show "Snapshot unreadable". (Task 1 tests.)
3. **Ended or paused experiment with no computed results.** It must show both the badge and "Flagsmith hasn't computed results yet." (Task 1 test.)
4. **CLI failure mid-run** (not logged in, network, non-JSON). The script exits non-zero and leaves the existing snapshot byte-identical, with no partial write. (Task 2 test.)
5. **Experiment list shapes:** a bare array, a paginated `{ results: [...] }`, an empty list, and a list with only other flags' experiments. Each must select correctly or report `no experiment`. (Task 2 test.)

---

### Task 0: Commit spec and plan on `phase-3` [main session]

- [ ] `git add docs/superpowers/specs/2026-11-22-phase3-results-deploy-design.md docs/superpowers/plans/2026-11-22-phase3-results-deploy.md` → commit `docs: Phase 3 design and implementation plan`.

### Task 1: Results page, snapshot loader, nav, deploy config [feature-implementer]

**Files:**
- Create: `src/features/results/snapshot.json`, `src/features/results/loadSnapshot.ts`, `src/features/results/ResultsPage.tsx`, `vercel.json`
- Modify: `src/app/App.tsx` (route `/results`), `src/components/layout/TopBar.tsx` (link "Results"), `package.json` (`engines`)
- Test: `src/features/results/loadSnapshot.test.ts`, `src/features/results/ResultsPage.test.tsx`, `src/features/results/snapshot.secret.test.ts`

**Interfaces:**
- Produces:
  - `type ExperimentStatus = 'created' | 'running' | 'paused' | 'completed'`
  - `type Snapshot = { schemaVersion: 1; capturedAt: string | null; experiment: null | { id: number; name: string; status: ExperimentStatus; startedAt: string | null; endedAt: string | null }; exposures: unknown; results: unknown }`
  - `type LoadedSnapshot = { ok: true; snapshot: Snapshot } | { ok: false }`
  - `loadSnapshot(raw: unknown): LoadedSnapshot`
  - `ResultsPage({ data }: { data?: unknown })`, which defaults to the imported `snapshot.json`, so tests can pass fixtures.

- [ ] **Step 1: Write the failing tests.**

```ts
// loadSnapshot.test.ts
it('accepts the committed all-null snapshot', () => { expect(loadSnapshot({ schemaVersion: 1, capturedAt: null, experiment: null, exposures: null, results: null })).toEqual({ ok: true, snapshot: expect.objectContaining({ experiment: null }) }) })
it.each(['created','running','paused','completed'])('accepts status %s with capturedAt', s => { /* experiment {id:1,name:'x',status:s,startedAt:null,endedAt:null}, capturedAt '2026-11-23T10:00:00Z' → ok:true */ })
it.each([
  ['bad schemaVersion', { schemaVersion: 2, capturedAt: null, experiment: null, exposures: null, results: null }],
  ['unknown status', { /* status 'draft' */ }],
  ['experiment without capturedAt', { /* experiment set, capturedAt null */ }],
  ['invalid capturedAt', { /* capturedAt 'yesterday' */ }],
  ['experiment not an object', { /* experiment: 'x' */ }],
  ['not an object', null],
])('rejects %s', (_n, raw) => { expect(loadSnapshot(raw)).toEqual({ ok: false }) })
// ResultsPage.test.tsx (wrap in MemoryRouter)
it('no experiment: shows "No experiment running yet." and "No snapshot captured yet"', ...)
it('created: shows "Experiment created, not started yet."', ...)
it('running with results null: shows "Flagsmith hasn\'t computed results yet." and the as-of time', ...)
it('completed with results null: shows "Ended — results final" and "Flagsmith hasn\'t computed results yet."', ...)
it('paused: shows "Paused"', ...)
it('results present before mapping: shows the fixed "Results captured from Flagsmith — detailed view coming once the format is confirmed." and no digits from the body', () => { /* results: { foo: 12345 } → queryByText(/12345/) null */ })
it('invalid snapshot: shows "Snapshot unreadable"', ...)
it('always shows "Snapshot updated by the project owner via the Flagsmith CLI" and the "Open Flagsmith (Flagsmith login required)" link to https://app.flagsmith.com/', ...)
// snapshot.secret.test.ts (node environment: `// @vitest-environment node`)
it('committed snapshot contains no server key and not the client key', () => { /* read ../../../../flagsmith.json environment (repo root) and src/features/results/snapshot.json text; expect(text).not.toContain('ser.'); expect(text).not.toContain(clientKey) */ })
```
- [ ] **Step 2:** `npx vitest run src/features/results`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement.**
  - The loader is a hand-written type guard, with no new dependency. `capturedAt` is valid when `!Number.isNaN(Date.parse(v))`.
  - The page uses existing shadcn `Card`/`Badge`.
  - Add the route and TopBar link "Results" (after "Experiment status").
  - Add `vercel.json` and `engines` exactly as in Global Constraints.
- [ ] **Step 4:** Full gate from `apps/web`: `npx vitest run`, `npm run lint`, `npm run build`, `npm run test:e2e`. All pass. Existing tests stay green; Task 1's own App test may need the new link added.
- [ ] **Step 5:** Commit `feat(web): results page from committed Flagsmith snapshot, Vercel config`.

### Task 2: Snapshot script [feature-implementer]

**Files:**
- Create: `scripts/snapshot-lib.mjs`, `scripts/snapshot-results.mjs` (both under `apps/web/scripts/`)
- Test: `scripts/snapshot-lib.test.mjs`

Ruling: the script lives in `apps/web/scripts/`, not the repo-root `scripts/` path in spec §5.2, so Vitest in `apps/web` can test it. It is run from the repo root as `node apps/web/scripts/snapshot-results.mjs [--refresh]`.

**Interfaces:**
- Produces (in `snapshot-lib.mjs`, pure, no I/O):
  - `selectExperiment(list: unknown, flagId: number): object | null`. It accepts an array or `{ results: [] }` and applies the preference order.
  - `mapExperiment(apiExperiment: object): { id, name, status, startedAt, endedAt }`, from `id, name, status, started_at, ended_at`.
  - `redact(text: string, clientKey: string): string`, which replaces every occurrence with `[ENV_KEY]`.
  - `assertNoServerKey(text: string): void`, which throws `Error('server key detected')` if `text` includes `ser.`.
  - `buildSnapshot({ experiment, exposures, results, capturedAt }): object`, which returns the Global Constraints shape. An all-null input gives the all-null snapshot.
- Produces (runner `snapshot-results.mjs`):
  - It reads `environment` from the repo-root `flagsmith.json`.
  - It finds the CLI as `process.env.FLAGSMITH_BIN`, else `flagsmith`, else `${os.homedir()}/.local/bin/flagsmith(.exe)`.
  - It calls CLI subcommands with `execFile` (no shell): `feature get flagpilot_onboarding_cta --json` for the flag `id`, `api api/v1/environments/<key>/experiments/`, and, if found and with `--refresh`, POST `…/<id>/results/refresh/` and `…/<id>/exposures/refresh/` (`-X POST`), then waits 60 s, then GET `…/<id>/`, `…/<id>/exposures/`, `…/<id>/results/`.
  - Every CLI stdout is checked with `assertNoServerKey`, then passed through `redact`.
  - It writes `apps/web/src/features/results/snapshot.json` (2-space JSON plus a newline) through a temp file and rename, only after every call succeeded.
  - It prints one summary line: `no experiment`, or `experiment <id> <status>; results <null|present>; captured <ISO>`.
  - On any failure it prints `snapshot failed: <short reason>` (never a body) and exits 1.

- [ ] **Step 1: Write the failing tests** (`// @vitest-environment node`).

```js
it('selects from a bare array and from {results}', () => { const exps = [{ id: 1, feature: 9, status: 'completed' }, { id: 2, feature: 299210, status: 'created' }, { id: 3, feature: 299210, status: 'running' }]; expect(selectExperiment(exps, 299210).id).toBe(3); expect(selectExperiment({ results: exps }, 299210).id).toBe(3) })
it('returns null for empty lists or other flags only', () => { expect(selectExperiment([], 299210)).toBeNull(); expect(selectExperiment({ results: [{ id: 1, feature: 9, status: 'running' }] }, 299210)).toBeNull() })
it('prefers running > paused > created > completed', ...)
it('maps snake_case experiment fields', () => { expect(mapExperiment({ id: 7, name: 'n', status: 'running', started_at: 'a', ended_at: null, hypothesis: 'h' })).toEqual({ id: 7, name: 'n', status: 'running', startedAt: 'a', endedAt: null }) })
it('redacts every client key occurrence', () => { expect(redact('k=ABC and ABC', 'ABC')).toBe('k=[ENV_KEY] and [ENV_KEY]') })
it('throws on a server key', () => { expect(() => assertNoServerKey('{"k":"ser.abc"}')).toThrow('server key detected') })
it('buildSnapshot with nothing gives the all-null snapshot', () => { expect(buildSnapshot({ experiment: null, exposures: null, results: null, capturedAt: null })).toEqual({ schemaVersion: 1, capturedAt: null, experiment: null, exposures: null, results: null }) })
it('runner leaves the snapshot byte-identical when a CLI call fails', async () => { /* import the runner's exported run({ exec, readFile, writeFile, rename, now }) with an exec stub that rejects on the experiments call; assert writeFile/rename never called and the promise rejects */ })
```
  For that last test, the runner exports `run(deps)` with injectable `exec` / fs functions. The file's own entry point calls `run` with real deps only when executed directly (`import.meta.url === pathToFileURL(process.argv[1]).href`).
- [ ] **Step 2:** `npx vitest run scripts`. Expected: FAIL.
- [ ] **Step 3:** Implement `snapshot-lib.mjs` and `snapshot-results.mjs` to the contracts above.
- [ ] **Step 4:** Full gate: `npx vitest run`, `npm run lint`, `npm run build`. All pass.
- [ ] **Step 5:** Commit `feat(web): Flagsmith results snapshot script with key safety`.

### Task 3: Dry run of the snapshot script [main session]

- [ ] From the repo root: `node apps/web/scripts/snapshot-results.mjs`. Expected output: `no experiment`, exit 0, and `git diff --stat` shows `snapshot.json` unchanged (all-null).
- [ ] If the output differs or the script errors, stop and route the exact output to the Task 2 implementer.

### Task 4: E2E for `/results` and full gate [test-engineer]

**Files:** Modify `e2e/demo.spec.ts` (or add `e2e/results.spec.ts`).

- [ ] **Step 1:** Add the test "results page shows the committed snapshot state":
  - open `/results` directly and expect "No experiment running yet." and "Snapshot updated by the project owner via the Flagsmith CLI";
  - open `/` and follow the TopBar "Results" link with the keyboard only (Tab/Enter) at 375×812 to reach `/results`;
  - check no horizontal scroll (`scrollWidth <= 375`);
  - check there are no `*.flagsmith.com` requests from `/results` itself (it reads the bundled file).
- [ ] **Step 2:** `npm run test:e2e`. Expected: 3 passed.
- [ ] **Step 3:** Full gate (lint, `vitest run`, build, e2e). Report outputs.
- [ ] **Step 4:** Commit `test(web): results page E2E`.

### Task 5: Merge, push, Vercel deploy, smoke test [main session + owner]

- [ ] Merge reviewed `phase-3` into `master` (fast-forward when possible), then re-run `npx vitest run` and the build on `master`.
- [ ] **Owner gate:** owner creates the GitHub repository (and decides public/private timing), then approves `git remote add origin <url>` and `git push -u origin master` in chat.
- [ ] **Owner gate:** owner imports the repo in Vercel (Root Directory `apps/web`, production branch `master`) and sets `VITE_FLAGSMITH_ENVIRONMENT_KEY` to the Development client key for Production and Preview, then redeploys.
- [ ] **Smoke test (browser pane, deployed URL):**
  - hard-load `/`, `/copilot`, `/experiment`, `/results`; each renders (no 404);
  - the flags request to `edge.api.flagsmith.com` succeeds and the CTA shows copy;
  - 0 console errors;
  - the deployed JS contains no `ser.`.
- [ ] Record the URL and evidence for the Phase 3 report.

### Task 6: Start the experiment and capture the first real results [main session, gated on warehouse = Connected]

Parked from the Phase 3 fix wave, do before the first real snapshot: harden experiment selection so a flag-matching item with an unknown status throws.

- [x] Check the warehouse (`flagsmith api api/v1/environments/<key>/warehouse-connections/`). Connected 2026-11-23 05:16 UTC (warehouse 10645).
- [x] **Approval #3:** experiment 394 created 2026-11-23 06:24 UTC, status `created`.
  - Body: feature `299210`, name "Onboarding CTA copy", hypothesis "Benefit-oriented CTA copy increases genuine demo completion.", metric `319` with `expected_direction: "increase"`, `experiment_rollout` enabled false, `rollout_percentage` 0, value `control`, option `36243` (`benefit_copy`) at 50.
- [ ] **Approval #4 (start):** on or after 2026-11-26 08:00 IST, after a yes, `POST …/experiments/394/start/` as a bodyless POST (do not use `--input -`), then GET it, confirm status `running`, and record Flagsmith's `started_at` in the README amendment.
- [ ] **Approval #5 (go live):** asked separately, run right after #4. After a yes, `PATCH …/experiments/394/rollout/` with `enabled: true`, `rollout_percentage: 100`, value `control`, option `36243` at 50. GET the experiment and confirm `experiment_rollout` shows enabled true, 100%. Record the go-live time in the README amendment.
- [ ] **Live verification (spec §5.5), after approval #5,** in a fresh browser profile, with owner OK for one genuine session:
  - the flags response has `experiment.inExperiment: true`;
  - events POST returns 202 after the CTA renders and after the click;
  - approve a plan, and Done shows "Sent (queued for delivery)".
- [ ] After at least 5 minutes: `node apps/web/scripts/snapshot-results.mjs --refresh`. If `results` is non-null:
  - record its exact top-level and per-variant field names in a spec amendment (§5.4), along with how a verdict/status is represented;
  - save a sanitized copy as `src/features/results/__fixtures__/real-results.json` (redacted the same way);
  - commit the snapshot and fixture (`chore(results): first real Flagsmith snapshot`).

### Task 7: Per-variant table and verdict [feature-implementer, gated on Task 6 producing a real non-null `results`]

- [ ] The task brief is completed from Task 6's spec amendment. Rules (spec §5.4):
  - Show per variant only the fields present (missing → "—").
  - Verdict source order: Flagsmith's own verdict field if present; else Flagsmith's documented thresholds applied to Flagsmith's numbers ("Collecting data" if any arm has fewer than 50 identities or fewer than 5 conversions; "Inconclusive" if the interval crosses zero; "Leading: <variant>" only if win probability is above 95%; else "Inconclusive").
  - Name the source ("Verdict from Flagsmith" / "Verdict per Flagsmith's documented thresholds").
  - Show Flagsmith's SRM result if present; when it is null, say "SRM check not available from Flagsmith".
- [ ] Tests first, against `real-results.json` plus small edited copies, one per verdict branch. Replace the Task 1 "Results captured…" placeholder only for snapshots that match the confirmed shape. An unrecognised shape keeps the placeholder.
- [ ] Full gate; commit `feat(web): Flagsmith results table and verdict`.

### Task 8: Security review, fixes, report, merge [security-reviewer → feature-implementer → main session]

- [ ] `security-reviewer` (Opus) does a read-only review of `scripts/snapshot-*.mjs`, `snapshot.json`, `/results`, `vercel.json` and the deployed bundle. Focus on key handling, injection via `execFile` arguments, honesty of the displayed numbers, and redaction.
- [ ] `feature-implementer` fixes each confirmed finding with a failing test first; then the full gate.
- [ ] The main session writes `docs/PHASE_3_REPORT.md`, covering:
  - the deploy URL, the snapshot runs log, and the experiment ID/status;
  - the live-verification evidence, the tests, and the agent/model table;
  - blockers, including the warehouse if it is still pending.

  Then it merges `phase-3` into `master` and pushes (an owner-approved remote exists by then), and stops to ask about Phase 4.
