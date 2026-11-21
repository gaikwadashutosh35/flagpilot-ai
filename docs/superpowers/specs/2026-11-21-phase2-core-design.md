# Phase 2 Design — FlagPilot core product

**Date:** 2026-11-21 · **Status:** draft for owner approval · **Scope:** Phase 2 of `docs/END_TO_END_PLAN.md`

## 1. Intent

FlagPilot AI is entered in Toggle Wars Track 01 ("Test Something Real"). The proof is one real Flagsmith A/B experiment on FlagPilot's own onboarding CTA:

| | |
|---|---|
| Flag | `flagpilot_onboarding_cta` |
| Control (`control`) | "Create your first experiment" |
| Treatment (`benefit_copy`) | "Launch an experiment in minutes" |
| Hypothesis | Benefit-oriented CTA copy increases genuine demo completion |
| Primary event | `flagpilot_demo_completed` |
| Diagnostic event | `flagpilot_primary_cta_clicked` |

**Owner decision:** genuine completion = the visitor **approves an experiment plan** in the copilot. The copilot (product question → plan → edit → approve) is both the product and the conversion.

**Owner decision:** approach 1, "the landing page is the experiment". The CTA is the first thing every visitor sees.

## 2. Goals, non-goals, anti-goals

**Goals (Phase 2)**
- Landing page with the Flagsmith-controlled CTA. Exposure is recorded where the CTA renders.
- Guided copilot: question → deterministic typed plan → editable plan → review and approve.
- `flagpilot_demo_completed` sent only on plan approval, with the same identity as the exposure.
- Stable anonymous visitor identity.
- Experiment status page: identity, assigned variant, SDK and events status, and a read-only preview of the Flagsmith resources the plan maps to.
- Real Flagsmith flag, metric and experiment, created from the Claude session with the CLI. Each step is approved separately.
- Tests for every item in `CLAUDE.md` § Testing.

**Non-goals (later phases)**
- Results page with Flagsmith data (Phase 3).
- LLM plan generation, `apps/api`, a database, auth, deployment.
- Creating Flagsmith resources from inside the app.

**Anti-goals (failure even if it "works")**
- Local random assignment, or any variant not decided by Flagsmith.
- Conversion sent on CTA click or anywhere other than plan approval.
- Fake counters, results, lift or significance anywhere in the UI.
- Any key other than the Flagsmith client environment key in the browser.
- Any Flagsmith write without its own explicit owner approval.
- Email, name or any other PII used as identity.

## 3. Constraints

- **Stack (existing):** React 19.3, Vite 8.3, TypeScript 7.0.2, Oxlint (`apps/web`).
- **Stack (to add, versions checked 2026-11-21):** Tailwind CSS 4.3.5 + `@tailwindcss/vite` (supports Vite 8), shadcn CLI 4.23.0, Vitest 5.1.1, jsdom 31, @testing-library/react 16.3.3, @testing-library/jest-dom 8 (needs Vitest 5), @testing-library/user-event 14, @playwright/test 1.65.1, `react-router` (version checked against its docs at install).
- **TypeScript 7 risk:** shadcn's own Vite template pins TypeScript ~6.0 and nobody has reported testing it on 7. Rule: try 7. If the shadcn CLI or Vitest config typing fails under 7, pin `typescript` to ~6.0 in `apps/web` and record it.
- **shadcn config:** use `paths` only in tsconfig (no deprecated `baseUrl`), and `import.meta.dirname` in `vite.config.ts`. This follows shadcn's current template and avoids two open warnings.
- **Flagsmith SDK, as documented** (Run an Experiment, React tab):
  - `FlagsmithProvider` from `@flagsmith/flagsmith/react`, with `options={{ environmentID, identity, enableEvents: true }}`.
  - `useExperiment(featureName)` returns the flag, or `null` until flags load. It records one exposure, only when the identity is enrolled in a running experiment.
  - The installed 12.5.0 types say `useExperiment` "Returns the flag (or null) either way". So once flags load, it returns the flag even when no experiment is running. Before the experiment starts, every identity gets the control value (`benefit_copy` has weight 0).
  - `useFlags` reads flags **without** recording exposure.
  - `useFlagsmithLoading()` returns `{ error, isFetching, isLoading, source }`, also with no exposure. It is the "have flags loaded?" signal.
  - `useFlagsmith().trackEvent(event)` records a conversion. Event names are case-sensitive, and unmatched names are silently ignored.
  - `flushEvents()` sends buffered events. It is documented on the JavaScript tab; its types are marked experimental.
  - Branch on `flag.variant` (the variation key: `control`, `benefit_copy`, or `null`), not on `flag.value`.
