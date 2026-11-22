import { describe, expect, it } from 'vitest'
import { loadSnapshot } from './loadSnapshot'

const base = { schemaVersion: 1, capturedAt: null, experiment: null, exposures: null, results: null }
const exp = (status: string) => ({ id: 1, name: 'x', status, startedAt: null, endedAt: null })

describe('loadSnapshot', () => {
  it('accepts the committed all-null snapshot', () => {
    expect(loadSnapshot(base)).toEqual({ ok: true, snapshot: expect.objectContaining({ experiment: null }) })
  })

  it.each(['created', 'running', 'paused', 'completed'])('accepts status %s with capturedAt', (s) => {
    const r = loadSnapshot({ ...base, capturedAt: '2026-11-23T10:00:00Z', experiment: exp(s) })
    expect(r.ok).toBe(true)
  })

  it.each([
    ['bad schemaVersion', { ...base, schemaVersion: 2 }],
    ['unknown status', { ...base, capturedAt: '2026-11-23T10:00:00Z', experiment: exp('draft') }],
    ['experiment without capturedAt', { ...base, experiment: exp('running') }],
    ['invalid capturedAt', { ...base, capturedAt: 'yesterday' }],
    ['experiment not an object', { ...base, capturedAt: '2026-11-23T10:00:00Z', experiment: 'x' }],
    ['not an object', null],
  ])('rejects %s', (_n, raw) => {
    expect(loadSnapshot(raw)).toEqual({ ok: false })
  })
})
