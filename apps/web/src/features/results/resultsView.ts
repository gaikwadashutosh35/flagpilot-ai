const METRIC_ID = 319
const KEYS = ['control', 'benefit_copy'] as const
type Key = (typeof KEYS)[number]
const AS_OF = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/

export type Inference = { lift: number; ci_low: number; ci_high: number; chance_to_win: number }
export type Arm = { n?: number; sum?: number; inference?: Inference }
export type ResultsView = { control: Arm; benefit_copy: Arm; srmPValue: number | null; isFinal: boolean; asOf: string | null }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0
const onlyKeys = (o: Record<string, unknown>) => Object.keys(o).every((k) => (KEYS as readonly string[]).includes(k))
const isInference = (v: unknown): v is Inference =>
  isObj(v) && isNum(v.lift) && isNum(v.ci_low) && isNum(v.ci_high) && isNum(v.chance_to_win) && v.chance_to_win >= 0 && v.chance_to_win <= 1

// Same validation as the snapshot script's projection; anything else is "unrecognised" (null).
export function readResults(results: unknown): ResultsView | 'pending' | null {
  if (!isObj(results) || typeof results.is_final !== 'boolean') return null
  const asOf = results.as_of
  if (!(asOf === null || (typeof asOf === 'string' && AS_OF.test(asOf) && !Number.isNaN(Date.parse(asOf))))) return null
  if (results.payload === null) return 'pending'
  const p = results.payload
  if (!isObj(p) || !Array.isArray(p.metrics) || !(p.srm_p_value === null || isNum(p.srm_p_value))) return null
  if (p.metrics.some((m) => !isObj(m) || !Number.isInteger(m.metric_id))) return null
  const mine = (p.metrics as Record<string, unknown>[]).filter((m) => m.metric_id === METRIC_ID)
  if (mine.length !== 1) return null
  const found = mine[0]
  if (!isObj(found.variants) || !isObj(found.inference) || !onlyKeys(found.variants) || !onlyKeys(found.inference)) return null
  if (!Object.values(found.variants).every((v) => isObj(v) && isCount(v.n) && isCount(v.sum))) return null
  if (!Object.values(found.inference).every((v) => v === null || isInference(v))) return null
  const variants = found.variants as Record<string, { n: number; sum: number }>
  const inference = found.inference as Record<string, Inference | null>
  const arm = (k: Key): Arm => {
    const a: Arm = {}
    if (variants[k]) ({ n: a.n, sum: a.sum } = variants[k])
    if (inference[k]) a.inference = inference[k]!
    return a
  }
  return { control: arm('control'), benefit_copy: arm('benefit_copy'), srmPValue: p.srm_p_value as number | null, isFinal: results.is_final, asOf }
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
// Rounds toward 50% so the shown number never overstates confidence: 95.0% or less is never shown next to "Leading".
export function fmtChance(c?: number): string {
  if (c === undefined) return DASH
  if (c >= 0.9995) return '>99.9%'
  if (c <= 0.0005) return '<0.1%'
  const t = Math.round(c * 1e6) / 1e3 // thousandths, with float noise removed
  const shown = c > 0.5 ? Math.floor(t) / 10 : c < 0.5 ? Math.ceil(t) / 10 : 50
  if (c > 0.95 && shown <= 95) return '>95.0%'
  if (c < 0.05 && shown >= 5) return '<5.0%'
  return `${shown.toFixed(1)}%`
}