- **Only after first exposure:** Flagsmith counts only conversions that come after an identity's first exposure.
- **Warehouse:** the Development warehouse is currently Pending Connection. Creating an experiment requires Connected.
- **Env:** `VITE_FLAGSMITH_ENVIRONMENT_KEY` holds the client key only, from `apps/web/.env.local`. The app must still work when it is missing.

## 4. Approaches considered

1. **The landing page is the experiment (chosen).** The CTA is on `/`, so every visitor is exposed and a judge reaches conversion in about a minute. It needs the fewest screens before the experiment works.
2. **Dashboard app shell first.** A sidebar app with the CTA on a Playground page. It feels more like a full product, but the CTA sits one click deep, so it gets fewer exposures. It also means building 4 screens before the experiment works.
3. **Dropped:** per-variant demo pages or local assignment, which break "Flagsmith controls the variant", and LLM-first planning, which the kit rules out until the real experiment works.

## 5. Design

### 5.1 Routes and screens

```
/            Landing: pitch + CTA (Flagsmith) + 3-line "how it works"
/copilot     Step 1 Question → Step 2 Plan (editable) → Step 3 Review & approve → Done
/experiment  Status: identity, variant, SDK/events, Flagsmith config preview (read-only)
```

- **Navigation:** a slim top bar with the FlagPilot wordmark, "Home" and "Experiment status". The copilot is reached through the CTA, and through "Start another plan" on the Done step.
- **Routing:** `react-router` with three routes.
- **Results:** no `/results` route until Phase 3 has real Flagsmith data.

