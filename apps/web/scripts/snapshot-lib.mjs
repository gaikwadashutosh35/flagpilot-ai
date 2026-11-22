const ORDER = ['running', 'paused', 'created', 'completed']

export function selectExperiment(list, flagId) {
  const arr = Array.isArray(list) ? list : Array.isArray(list?.results) ? list.results : []
  const mine = arr.filter((e) => e?.feature === flagId && ORDER.includes(e.status))
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

export const redact = (text, clientKey) => (clientKey ? text.split(clientKey).join('[ENV_KEY]') : text)

// Server keys start with "ser."; \b avoids matching ordinary text such as "user.signup".
export function assertNoServerKey(text) {
  if (/\bser\.[A-Za-z0-9]/.test(text)) throw new Error('server key detected')
}

export const buildSnapshot = ({ experiment, exposures, results, capturedAt }) => ({
  schemaVersion: 1,
  capturedAt,
  experiment,
  exposures,
  results,
})
