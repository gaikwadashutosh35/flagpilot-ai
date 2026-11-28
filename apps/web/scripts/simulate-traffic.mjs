// Simulated traffic for experiment 394 (flag flagpilot_onboarding_cta). Drives the deployed app with
// headless browsers, so assignment, exposure, click and conversion all go through the app and Flagsmith.
// Usage: node apps/web/scripts/simulate-traffic.mjs --count N [--url URL] [--concurrency 1-8] [--dry-run]
// Rates: control converts 0.30, benefit_copy 0.45; half of the non-converters click the CTA and leave.
// Visitor IDs start with fp_5eed5eed so simulated visitors are recognisable. Math.random only drives
// visitor behaviour and IDs, never the variant: that always comes from Flagsmith.
// Live mode waits for Flagsmith's 202 reply to each event POST (and for in-flight event POSTs to
// finish) before closing a visitor's browser, so no event is aborted by the close.
// ALWAYS try --dry-run --url http://localhost:5180 first; live runs need separate owner approval.
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'

export const RATES = { control: 0.3, benefit_copy: 0.45 }
export const CLICK_ONLY = 0.5

const COPY = { control: 'Create your first experiment', benefit_copy: 'Launch an experiment in minutes' }
const FLAG = 'flagpilot_onboarding_cta'
const EXPERIMENT_ID = 394
const EVENTS = 'events.api.flagsmith.com/v1/events'
const DEFAULT_URL = 'https://flagpilot-ai.netlify.app'

export const simId = () => `fp_5eed5eed${randomUUID().slice(8)}`

export function variantFromCta(text) {
  const t = String(text ?? '').trim()
  return Object.keys(COPY).find((k) => COPY[k] === t) ?? null
}

export function decide(variant, r1, r2) {
  if (!Object.hasOwn(RATES, variant)) throw new Error(`unknown variant: ${variant}`)
  if (r1 < RATES[variant]) return 'convert'
  return r2 < CLICK_ONLY ? 'click' : 'leave'
}

export function parseArgs(argv) {
  const out = { count: undefined, url: DEFAULT_URL, concurrency: 4, dryRun: false }
  const int = (name, v, min, max) => {
    if (!/^\d+$/.test(v ?? '') || +v < min || +v > max) throw new Error(`${name} must be an integer ${min}-${max}`)
    return +v
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--count') out.count = int('--count', argv[++i], 1, 500)
    else if (a === '--concurrency') out.concurrency = int('--concurrency', argv[++i], 1, 8)
    else if (a === '--url') out.url = argv[++i]
    else if (a === '--dry-run') out.dryRun = true
    else throw new Error(`unknown argument: ${a}`)
  }
  if (out.count === undefined) throw new Error('--count is required')
  if (!out.url) throw new Error('--url needs a value')
  return out
}

const isFlagsmith = (u) => {
  try {
    const h = new URL(u).hostname
    return h === 'flagsmith.com' || h.endsWith('.flagsmith.com')
  } catch {
    return false
  }
}

const ctaButton = (page) =>
  page.getByRole('button', { name: new RegExp(`^(${Object.values(COPY).join('|')})$`) }).first()

// A reply counts as accepted only for 202 and, if the body is JSON with a `rejected` array, an empty one.
export function isAccepted(status, bodyText) {
  if (status !== 202) return false
  try {
    const rejected = JSON.parse(bodyText)?.rejected
    return !(Array.isArray(rejected) && rejected.length > 0)
  } catch {
    return true
  }
}

// Statuses the Flagsmith SDK retries (after a 1-2 s backoff), so the first such reply is not final.
export const isTransient = (status) => status === 408 || status === 429 || status >= 500

// Resolves true once Flagsmith accepts an events POST whose body contains `needle`, false on timeout or
// a final rejection. Transient replies are skipped so the SDK's retry can still satisfy the waiter.
// Started before the triggering action. accepted counts distinct POSTs (one POST may carry several events).
const eventSeen = (page, needle, stats, timeout = 20000) =>
  page
    .waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        r.url().includes(EVENTS) &&
        (r.request().postData() ?? '').includes(needle) &&
        !isTransient(r.status()),
      { timeout },
    )
    .then(async (r) => {
      const ok = isAccepted(r.status(), await r.text().catch(() => ''))
      if (ok && !stats.seen.has(r.request())) {
        stats.seen.add(r.request())
        stats.accepted++
      }
      return ok
    })
    .catch(() => false)

async function completeDemo(page, live, stats) {
  await page.getByRole('button', { name: 'Does benefit-oriented CTA copy increase demo completion?' }).click()
  await page.getByRole('textbox', { name: 'What counts as success?' }).fill('More visitors finish the demo')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('checkbox', { name: 'I reviewed this plan' }).check()
  const done = live ? eventSeen(page, 'flagpilot_demo_completed', stats) : null
  await page.getByRole('button', { name: 'Approve plan' }).click()
  await page.getByRole('heading', { name: 'Plan approved' }).waitFor()
  return done ? await done : true
}

