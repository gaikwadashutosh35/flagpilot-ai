// Simulated traffic for experiment 394 (flag flagpilot_onboarding_cta). Drives the deployed app with
// headless browsers, so assignment, exposure, click and conversion all go through the app and Flagsmith.
// Usage: node apps/web/scripts/simulate-traffic.mjs --count N [--url URL] [--concurrency 1-8] [--dry-run]
// Rates: control converts 0.30, benefit_copy 0.45; half of the non-converters click the CTA and leave.
// Visitor IDs start with fp_5eed5eed so simulated visitors are recognisable. Math.random only drives
// visitor behaviour and IDs, never the variant: that always comes from Flagsmith.
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

// Waits for an events POST whose body contains `needle`. Started before the triggering action.
const eventSeen = (page, needle) => {
  const p = page.waitForRequest((r) => r.method() === 'POST' && r.url().includes(EVENTS) && (r.postData() ?? '').includes(needle), {
    timeout: 20000,
  })
  p.catch(() => {})
  return p
}

async function completeDemo(page, live) {
  await page.getByRole('button', { name: 'Does benefit-oriented CTA copy increase demo completion?' }).click()
  await page.getByRole('textbox', { name: 'What counts as success?' }).fill('More visitors finish the demo')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('checkbox', { name: 'I reviewed this plan' }).check()
  const done = live ? eventSeen(page, 'flagpilot_demo_completed') : null
  await page.getByRole('button', { name: 'Approve plan' }).click()
  await page.getByRole('heading', { name: 'Plan approved' }).waitFor()
  if (done) await done
}

export async function runVisitor(browser, { url, dryRun, index }, stats = { blocked: 0 }) {
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
    const identities = live
      ? page.waitForResponse((r) => r.url().includes('/api/v1/identities/'), { timeout: 15000 })
      : null
    identities?.catch(() => {})
    const exposure = live ? eventSeen(page, '$flag_exposure') : null

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
      try {
        await exposure
      } catch {
        return { outcome: 'no_exposure' }
      }
    }

    const action = dryRun ? ['convert', 'click', 'leave'][index % 3] : decide(variant, Math.random(), Math.random())
    if (action === 'leave') return { variant, action }
    const clicked = live ? eventSeen(page, 'flagpilot_primary_cta_clicked') : null
    await cta.click()
    if (action === 'click') {
      if (clicked) await clicked
      return { variant, action }
    }
    await completeDemo(page, live)
    return { variant, action }
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
  const stats = { blocked: 0 }
  const byVariant = { control: { convert: 0, click: 0, leave: 0 }, benefit_copy: { convert: 0, click: 0, leave: 0 } }
  const outcomes = { not_in_experiment: 0, mismatch: 0, no_exposure: 0, error: 0 }
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
