const ORDER = ['running', 'paused', 'created', 'completed']

export function selectExperiment(list, flagId) {
  const arr = Array.isArray(list) ? list : Array.isArray(list?.results) ? list.results : []
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
const isDate = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v))

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

export const isBody = (b) => b === null || typeof b === 'object'

export const buildSnapshot = ({ experiment, exposures, results, capturedAt }) => ({
  schemaVersion: 1,
  capturedAt,
  experiment,
  exposures,
  results,
})
