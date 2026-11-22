# Phase 3 Design — Real results, live verification, deploy candidate

**Date:** 2026-11-22 · **Status:** draft for owner approval · **Scope:** Phase 3 of `docs/END_TO_END_PLAN.md`. Builds on branch `phase-2-core` (Phase 2 spec: `docs/superpowers/specs/2026-11-21-phase2-core-design.md`).

## 1. Intent

A judge has to be able to reproduce the experiment and understand the result. If the sample is too small, the product must say "collecting" or "inconclusive" instead of inventing a winner (`END_TO_END_PLAN.md`, Phase 3 exit gate). Phase 3 therefore:

1. Starts the real experiment once the warehouse connects, and checks that exposure and conversion events really arrive.
2. Shows Flagsmith's own results in the app, honestly.
3. Ships a public deploy candidate.

**Owner decision:** results are shown from a **CLI snapshot** (approach B). The coordinator fetches them with the owner's Flagsmith login, saves them as a JSON file in the repo, and the app renders that file, labelled with its capture time.

## 2. Goals, non-goals, anti-goals

**Goals**
- A `/results` page that renders the committed snapshot. It covers every state from "no experiment yet" to real per-variant numbers.
- A snapshot script the coordinator runs. It never writes the environment key into the snapshot or prints it.
- Approvals #3 (create the experiment) and #4 (start it) once the warehouse is Connected, then a recorded live check of exposure and conversion.
- A Vercel deploy candidate where every route works on refresh, the real Flagsmith CTA is live, and the console shows no errors.

**Non-goals**
- Live results from a server.
- An admin credential on any server.
- An LLM.
- Ending the experiment (`complete` is permanent, so not before judging).
- The README and demo video (Phase 4).

**Anti-goals**
- Any number on `/results` that didn't come from a Flagsmith response.
- A "winner" claim Flagsmith's numbers don't support.
- An admin token, OAuth token, or `ser.` key in the repo, the bundle, or the snapshot.
- Refreshing results more often than once every 5 minutes.
- Synthetic traffic without the owner's OK.

## 3. Constraints (verified 2026-11-22)

- **Results need admin auth.** In the official OpenAPI (`https://api.flagsmith.com/api/v1/swagger.json`), `GET /api/v1/environments/{environment_api_key}/experiments/{experiment_id}/results/` is "(Beta) Retrieves statistical results for an experiment's metrics. Returns null if not yet computed." Its security is `tokenAuth` or `Master API Key`, so the browser's client key can't call it. The same applies to `…/exposures/` ("Returns null if not yet computed"), `…/results/refresh/` and `…/exposures/refresh/`.
- **Results body is undocumented.** The schema's documented 200 body for `results/` is the generic `Experiment` object, so the actual results shape is not documented. **The per-variant field mapping is defined only from the first real response** (build order step 4).
- **Experiment status enum:** `created`, `running`, `paused`, `completed`. The fields are `id`, `feature`, `name`, `hypothesis`, `status`, `created_at`, `updated_at`, `started_at`, `ended_at`.
- **Lifecycle endpoints:**
  - create: `POST …/experiments/`
  - start: `POST …/experiments/{id}/start/`
  - pause: `POST …/experiments/{id}/pause/`
  - complete: `POST …/experiments/{id}/complete/`

  Ending freezes results for good and can't be restarted (docs: create-an-experiment). One active experiment per flag. The flag config is locked while running.
- **Refresh limit:** results are computed periodically. A manual refresh is allowed at most once every 5 minutes (docs: analyse-an-experiment, statistics).
- **Flagsmith's documented thresholds** (docs: statistics):
  - a metric shows "Collecting data" until **every arm has at least 50 identities** and, for conversion metrics, **at least 5 conversions**;
  - a credible interval that crosses zero is **inconclusive**;
  - **above 95%** chance to win is the winning verdict;
  - an SRM warning flags a broken split.
- **Deploy (Vercel docs):**
  - the project Root Directory is `apps/web`;
  - `vercel.json` there is `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`;
  - Node supported is 22.x / 24.x / 26.x (26 is the default; Node 20 has been blocked since 2026-10-01). Our build already passes locally on Node 26.13;
  - `VITE_*` vars are inlined at build time, so a redeploy is needed after setting them;
  - the Hobby plan is fine for non-commercial use.
- **Warehouse:** still `pending_connection` with 1 event at 2026-11-22 02:30 UTC. Steps that need a running experiment are gated on it.

## 4. Approaches considered

1. **A. Server-side proxy:** a Vercel function with a Flagsmith Admin key, caching results.
   - Upside: live numbers.
   - Downsides: an admin credential on a server, and no confirmed read-only key type. Vercel's Vite preset may also need Nitro for an `api/` folder.
   - Rejected by the owner.
2. **B. CLI snapshot (chosen):** the coordinator fetches results with the owner's login and commits a JSON snapshot that the app renders, labelled with its capture time.
   - Upside: no secret anywhere, no backend, and the numbers are exactly Flagsmith's.
   - Cost: updates need a re-run and a redeploy.
3. **C. Dashboard link only:** judges need a Flagsmith login. Kept only as a link next to B.