**Landing (`/`)**
- A hero headline and subline (copy is the builder's call), then the CTA button.
- CTA states:
  - Loading (flags not loaded yet): a skeleton the size of the button, no text.
  - Ready: the copy for `flag.variant`.
  - Unavailable (no key, SDK error, or timeout): control copy as the default value. No events are sent.
- **Exposure only for what the visitor sees** (decided while writing this doc): the CTA is two components.
  - An outer gate watches `useFlagsmithLoading()` and records no exposure.
  - An inner exposure component calls `useExperiment` and renders the button text. The gate mounts it **only** if flags load before the timeout (builder picks the value, about 3 s).
  - If the timeout fires first, the gate shows control copy for the rest of that page view and never mounts the inner component, even if flags arrive later. So an exposure can never be recorded for a variant the visitor didn't see, and the copy never flips mid-view.
- **CTA seen:** when the inner component mounts, it records `localStorage['flagpilot.ctaSeenFor'] = visitorId`.
- **On click:** call `trackEvent('flagpilot_primary_cta_clicked')` (skipped when unavailable), then navigate to `/copilot`.

**Copilot (`/copilot`)**
- **Step 1, Question:**
  - Required textarea, 10–500 characters.
  - Optional "What counts as success?" field, up to 200 characters.
  - A suggestion chip prefills the flagship question: "Does benefit-oriented CTA copy increase demo completion?"
- **Step 2, Plan:**
  - Generated with `generatePlan()` (§5.2).
  - Shown as an editable form: title, hypothesis, flag key, the 2 variants (label + description; keys fixed as `control` and the treatment key), primary metric event, diagnostic event, allocation (read-only 50/50).
  - Validation errors show inline.
- **Step 3, Review & approve:**
  - A read-only summary of the plan.
  - Checkbox: "I reviewed this plan".
  - **Approve plan** button, enabled only when the plan is valid and the box is ticked.
- **On approve:**
  1. Call `completeDemo()` (§5.4). It sends `trackEvent('flagpilot_demo_completed')` and then `flushEvents()`, but only if all of these hold:
     - Flagsmith is available;
     - the CTA was seen by this identity (`ctaSeenFor`);
     - this identity has not completed before.

     A flush failure is caught and shown on the status page, never thrown to the user.
  2. Store the approved plan in component state. Nothing is persisted server-side.
  3. Show the Done step.
- **Done step:**
  - "Plan approved".
  - What was recorded: the variant key you saw, the event name, and whether it was sent or skipped. If skipped, say why: "Flagsmith unavailable", "already counted for this visitor", or "not counted: you didn't arrive through the experiment CTA".
  - A link to `/experiment`.
  - "Start another plan". This does **not** send another conversion.

**Experiment status (`/experiment`)**
- **SDK:** client key present (yes/no only, never the value), flags loaded, events enabled.
- **Identity:** a shortened identifier (first 8 characters) and whether it is persistent.
- **Assignment:** `variant` and `experiment.inExperiment`, read through `useFlags`, so no exposure is recorded here.
- **Flagsmith configuration preview:** for the approved plan, or the flagship plan if none, show the exact resources it maps to (flag, variations, metric, experiment allocation) and the CLI steps from §5.6. Label it **"Preview only: applied by the project owner via the Flagsmith CLI after explicit approval. The browser never writes to Flagsmith."**

### 5.2 Deterministic plan generator

`generatePlan(input: PlanInput): ExperimentPlan` is a pure function: the same input always gives the same output. It needs no network and no LLM.

```ts
type PlanInput = { question: string; successAction?: string };

type ExperimentPlan = {
  title: string;
  question: string;
  hypothesis: string;
  flagKey: string;                        // ^[a-z][a-z0-9_]{2,49}$
  variants: [
    { key: 'control'; label: string; description: string },
    { key: string; label: string; description: string }, // treatment, key ≠ 'control'
  ];
  primaryMetric: { event: string; aggregation: 'occurrence'; direction: 'up' };
  diagnosticEvent?: string;               // same regex as event names
  allocation: { control: 50; treatment: 50 };
  risks: string[];                        // e.g. "low traffic → may stay inconclusive"
};
```

- **Templates:** the generator picks a template from keywords in the question: CTA/copy, onboarding, pricing, signup/form, or a generic fallback. Templates fill in title, hypothesis, variant labels, a slugified flag key and metric names.
- **Flagship question:** it must produce exactly the §1 experiment (flag key, variant keys, labels, events).
- **Validation:** `validatePlan(plan): string[]` returns readable errors:
  - required text fields must be non-empty;
  - the flag key and event names must match `^[a-z][a-z0-9_]{2,49}$`;
  - variant keys must be distinct, and the first must be `control`;
  - the allocation must sum to 100.

### 5.3 Identity

`getVisitorId(): { id: string; persistent: boolean }`
- Reads `localStorage['flagpilot.visitorId']`. If that is missing or malformed, it creates `fp_` + `crypto.randomUUID()` and stores it.
- If localStorage is unavailable, it returns an in-memory ID for this page load with `persistent: false`, and the status page says so.
- The same ID goes to `FlagsmithProvider` `options.identity`, so exposure and conversion share one identity.
- No reset button in Phase 2. Minting extra identities by hand would inflate exposures with one person.

### 5.4 Flagsmith integration (`src/lib/flagsmith/`)

- **Constants module (single source of truth):**
  - `FLAG_KEY = 'flagpilot_onboarding_cta'`
  - `EVENTS = { demoCompleted: 'flagpilot_demo_completed', ctaClicked: 'flagpilot_primary_cta_clicked' }`
  - `CTA_COPY = { control: 'Create your first experiment', benefit_copy: 'Launch an experiment in minutes' }`
- **`ctaCopyFor(variant)`:** returns control copy for `control`, `null` or an unknown key. An unknown key also logs one console warning.
- **Provider:** mounted in `main.tsx` only when the env key is present. When it is absent, the app renders a fallback path that calls no SDK hooks, because hooks need the provider. How to split the components is the builder's call; hooks must never be called conditionally.
- **Exposure:** `useExperiment(FLAG_KEY)` is called **only** inside the landing CTA component. Everything else reads with `useFlags`.
- **Conversion helpers:** both are thin wrappers around `trackEvent`, unit-tested with the SDK mocked.
  - `trackCtaClick()`
  - `completeDemo(visitorId)`, which returns `{ sent: boolean; reason?: string }`:
    - It sends only when `ctaSeenFor === visitorId` and `completedFor !== visitorId`.
    - It sets `completedFor` right after `trackEvent`. The SDK buffers events and retries delivery, so a failed flush never causes a second send.
    - Why gate on "CTA seen" (decided while writing this doc): Flagsmith discards conversions sent before the identity's first exposure. Without the gate, a visitor who opened `/copilot` directly would use up their one-time guard on a conversion that never counts.

### 5.5 UI

- **Look:** Tailwind 4 + shadcn/ui primitives (Button, Card, Input, Textarea, Label, Checkbox, Badge, Skeleton, Separator). A restrained, modern look; the details are the builder's call.
- **Must-haves:** keyboard reachable, visible focus, labelled fields, at least AA contrast, and usable at 375 px wide.
- **Rendering:** user text is rendered as text only. No `dangerouslySetInnerHTML`.

### 5.6 Flagsmith resources (Claude session, each step its own owner approval)

The commands come from the official coding-agent guide. The exact `flagsmith api` invocation syntax is checked in the CLI docs before running.

1. **Flag** (approval #1), right after the landing CTA is implemented:
   - `flagsmith feature create flagpilot_onboarding_cta --value control --enabled`
   - `flagsmith feature variant add flagpilot_onboarding_cta --value benefit_copy --key benefit_copy --weight 0`
   - Verify with `flagsmith feature get flagpilot_onboarding_cta --json`.
   - Values equal keys; the display copy lives in code (§5.4).
2. **Metric** (approval #2): `POST api/v1/environments/<env key>/experiment-metrics/` with name "Demo completed", aggregation `occurrence`, direction `up`, event `flagpilot_demo_completed`.
3. **Experiment create** (approval #3), **only when the warehouse is Connected**: `POST …/experiments/` with the flag, name, hypothesis, metric, and 50/50 allocation (`benefit_copy` 50%, control the remainder).
4. **Experiment start** (approval #4): `POST …/experiments/<id>/start/`, then verify the status is `running`.

Each approval request shows the target project/environment (FlagPilot / Development) and the exact command. On any error, stop and report it verbatim.

### 5.7 Testing

- **Unit (Vitest):**
  - identity: persists, reuses, handles malformed values, falls back when storage is unavailable;
  - `generatePlan`: deterministic; the flagship question gives the §1 plan; each template is covered;
  - `validatePlan` rules;
  - `ctaCopyFor`: each variant, `null`, and an unknown key;
  - `EVENTS` exact strings;
  - `completeDemo`: fires once per identity and flushes; a flush error is caught.
- **Component (RTL, `@flagsmith/flagsmith/react` mocked):**
  - CTA shows a skeleton while flags load, then the right copy per variant;
  - after the timeout, the exposure component is never mounted, even when flags arrive later;
  - `demoCompleted` is skipped with a reason when the CTA was not seen, when it was already completed, or when Flagsmith is unavailable;
  - a CTA click sends only `ctaClicked`, never `demoCompleted`;
  - Approve is disabled until the plan is valid and reviewed;
  - approving sends `demoCompleted` once, plus a flush;
  - no `trackEvent` calls when the key is missing;
  - the status page reads through `useFlags`, never `useExperiment`.
- **E2E (Playwright, no Flagsmith key, so no network calls to Flagsmith):** landing → CTA → flagship chip → plan → tick → approve → Done. A test with real Flagsmith is a manual Phase 3 step.
- **Gate:** `npm run lint`, `tsc -b` (part of `npm run build`), `vitest run`, Playwright, and the build all pass before Phase 2 is reported done.

### 5.8 Delegation

Following `docs/MODEL_ROUTING.md`:
- `feature-implementer` (Sonnet) builds each slice;
- `test-engineer` (Sonnet) owns the tests;
- `security-reviewer` (Opus) does one read-only review at the end of Phase 2;
- the main session reviews diffs and runs the CLI steps in §5.6 after approvals;
- `architecture-advisor` (Fable) only if a slice gets stuck.

## 6. Build order (vertical slices)

0. **Prerequisites (already done in Phase 1):** Flagsmith CLI v2 installed and authenticated; project FlagPilot with Development and Production environments; repo bound through `flagsmith.json`. **Still to do:** copy the Development client key from `flagsmith.json` into `apps/web/.env.local` with a script that never prints it.
1. Tooling: Tailwind + shadcn, Vitest + RTL, Playwright, router, and the TS 7/6 check.
2. Identity + Flagsmith constants and helpers (tests first).
3. Landing + CTA with the SDK (mocked tests) → **Flagsmith flag, approval #1**, then check that the real flag loads in the browser.
4. Copilot: generator, validation, editor, approval, Done (tests first).
5. Status page + config preview.
6. **Metric, approval #2.** When the warehouse is Connected: **experiment create, approval #3**, then **start, approval #4**.
7. E2E, full gate, Opus security review, Phase 2 report. Also correct `docs/PHASE_1_REPORT.md` risk 4: create and start are separate API calls.

**Definition of Phase 2 done** (decided while writing this doc): code, tests and the full gate pass, and the flag (#1) and metric (#2) exist in Flagsmith. Experiment create and start (#3 and #4) depend on the warehouse showing Connected, which neither the owner nor the code controls. If the warehouse is still pending at the end of Phase 2, the report says so and #3 and #4 run as soon as it connects, even if that slips into Phase 3. The warehouse status is re-checked at the start of each work session.

## 7. Left to the builder

- Visual styling, hero copy, and the keyword lists per template.
- File layout inside the `docs/FOLDER_STRUCTURE.md` tree.
- The loading timeout value.
- The router API details, which must be checked in the router docs.
- How to split the provider/fallback components.
- Applying the TS 7 → 6 fallback rule in §3.
