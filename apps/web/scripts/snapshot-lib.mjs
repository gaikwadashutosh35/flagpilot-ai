const ORDER = ['running', 'paused', 'created', 'completed']

export function selectExperiment(list, flagId) {
  const arr = Array.isArray(list) ? list : Array.isArray(list?.results) ? list.results : []
  if (arr.some((e) => !(Number.isInteger(e?.feature) || Number.isInteger(e?.feature?.id)))) throw new Error('unexpected experiment feature')
  const mine = arr.filter((e) => (e?.feature?.id ?? e?.feature) === flagId)
  if (mine.some((e) => !ORDER.includes(e.status))) throw new Error('unexpected experiment status')
  mine.sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || b.id - a.id)
  return mine[0] ?? null
}

export const mapExperiment = (e) => ({
  id: e.id,
  name: e.name,
  status: e.status,
  startedAt: e.started_at ?? null,
  endedAt: e.ended_at ?? null,
})

// Server keys start with "ser."; the lookbehind-style group avoids matching ordinary text such as "user.signup".
const SERVER_KEY = /(^|[^A-Za-z0-9])ser\.[A-Za-z0-9]/
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/
const JWT = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/
const STATUSES = ['created', 'running', 'paused', 'completed']
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/
const isDate = (v) => typeof v === 'string' && ISO.test(v) && !Number.isNaN(Date.parse(v))

export function assertNoServerKey(text) {
  if (SERVER_KEY.test(text)) throw new Error('server key detected')
}

// Deep-walks decoded strings and object keys: rejects server keys (and, with `sensitive`, emails/JWTs)
// and replaces the client key with [ENV_KEY]. Returns a redacted copy.
export function scan(value, clientKey, { sensitive = false } = {}) {
  const str = (s) => {
    assertNoServerKey(s)
    if (sensitive && (EMAIL.test(s) || JWT.test(s))) throw new Error('sensitive value detected')
    return clientKey ? s.split(clientKey).join('[ENV_KEY]') : s
  }
  const walk = (v) =>
    typeof v === 'string'
      ? str(v)
      : Array.isArray(v)
        ? v.map(walk)
        : v && typeof v === 'object'
          ? Object.fromEntries(Object.entries(v).map(([k, x]) => [str(k), walk(x)]))
          : v
  return walk(value)
}

export function validateExperiment(detail, found) {
  const bad = () => new Error('unexpected experiment detail')
  const ok = (e) => e && typeof e === 'object' && Number.isInteger(e.id) && e.id > 0
  if (!ok(found) || !ok(detail) || detail.id !== found.id) throw bad()
  const e = mapExperiment(detail)
  const nullableDate = (v) => v === null || isDate(v)
  if (typeof e.name !== 'string' || !STATUSES.includes(e.status) || !nullableDate(e.startedAt) || !nullableDate(e.endedAt)) throw bad()
  return e
}

export const isEnvKey = (k) => typeof k === 'string' && /^[A-Za-z0-9_-]{10,64}$/.test(k) && !k.startsWith('ser.')

const bad = () => new Error('unexpected results body')
const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v) => (Number.isFinite(v) ? v : (() => { throw bad() })())
const prob = (v) => (num(v) >= 0 && v <= 1 ? v : (() => { throw bad() })())
const count = (v) => (Number.isInteger(v) && v >= 0 ? v : (() => { throw bad() })())
const asOf = (v) => (v === null || isDate(v) ? v : (() => { throw bad() })())
const METRIC_ID = 319
const VARIANTS = ['control', 'benefit_copy']
const onlyVariants = (o) => (Object.keys(o).every((k) => VARIANTS.includes(k)) ? o : (() => { throw bad() })())
const inner = (body, key) => {
  if (!isObj(body) || !isObj(body[key])) throw bad()
  return body[key]
}

// Allowlisted projection: keeps only the fields the results page reads (metric 319, known variants); everything else is dropped.
export function projectResults(body) {
  if (body === null) return null
  const r = inner(body, 'results')
  if (typeof r.is_final !== 'boolean') throw bad()
  const out = { as_of: asOf(r.as_of), is_final: r.is_final, payload: null }
  if (r.payload === null) return out
  const p = r.payload
  if (!isObj(p) || !Array.isArray(p.metrics)) throw bad()
  if (p.srm_p_value !== null) num(p.srm_p_value)
  if (p.metrics.some((m) => !isObj(m) || !Number.isInteger(m.metric_id))) throw bad()
  const mine = p.metrics.filter((m) => m.metric_id === METRIC_ID)
  if (mine.length !== 1) throw bad()
  out.payload = {
    srm_p_value: p.srm_p_value,
    metrics: mine.map((m) => {
      if (!isObj(m.variants) || !isObj(m.inference)) throw bad()
      return {
        metric_id: m.metric_id,
        variants: Object.fromEntries(
          Object.entries(onlyVariants(m.variants)).map(([k, v]) => {
            if (!isObj(v)) throw bad()
            return [k, { n: count(v.n), sum: count(v.sum) }]
          }),
        ),
        inference: Object.fromEntries(
          Object.entries(onlyVariants(m.inference)).map(([k, v]) => {
            if (v === null) return [k, null]
            if (!isObj(v)) throw bad()
            return [k, { lift: num(v.lift), ci_low: num(v.ci_low), ci_high: num(v.ci_high), chance_to_win: prob(v.chance_to_win) }]
          }),
        ),
      }
    }),
  }
  return out
}

export function projectExposures(body) {
  if (body === null) return null
  const e = inner(body, 'exposures')
  if (e.payload === null) return { as_of: asOf(e.as_of), excluded_identities: null }
  if (!isObj(e.payload)) throw bad()
  return { as_of: asOf(e.as_of), excluded_identities: num(e.payload.excluded_identities) }
}

export const buildSnapshot = ({ experiment, exposures, results, capturedAt }) => ({
  schemaVersion: 1,
  capturedAt,
  experiment,
  exposures,
  results,
})
