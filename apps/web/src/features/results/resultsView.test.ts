import { describe, expect, it } from 'vitest'
import { fmtChance, fmtInterval, fmtLift, fmtRate, readResults, verdict, type ResultsView } from './resultsView'

const inf = { lift: 0.1, ci_low: 0.02, ci_high: 0.2, chance_to_win: 0.97 }
const mk = (variants: Record<string, unknown>, inference: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  as_of: '2026-11-27T16:51:16.295297Z',
  is_final: false,
  payload: { srm_p_value: null, metrics: [{ metric_id: 319, variants, inference }], ...extra },
})
const today = () => mk({ benefit_copy: { n: 1, sum: 1 } }, { benefit_copy: null })
const view = (r: unknown) => readResults(r) as ResultsView
const full = (c = { n: 100, sum: 10 }, b = { n: 100, sum: 20 }, i: unknown = inf) =>
  view(mk({ control: c, benefit_copy: b }, { benefit_copy: i }))

describe('readResults', () => {
  it("today's data", () => {
    const v = view(today())
    expect(v.control).toEqual({})
    expect(v.benefit_copy).toEqual({ n: 1, sum: 1 })
    expect(v.srmPValue).toBeNull()
    expect(v.isFinal).toBe(false)
    expect(verdict(v)).toBe('Collecting data')
  })
  it('pending when payload is null', () => {
    expect(readResults({ as_of: null, is_final: false, payload: null })).toBe('pending')
  })
  it('null when unrecognised', () => {
    expect(readResults({ results: today() })).toBeNull() // raw, unprojected wrapper
    expect(readResults(null)).toBeNull()
    expect(readResults({ ...today(), payload: { srm_p_value: null, metrics: [{ metric_id: 1, variants: {}, inference: {} }] } })).toBeNull()
    expect(readResults(mk({ benefit_copy: { n: '1', sum: 1 } }, { benefit_copy: null }))).toBeNull()
    expect(readResults(mk({ benefit_copy: { n: 1, sum: 1 } }, { benefit_copy: { lift: 1 } }))).toBeNull()
  })
})

describe('verdict', () => {
  it('collecting data without inference', () => expect(verdict(full(undefined, undefined, null))).toBe('Collecting data'))
  it('data gate boundaries', () => {
    expect(verdict(full({ n: 50, sum: 5 }, { n: 50, sum: 5 }))).toBe('Leading: benefit_copy')
    expect(verdict(full({ n: 49, sum: 5 }))).toBe('Collecting data')
    expect(verdict(full({ n: 50, sum: 4 }))).toBe('Collecting data')
    expect(verdict(full(undefined, { n: 49, sum: 9 }))).toBe('Collecting data')
  })
  it('inconclusive when the interval crosses or touches zero', () => {
    expect(verdict(full(undefined, undefined, { ...inf, ci_low: -0.021, ci_high: 0.084 }))).toBe('Inconclusive')
    expect(verdict(full(undefined, undefined, { ...inf, ci_low: 0 }))).toBe('Inconclusive')
  })
  it('leading benefit_copy', () => expect(verdict(full())).toBe('Leading: benefit_copy'))
  it('leading control', () =>
    expect(verdict(full(undefined, undefined, { lift: -0.1, ci_low: -0.2, ci_high: -0.02, chance_to_win: 0.03 }))).toBe('Leading: control'))
  it('inconclusive below 95%', () => expect(verdict(full(undefined, undefined, { ...inf, chance_to_win: 0.9 }))).toBe('Inconclusive'))
})

describe('formatters', () => {
  it('match Flagsmith UI', () => {
    expect(fmtLift(0.123)).toBe('+12.3%')
    expect(fmtLift(-0.02)).toBe('-2.0%')
    expect(fmtInterval(-0.021, 0.084)).toBe('[-2.1%, 8.4%]')
    expect(fmtChance(0.97)).toBe('97%')
    expect(fmtRate(1, 1)).toBe('100.0%')
    expect(fmtRate(undefined, undefined)).toBe('—')
    expect(fmtRate(0, 0)).toBe('—')
    expect(fmtLift(undefined)).toBe('—')
  })
})
