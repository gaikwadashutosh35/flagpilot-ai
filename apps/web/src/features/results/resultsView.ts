const METRIC_ID = 319
const KEYS = ['control', 'benefit_copy'] as const
type Key = (typeof KEYS)[number]

export type Inference = { lift: number; ci_low: number; ci_high: number; chance_to_win: number }
export type Arm = { n?: number; sum?: number; inference?: Inference }
export type ResultsView = { control: Arm; benefit_copy: Arm; srmPValue: number | null; isFinal: boolean }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isInference = (v: unknown): v is Inference =>
  isObj(v) && isNum(v.lift) && isNum(v.ci_low) && isNum(v.ci_high) && isNum(v.chance_to_win)

// Same validation as the snapshot script's projection; anything else is "unrecognised" (null).
export function readResults(results: unknown): ResultsView | 'pending' | null {
  if (!isObj(results) || typeof results.is_final !== 'boolean') return null
  if (results.payload === null) return 'pending'
  const p = results.payload
  if (!isObj(p) || !Array.isArray(p.metrics) || !(p.srm_p_value === null || isNum(p.srm_p_value))) return null
  let found: Record<string, unknown> | undefined
  for (const m of p.metrics) {
    if (!isObj(m) || !Number.isInteger(m.metric_id) || !isObj(m.variants) || !isObj(m.inference)) return null
    if (!Object.values(m.variants).every((v) => isObj(v) && isNum(v.n) && isNum(v.sum))) return null
    if (!Object.values(m.inference).every((v) => v === null || isInference(v))) return null
    if (m.metric_id === METRIC_ID) found = m
  }
  if (!found) return null
  const variants = found.variants as Record<string, { n: number; sum: number }>
  const inference = found.inference as Record<string, Inference | null>
  const arm = (k: Key): Arm => {
    const a: Arm = {}
    if (variants[k]) ({ n: a.n, sum: a.sum } = variants[k])
    if (inference[k]) a.inference = inference[k]!
    return a
  }
  return { control: arm('control'), benefit_copy: arm('benefit_copy'), srmPValue: p.srm_p_value as number | null, isFinal: results.is_final }
}

// Verdict thresholds per the owner-approved spec amendment (2026-11-28).
export function verdict(v: ResultsView): string {
  const inf = v.benefit_copy.inference
  const thin = (a: Arm) => (a.n ?? 0) < 50 || (a.sum ?? 0) < 5
  if (thin(v.control) || thin(v.benefit_copy) || !inf) return 'Collecting data'
  if (inf.ci_low <= 0 && inf.ci_high >= 0) return 'Inconclusive'
  if (inf.chance_to_win > 0.95) return 'Leading: benefit_copy'
  if (1 - inf.chance_to_win > 0.95) return 'Leading: control'
  return 'Inconclusive'
}

const DASH = '—'
const pct = (x: number) => `${(x * 100).toFixed(1)}%`
export const fmtRate = (sum?: number, n?: number) => (sum === undefined || !n ? DASH : pct(sum / n))
export const fmtLift = (lift?: number) => (lift === undefined ? DASH : `${lift >= 0 ? '+' : ''}${pct(lift)}`)
export const fmtInterval = (lo?: number, hi?: number) => (lo === undefined || hi === undefined ? DASH : `[${pct(lo)}, ${pct(hi)}]`)
export const fmtChance = (c?: number) => (c === undefined ? DASH : `${Math.round(c * 100)}%`)