## 5. Design

### 5.1 Snapshot file

`apps/web/src/features/results/snapshot.json` is committed and imported by the app (bundled, typed, and covered by tests).

```json
{
  "schemaVersion": 1,
  "capturedAt": null,
  "experiment": null,
  "exposures": null,
  "results": null
}
```

- **`capturedAt`:** an ISO timestamp, set whenever `experiment` is non-null.
- **`experiment`:** `null`, or `{ "id": number, "name": string, "status": "created" | "running" | "paused" | "completed", "startedAt": string | null, "endedAt": string | null }`, mapped from the API's snake_case fields.
- **`exposures` and `results`:** the raw Flagsmith JSON bodies stored verbatim, or `null`. They are never edited by hand.
- **Initial content:** the all-null file above, because no experiment exists yet.

### 5.2 Snapshot script (coordinator-run)

`scripts/snapshot-results.mjs` is a Node script (cross-platform; decided while writing this doc, because the owner's shell is PowerShell). It runs from the repo root as `node scripts/snapshot-results.mjs [--refresh]`.

- **CLI calls:** it calls the Flagsmith CLI through `child_process.execFile` (no shell, so nothing in the arguments is interpreted).
- **Reads:** the environment key comes from `flagsmith.json` into a variable. It is never printed.
- **Finds the experiment itself:** `GET …/experiments/`, then picks the experiment whose `feature` is the `flagpilot_onboarding_cta` flag ID, preferring `running`, then `paused`, `created`, `completed`. If there is none, it writes the all-null snapshot, prints `no experiment`, and exits 0. This is the build step 2 dry run, and it exercises the list call and the safety check on real output.
- **With `--refresh`:** first `POST …/results/refresh/` and `…/exposures/refresh/`, then wait 60 s. If Flagsmith refuses (the 5-minute limit), continue with the last computed results and say so.
- **Fetches:** `GET …/experiments/{id}/`, `…/exposures/`, `…/results/`. It maps `experiment`, stores the other two verbatim, and sets `capturedAt`.
- **Safety, before writing (decided while writing this doc):**
  - Abort if the output contains `ser.`.
  - Replace any occurrence of the client environment key with `[ENV_KEY]`. The client key is not secret, but the snapshot doesn't need it, so this redacts rather than aborts.
- **Output:** a one-line summary (status, whether results are null, capture time). It never prints raw bodies to the terminal.
- **Approval:** fetching is read-only. `refresh` triggers a computation and changes no config. The owner approves the snapshot routine once (this design), and every run is logged in the phase report.

### 5.3 `/results` page

- **Navigation:** a new route `/results` and a TopBar link "Results".
- **Reads:** the snapshot only, through a small typed loader that validates `schemaVersion === 1`, the status enum and `capturedAt`. An invalid snapshot shows "Snapshot unreadable" rather than crashing.
- **Header (always shown):** "From Flagsmith, as of <capturedAt in the visitor's locale>", plus "Snapshot updated by the project owner via the Flagsmith CLI", plus a link to the Flagsmith dashboard noted "(Flagsmith login required)".

**States:**

| Snapshot | Page shows |
|---|---|
| `experiment: null` | "No experiment running yet." Plus one line on what happens next (created and started with owner approval once Flagsmith's warehouse connects). |
| status `created` | "Experiment created, not started yet." |
| `running` / `paused` / `completed`, `results: null` | "Flagsmith hasn't computed results yet." Plus status, started time, and the exposures body's counts **only if** `exposures` is non-null and the mapping (step 4) is defined. |
| `results` non-null | The per-variant table and verdict (§5.4). |
| status `paused` / `completed` | A status badge ("Paused" / "Ended — results final"). |

### 5.4 Per-variant table and verdict (defined after the first real response)

When the first real non-null `results` body is captured, the coordinator records its exact shape in this spec (an amendment) and adds a sanitized copy as a test fixture. The mapping then follows these rules:

- Show per variant (`control`, `benefit_copy`): identities/exposures, conversions, and Flagsmith's delta, credible interval and win probability, **using only fields present in the response**. A missing field shows "—".
- **Verdict:**
  - If Flagsmith's response carries its own verdict or status field, show that.
  - Otherwise apply Flagsmith's documented thresholds (§3) to Flagsmith's numbers: "Collecting data" if any arm has fewer than 50 identities or fewer than 5 conversions; else "Inconclusive" if the interval crosses zero; else "Leading: <variant>" only if win probability is above 95%; else "Inconclusive".
  - The page names the source: "Verdict from Flagsmith" or "Verdict per Flagsmith's documented thresholds".
- An SRM warning is shown if present in the response.

### 5.5 Live verification (coordinator, after approval #4)

The check uses a fresh browser profile (Phase 2 dev browsers carry an old "CTA seen" mark) on the deployed URL (or local if not yet deployed):

1. The flags response shows `flagpilot_onboarding_cta` with `experiment.inExperiment: true`. The CTA copy matches the variant.
2. An events POST returns 202 after the CTA renders (exposure) and after a click.
3. Approve a plan, and Done says "Sent (queued for delivery)".
4. After at least 5 minutes, run the snapshot with `--refresh` and confirm the exposures/results bodies reflect activity (or record honestly that they don't yet).

Evidence (request URLs, statuses, timestamps, never keys) goes into `docs/PHASE_3_REPORT.md`. This is one genuine visitor session by the coordinator, so it needs the owner's OK at the time, like the warehouse nudge.

### 5.6 Deploy candidate

- **Repo changes:**
  - `apps/web/vercel.json` with the documented rewrite;
  - `apps/web/package.json` `"engines": { "node": ">=22.12" }`, which maps to Node 26 on Vercel, already proven locally.
- **Branches (owner decision, 2026-11-22):**
  - `phase-2-core` is merged into `master`.
  - Phase 3 is built on a new `phase-3` branch and merged into `master` as each reviewed piece lands.
  - Vercel's production branch is **`master`**, so a snapshot update is a commit to `master` plus Vercel's automatic redeploy.
- **Owner steps (outside the repo):**
  - create a GitHub repository and approve the push of `master` (making it **public** is the owner's timing call given the pre-hackathon-code question);
  - import it in Vercel with Root Directory `apps/web`;
  - set `VITE_FLAGSMITH_ENVIRONMENT_KEY` to the **Development** client key (the one in `flagsmith.json`) for both Vercel Production and Preview.

    Decided while writing this doc: the flag, the metric, the warehouse and the experiment all live in Flagsmith's Development environment. Copying them to Flagsmith Production would need a second warehouse and more approvals, so Flagsmith's Development environment backs the public demo.
- **Smoke test (coordinator, browser):**
  - every route on hard refresh (`/`, `/copilot`, `/experiment`, `/results`);
  - the flags request succeeds and the CTA shows live copy;
  - no console errors;
  - no `ser.` in the deployed bundle.

### 5.7 Testing

- **Unit:**
  - the snapshot loader accepts the all-null file and each status, and rejects a bad `schemaVersion` / status / missing `capturedAt`;
  - the verdict function on fixtures for each documented threshold case. It is written against the real response shape in step 4.
- **Component:** `/results` renders each §5.3 state from fixtures, and the header always shows the capture time and source.
- **Repo check:** a test that `snapshot.json` contains no `ser.` and not the client key value from the repo-root `flagsmith.json`.
- **Script:** unit-test the pure parts of `snapshot-results.mjs` (experiment selection, mapping, redaction, the `ser.` abort) on canned JSON. The CLI calls stay thin and untested.
- **Verdict code:** none before the first real response (§5.4). If the warehouse never connects, Phase 3 ships with no table or verdict code. That is deliberate, not a gap.
- **E2E:** `/results` loads directly and shows the committed snapshot's state; the TopBar link works; it is keyboard reachable at 375 px.
- **Gate:** lint, `vitest run`, build and Playwright all pass, then an Opus security review of the snapshot script and the deploy config.

### 5.8 Delegation

Per `docs/MODEL_ROUTING.md`:
- `feature-implementer` (Sonnet) builds the loader, page and script;
- `test-engineer` (Sonnet) owns E2E;
- `security-reviewer` (Opus) reviews the script, the snapshot and the deploy;
- the coordinator runs every Flagsmith CLI call, the approvals, the browser checks and the reports.

## 6. Build order

0. **Owner, now:** ask Flagsmith (Discord) why the warehouse is stuck in Pending Connection after receiving an event.
1. Snapshot loader + all-null `snapshot.json` + `/results` page (§5.3 states) + nav + tests. **Not gated.**
2. Snapshot script (§5.2), plus a dry run (no experiment yet, so it writes the all-null snapshot and prints `no experiment`). **Not gated.**
3. Deploy config, then the owner's GitHub/Vercel steps, then the coordinator smoke test on the deployed URL. **Gated only on the owner's steps.**
4. **When the warehouse is Connected:** approval #3, then approval #4, then live verification (§5.5), then the first real snapshot, then the §5.4 mapping (spec amendment + fixture + table + verdict + tests), then commit the snapshot and redeploy.
5. Opus security review, then fixes, then `docs/PHASE_3_REPORT.md`.

**Definition of Phase 3 done:**
- Steps 1, 2, 3 and 5 complete.
- Step 4 complete if the warehouse connects in time.
- If it doesn't: the report says so plainly, the deployed `/results` honestly shows "No experiment running yet", and the Flagsmith support thread is linked.

## 7. Left to the builder

- Visual layout of `/results`.
- Number and date formatting.
- Exact component split.
- Script internals beyond §5.2's contract.
- Fixture naming.

## Amendment (2026-11-22) — deploy target
Owner decision: deploy on **Netlify** instead of Vercel. Config lives in the repo-root `netlify.toml` (base `apps/web`, command `npm run build`, publish `dist`, `NODE_VERSION = "24"`, SPA rewrite `/* → /index.html 200`). Production branch `master`. `VITE_FLAGSMITH_ENVIRONMENT_KEY` (the Development client key) is set by the owner in Netlify's environment variables. `apps/web/vercel.json` is unused.