export async function runVisitor(browser, { url, dryRun, index }, stats = { blocked: 0, accepted: 0, seen: new WeakSet() }) {
  const live = !dryRun
  const context = await browser.newContext()
  try {
    const id = simId()
    await context.addInitScript((v) => localStorage.setItem('flagpilot.visitorId', v), id)
    if (dryRun) {
      await context.route('**/*', (route) => {
        if (isFlagsmith(route.request().url())) {
          stats.blocked++
          return route.abort()
        }
        return route.continue()
      })
    }
    const page = await context.newPage()
    const pending = new Set()
    page.on('request', (r) => r.url().includes(EVENTS) && pending.add(r))
    page.on('requestfinished', (r) => pending.delete(r))
    page.on('requestfailed', (r) => pending.delete(r))
    const run = async () => {
    const identities = live
      ? page.waitForResponse((r) => r.url().includes('/api/v1/identities/'), { timeout: 15000 })
      : null
    identities?.catch(() => {})
    // 35 s: the timer starts before goto and the SDK buffers the exposure until its 10 s flush.
    const exposure = live ? eventSeen(page, '$flag_exposure', stats, 35000) : null

    await page.goto(url)
    const cta = ctaButton(page)
    await cta.waitFor({ timeout: 15000 })
    const variant = variantFromCta(await cta.innerText())
    if (!variant) return { outcome: 'error' }

    if (live) {
      const body = await (await identities).json()
      const flags = Array.isArray(body) ? body : (body?.flags ?? [])
      const flag = flags.find((f) => f?.feature?.name === FLAG)
      const exp = flag?.metadata?.experiment
      if (!(exp?.in_experiment === true && exp?.id === EXPERIMENT_ID)) return { outcome: 'not_in_experiment' }
      if (variant !== flag.feature_state_value) return { outcome: 'mismatch' }
      if (!(await exposure)) return { outcome: 'no_exposure' }
    }

    const action = dryRun ? ['convert', 'click', 'leave'][index % 3] : decide(variant, Math.random(), Math.random())
    if (action === 'leave') return { variant, action }
    const clicked = live ? eventSeen(page, 'flagpilot_primary_cta_clicked', stats) : null
    await cta.click()
    if (action === 'click') {
      if (clicked && !(await clicked)) return { outcome: 'event_failed' }
      return { variant, action }
    }
    const completed = await completeDemo(page, live, stats)
    if (clicked && !(await clicked)) return { outcome: 'event_failed' }
    if (!completed) return { outcome: 'event_failed' }
    return { variant, action }
    }
    const r = await run().catch(() => ({ outcome: 'error' }))
    if (live) {
      // Never close the context while an event POST is still in flight (up to 10 s).
      for (let t = 0; pending.size && t < 10000; t += 100) await page.waitForTimeout(100)
      if (pending.size && !r.outcome) return { outcome: 'event_failed' }
    }
    return r
  } catch {
    return { outcome: 'error' }
  } finally {
    await context.close().catch(() => {})
  }
}

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv)
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch()
  const stats = { blocked: 0, accepted: 0, seen: new WeakSet() }
  const byVariant = { control: { convert: 0, click: 0, leave: 0 }, benefit_copy: { convert: 0, click: 0, leave: 0 } }
  const outcomes = { not_in_experiment: 0, mismatch: 0, no_exposure: 0, event_failed: 0, error: 0 }
  let next = 0
  let streak = 0
  let aborted = false
  const worker = async () => {
    while (!aborted && next < opts.count) {
      const index = next++
      const r = await runVisitor(browser, { ...opts, index }, stats)
      if (r.outcome) outcomes[r.outcome]++
      else byVariant[r.variant][r.action]++
      streak = r.outcome === 'error' ? streak + 1 : 0
      if (streak >= 5) aborted = true
    }
  }
  try {
    await Promise.all(Array.from({ length: opts.concurrency }, worker))
  } finally {
    await browser.close()
  }
  const visitors = Object.values(byVariant).reduce((n, v) => n + v.convert + v.click + v.leave, 0) +
    Object.values(outcomes).reduce((n, v) => n + v, 0)
  const summary = {
    mode: opts.dryRun ? 'dry-run' : 'live',
    url: opts.url,
    visitors,
    byVariant,
    outcomes,
    ...(opts.dryRun ? {} : { eventRepliesAccepted: stats.accepted }),
    ...(opts.dryRun ? { blockedFlagsmithRequests: stats.blocked } : {}),
  }
  console.log(JSON.stringify(summary))
  return aborted || outcomes.error >= visitors * 0.1 ? 1 : 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => process.exit(code),
    (e) => {
      console.error(`simulate failed: ${e?.message ?? 'unknown'}`)
      process.exit(1)
    },
  )
}
