// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { assertNoServerKey, buildSnapshot, mapExperiment, redact, selectExperiment } from './snapshot-lib.mjs'
import { run } from './snapshot-results.mjs'

const exps = [
  { id: 1, feature: 9, status: 'completed' },
  { id: 2, feature: 299210, status: 'created' },
  { id: 3, feature: 299210, status: 'running' },
]

describe('snapshot-lib', () => {
  it('selects from a bare array and from {results}', () => {
    expect(selectExperiment(exps, 299210).id).toBe(3)
    expect(selectExperiment({ results: exps }, 299210).id).toBe(3)
  })
  it('returns null for empty lists or other flags only', () => {
    expect(selectExperiment([], 299210)).toBeNull()
    expect(selectExperiment({ results: [{ id: 1, feature: 9, status: 'running' }] }, 299210)).toBeNull()
  })
  it('prefers running > paused > created > completed', () => {
    const mk = (...s) => s.map((status, i) => ({ id: i + 1, feature: 5, status }))
    expect(selectExperiment(mk('completed', 'created', 'paused', 'running'), 5).status).toBe('running')
    expect(selectExperiment(mk('completed', 'created', 'paused'), 5).status).toBe('paused')
    expect(selectExperiment(mk('completed', 'created'), 5).status).toBe('created')
    expect(selectExperiment(mk('completed'), 5).status).toBe('completed')
  })
  it('maps snake_case experiment fields', () => {
    expect(mapExperiment({ id: 7, name: 'n', status: 'running', started_at: 'a', ended_at: null, hypothesis: 'h' })).toEqual({
      id: 7, name: 'n', status: 'running', startedAt: 'a', endedAt: null,
    })
  })
  it('redacts every client key occurrence', () => {
    expect(redact('k=ABC and ABC', 'ABC')).toBe('k=[ENV_KEY] and [ENV_KEY]')
  })
  it('throws on a server key but not on ordinary text', () => {
    expect(() => assertNoServerKey('{"k":"ser.abc"}')).toThrow('server key detected')
    expect(() => assertNoServerKey('{"e":"user.signup"}')).not.toThrow()
  })
  it('buildSnapshot with nothing gives the all-null snapshot', () => {
    expect(buildSnapshot({ experiment: null, exposures: null, results: null, capturedAt: null })).toEqual({
      schemaVersion: 1, capturedAt: null, experiment: null, exposures: null, results: null,
    })
  })
})

describe('run', () => {
  const base = () => ({
    readFile: vi.fn(async () => '{"environment":"ENVKEY"}'),
    writeFile: vi.fn(async () => {}),
    rename: vi.fn(async () => {}),
    now: () => new Date('2026-11-22T00:00:00.000Z'),
    sleep: vi.fn(async () => {}),
  })
  it('writes nothing and rejects when a CLI call fails', async () => {
    const d = base()
    d.exec = vi.fn(async (args) => {
      if (args[0] === 'feature') return '{"id":299210}'
      throw new Error('cli call failed')
    })
    await expect(run(d)).rejects.toThrow()
    expect(d.writeFile).not.toHaveBeenCalled()
    expect(d.rename).not.toHaveBeenCalled()
  })
  it('writes the all-null snapshot when there is no experiment', async () => {
    const d = base()
    d.exec = vi.fn(async (args) => (args[0] === 'feature' ? '{"id":299210}' : '[]'))
    const line = await run(d)
    expect(line).toBe('no experiment')
    expect(d.writeFile.mock.calls[0][1]).toBe(
      '{\n  "schemaVersion": 1,\n  "capturedAt": null,\n  "experiment": null,\n  "exposures": null,\n  "results": null\n}\n',
    )
    expect(d.rename).toHaveBeenCalledTimes(1)
  })
  it('captures an experiment, refreshes on request, and redacts the client key', async () => {
    const d = base()
    d.refresh = true
    d.exec = vi.fn(async (args) => {
      if (args[0] === 'feature') return '{"id":299210}'
      const p = args[1]
      if (p.endsWith('/experiments/')) return '{"results":[{"id":3,"feature":299210,"status":"running"}]}'
      if (p.endsWith('/3/')) return '{"id":3,"name":"n","status":"running","started_at":"2026-11-21T00:00:00Z","ended_at":null}'
      if (p.endsWith('/exposures/')) return '{"note":"ENVKEY"}'
      if (p.endsWith('/results/')) return 'null'
      return ''
    })
    const line = await run(d)
    expect(line).toBe('experiment 3 running; results null; captured 2026-11-22T00:00:00.000Z')
    expect(d.sleep).toHaveBeenCalledWith(60000)
    expect(d.exec.mock.calls.filter((c) => c[0][2] === '-X')).toHaveLength(2)
    const written = d.writeFile.mock.calls[0][1]
    expect(written).not.toContain('ENVKEY')
    expect(JSON.parse(written).exposures).toEqual({ note: '[ENV_KEY]' })
  })
  const found = (d, postFails) => {
    d.exec = vi.fn(async (args) => {
      if (args[0] === 'feature') return '{"id":299210}'
      if (args[2] === '-X') {
        if (postFails) throw new Error('cli call failed')
        return ''
      }
      const p = args[1]
      if (p.endsWith('/experiments/')) return '[{"id":3,"feature":299210,"status":"running"}]'
      if (p.endsWith('/3/')) return '{"id":3,"name":"n","status":"running","started_at":null,"ended_at":null}'
      return 'null'
    })
  }
  it('continues and says so when a refresh POST is refused', async () => {
    const d = base()
    d.refresh = true
    found(d, true)
    const line = await run(d)
    expect(line).toMatch(/; refresh refused$/)
    expect(d.writeFile).toHaveBeenCalledTimes(1)
  })
  it('makes no POSTs and does not sleep without --refresh', async () => {
    const d = base()
    found(d, false)
    const line = await run(d)
    expect(line).not.toContain('refresh refused')
    expect(d.exec.mock.calls.filter((c) => c[0][2] === '-X')).toHaveLength(0)
    expect(d.sleep).not.toHaveBeenCalled()
  })
  it.each([
    ['{"environment":"FAKEKEY123" oops', 'FAKEKEY123'],
    ['{"environment":""}', 'environment'],
    ['{"project":1}', 'project'],
    ['{"environment":42}', '42'],
  ])('rejects invalid flagsmith.json without echoing it (%s)', async (content, leak) => {
    const d = base()
    d.readFile = vi.fn(async () => content)
    d.exec = vi.fn()
    const err = await run(d).catch((e) => e)
    expect(err.message).toBe('invalid flagsmith.json')
    expect(err.message).not.toContain(leak)
    expect(d.exec).not.toHaveBeenCalled()
  })
  it('rejects on a server key in a response', async () => {
    const d = base()
    d.exec = vi.fn(async (args) => (args[0] === 'feature' ? '{"id":1}' : '{"x":"ser.abc"}'))
    await expect(run(d)).rejects.toThrow('server key detected')
    expect(d.writeFile).not.toHaveBeenCalled()
  })
})
