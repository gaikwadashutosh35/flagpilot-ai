// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { loadSnapshot } from '../src/features/results/loadSnapshot.ts'
import { assertNoServerKey, buildSnapshot, mapExperiment, scan, selectExperiment } from './snapshot-lib.mjs'
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
  it('selects nested-object feature items and still integer ones', () => {
    const nested = [{ id: 4, feature: { id: 299210, name: 'f' }, status: 'running' }]
    expect(selectExperiment(nested, 299210).id).toBe(4)
    expect(selectExperiment([{ id: 5, feature: 299210, status: 'running' }], 299210).id).toBe(5)
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
  it('redacts every client key occurrence in decoded strings and keys', () => {
    expect(scan({ a: 'k=ABC and ABC', ABC: ['ABC'] }, 'ABC')).toEqual({
      a: 'k=[ENV_KEY] and [ENV_KEY]',
      '[ENV_KEY]': ['[ENV_KEY]'],
    })
    expect(scan(JSON.parse('{"a":"\\u0041BC"}'), 'ABC')).toEqual({ a: '[ENV_KEY]' })
  })
  it('throws on a server key but not on ordinary text', () => {
    expect(() => assertNoServerKey('{"k":"ser.abc"}')).toThrow('server key detected')
    expect(() => assertNoServerKey('{"e":"user.signup"}')).not.toThrow()
  })
  it('catches escaped and newline-preceded server keys after decoding', () => {
    expect(() => scan(JSON.parse('{"a":"\\u0073er.abc"}'), 'K')).toThrow('server key detected')
    expect(() => scan(JSON.parse('{"a":"line\\nser.abc"}'), 'K')).toThrow('server key detected')
    expect(() => scan({ 'ser.abc': 1 }, 'K')).toThrow('server key detected')
    expect(() => scan({ a: 'user.signup' }, 'K')).not.toThrow()
  })
  it('rejects emails and JWTs only when sensitive', () => {
    expect(() => scan({ a: 'x@y.com' }, 'K', { sensitive: true })).toThrow('sensitive value detected')
    expect(() => scan({ a: 'eyJhbGciOiJI.eyJzdWIiOiIx' }, 'K', { sensitive: true })).toThrow('sensitive value detected')
    expect(() => scan({ a: 'x@y.com' }, 'K')).not.toThrow()
  })
  it('buildSnapshot with nothing gives the all-null snapshot', () => {
    expect(buildSnapshot({ experiment: null, exposures: null, results: null, capturedAt: null })).toEqual({
      schemaVersion: 1, capturedAt: null, experiment: null, exposures: null, results: null,
    })
  })
})

