export type ExperimentStatus = 'created' | 'running' | 'paused' | 'completed'
export type Snapshot = {
  schemaVersion: 1
  capturedAt: string | null
  experiment: null | {
    id: number
    name: string
    status: ExperimentStatus
    startedAt: string | null
    endedAt: string | null
  }
  exposures: unknown
  results: unknown
}
export type LoadedSnapshot = { ok: true; snapshot: Snapshot } | { ok: false }

const STATUSES = ['created', 'running', 'paused', 'completed']
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isDate = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v))
const nullableDate = (v: unknown) => v === null || isDate(v)

export function loadSnapshot(raw: unknown): LoadedSnapshot {
  if (!isObj(raw) || raw.schemaVersion !== 1 || !nullableDate(raw.capturedAt)) return { ok: false }
  const e = raw.experiment
  if (e !== null) {
    if (
      !isObj(e) ||
      typeof e.id !== 'number' ||
      typeof e.name !== 'string' ||
      !STATUSES.includes(e.status as string) ||
      !nullableDate(e.startedAt) ||
      !nullableDate(e.endedAt) ||
      raw.capturedAt === null
    ) {
      return { ok: false }
    }
  }
  return { ok: true, snapshot: raw as Snapshot }
}