describe('run', () => {
  const base = () => ({
    readFile: vi.fn(async () => '{"environment":"ENVKEY1234"}'),
    writeFile: vi.fn(async () => {}),
    rename: vi.fn(async () => {}),
    rm: vi.fn(async () => {}),
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
    expect(line).toBe('no experiment (0 listed)')
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
      if (p.endsWith('/experiments/')) return '{"results":[{"id":3,"feature":{"id":299210},"status":"running"}],"next":null}'
      if (p.endsWith('/3/')) return '{"id":3,"name":"n","status":"running","started_at":"2026-11-21T00:00:00Z","ended_at":null}'
      if (p.endsWith('/exposures/')) return '{"note":"ENVKEY1234"}'
      if (p.endsWith('/results/')) return 'null'
      return ''
    })
    const line = await run(d)
    expect(line).toBe('experiment 3 running; results null; captured 2026-11-22T00:00:00.000Z')
    expect(d.sleep).toHaveBeenCalledWith(60000)
    expect(d.exec.mock.calls.filter((c) => c[0][2] === '-X')).toHaveLength(2)
    const written = d.writeFile.mock.calls[0][1]
    expect(written).not.toContain('ENVKEY1234')
    expect(JSON.parse(written).exposures).toEqual({ note: '[ENV_KEY]' })
    expect(loadSnapshot(JSON.parse(written)).ok).toBe(true)
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
  it('continues and says so when a refresh POST fails', async () => {
    const d = base()
    d.refresh = true
    found(d, true)
    const line = await run(d)
    expect(line).toMatch(/; refresh failed$/)
    expect(d.writeFile).toHaveBeenCalledTimes(1)
  })
  it('skips the wait when both refresh POSTs failed', async () => {
    const d = base()
    d.refresh = true
    found(d, true)
    await run(d)
    expect(d.sleep).not.toHaveBeenCalled()
  })
  it('makes no POSTs and does not sleep without --refresh', async () => {
    const d = base()
    found(d, false)
    const line = await run(d)
    expect(line).not.toContain('refresh failed')
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
  it.each(['ABC', 'ser.abcdefghijk', 'a'.repeat(65), 'has space1234'])('rejects flagsmith.json environment %s', async (env) => {
    const d = base()
    d.readFile = vi.fn(async () => JSON.stringify({ environment: env }))
    d.exec = vi.fn()
    await expect(run(d)).rejects.toThrow('invalid flagsmith.json')
  })
  it('rejects on a server key in a response', async () => {
    const d = base()
    d.exec = vi.fn(async (args) => (args[0] === 'feature' ? '{"id":1}' : '{"x":"ser.abc"}'))
    await expect(run(d)).rejects.toThrow('server key detected')
    expect(d.writeFile).not.toHaveBeenCalled()
  })

  const listed =
    (extra = {}) =>
    (args) => {
      if (args[0] === 'feature') return '{"id":299210}'
      const p = args[1]
      if (p.endsWith('/experiments/')) return '[{"id":3,"feature":{"id":299210},"status":"running"}]'
      if (p.endsWith('/3/'))
        return JSON.stringify({ id: 3, name: 'n', status: 'running', started_at: null, ended_at: null, ...extra.detail })
      if (p.endsWith('/exposures/')) return extra.exposures ?? 'null'
      if (p.endsWith('/results/')) return extra.results ?? 'null'
      return 'null'
    }
  it.each([
    ['null/empty', ''],
    ['detail object', '{"detail":"x"}'],
    ['a string', '"x"'],
  ])('throws on an unexpected experiments list (%s)', async (_n, body) => {
    const d = base()
    d.exec = vi.fn(async (args) => (args[0] === 'feature' ? '{"id":299210}' : body))
    await expect(run(d)).rejects.toThrow('unexpected experiments list')
    expect(d.writeFile).not.toHaveBeenCalled()
  })
  it('throws when the list is paginated', async () => {
    const d = base()
    d.exec = vi.fn(async (args) => (args[0] === 'feature' ? '{"id":299210}' : '{"results":[],"next":"u"}'))
    await expect(run(d)).rejects.toThrow('experiments list is paginated')
    expect(d.writeFile).not.toHaveBeenCalled()
  })
  it.each([
    ['id mismatch', { id: 4 }],
    ['non-string name', { name: 5 }],
    ['bad status', { status: 'weird' }],
    ['bad date', { started_at: 'not a date' }],
  ])('rejects an invalid experiment detail (%s)', async (_n, detail) => {
    const d = base()
    d.exec = vi.fn(async (args) => listed({ detail })(args))
    await expect(run(d)).rejects.toThrow('unexpected experiment detail')
    expect(d.writeFile).not.toHaveBeenCalled()
  })
  it('rejects a non-integer experiment id from the list', async () => {
    const d = base()
    d.exec = vi.fn(async (args) =>
      args[1]?.endsWith('/experiments/') ? '[{"id":"../x","feature":299210,"status":"running"}]' : listed()(args),
    )
    await expect(run(d)).rejects.toThrow('unexpected experiment detail')
    expect(d.writeFile).not.toHaveBeenCalled()
  })
  it.each(['"str"', '5', 'true'])('rejects a scalar results body (%s)', async (body) => {
    const d = base()
    d.exec = vi.fn(async (args) => listed({ results: body })(args))
    await expect(run(d)).rejects.toThrow('unexpected results body')
    expect(d.writeFile).not.toHaveBeenCalled()
  })
  it('rejects non-JSON stdout and writes nothing', async () => {
    const d = base()
    d.exec = vi.fn(async (args) => (args[0] === 'feature' ? '{"id":299210}' : 'oops <html>'))
    await expect(run(d)).rejects.toThrow('invalid JSON from cli')
    expect(d.writeFile).not.toHaveBeenCalled()
  })
  it.each([
    ['{"a":"\\u0073er.abc"}', 'server key detected'],
    ['{"a":"line\\nser.abc"}', 'server key detected'],
    ['{"a":"x@y.com"}', 'sensitive value detected'],
    ['{"a":"eyJhbGciOiJI.eyJzdWIiOiIx"}', 'sensitive value detected'],
  ])('rejects unsafe decoded values in bodies (%s)', async (body, msg) => {
    const d = base()
    d.exec = vi.fn(async (args) => listed({ results: body })(args))
    await expect(run(d)).rejects.toThrow(msg)
    expect(d.writeFile).not.toHaveBeenCalled()
  })
  it('redacts an escaped client key', async () => {
    const d = base()
    d.exec = vi.fn(async (args) => listed({ results: '{"a":"ENVKEY12\\u0033\\u0034"}' })(args))
    await run(d)
    expect(JSON.parse(d.writeFile.mock.calls[0][1]).results).toEqual({ a: '[ENV_KEY]' })
  })
  it.each([
    ['flag', (a) => a[0] === 'feature'],
    ['list', (a) => a[1]?.endsWith('/experiments/')],
    ['detail', (a) => a[1]?.endsWith('/3/')],
    ['exposures', (a) => a[1]?.endsWith('/exposures/')],
    ['results', (a) => a[1]?.endsWith('/results/')],
  ])('names the failing step without the URL (%s)', async (name, match) => {
    const d = base()
    const ok = listed()
    d.exec = vi.fn(async (args) => {
      if (match(args)) throw new Error('boom ENVKEY1234')
      return ok(args)
    })
    const err = await run(d).catch((e) => e)
    expect(err.message).toBe(`cli call failed (${name})`)
  })
  it('removes the temp file when rename fails', async () => {
    const d = base()
    d.rename = vi.fn(async () => {
      throw new Error('EXDEV')
    })
    d.target = '/tmp/snap.json'
    d.exec = vi.fn(async (args) => listed()(args))
    await expect(run(d)).rejects.toThrow('EXDEV')
    expect(d.rm).toHaveBeenCalledWith('/tmp/snap.json.tmp')
  })
  it('throws when FLAGSMITH_BIN does not exist or is not absolute', async () => {
    const old = process.env.FLAGSMITH_BIN
    try {
      for (const bin of ['/no/such/flagsmith', 'flagsmith']) {
        process.env.FLAGSMITH_BIN = bin
        await expect(run(base())).rejects.toThrow('FLAGSMITH_BIN not found')
      }
    } finally {
      if (old === undefined) delete process.env.FLAGSMITH_BIN
      else process.env.FLAGSMITH_BIN = old
    }
  })
})
