// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { loadSnapshot } from '../src/features/results/loadSnapshot.ts'
import { assertNoServerKey, buildSnapshot, mapExperiment, projectExposures, projectResults, scan, selectExperiment } from './snapshot-lib.mjs'
import { run } from './snapshot-results.mjs'

const readJson = (rel) => JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8'))
const fixture = readJson('../src/features/results/__fixtures__/real-results.json')
const projectedResults = {
  as_of: '2026-11-27T16:51:16.295297Z',
  is_final: false,
  payload: {
    srm_p_value: null,
    metrics: [{ metric_id: 319, variants: { benefit_copy: { n: 1, sum: 1 } }, inference: { benefit_copy: null } }],
  },
}
const projectedExposures = { as_of: '2026-11-27T16:51:16.676643Z', excluded_identities: 0 }
// A results body in the confirmed Flagsmith shape, with `variant` as the variant key.
const resultsBody = (variant, extra = {}) =>
  JSON.stringify({
    results: {
      as_of: null,
      is_final: false,
      payload: { srm_p_value: null, metrics: [{ metric_id: 319, variants: { [variant]: { n: 1, sum: 1 } }, inference: { [variant]: null } }] },
      ...extra,
    },
  })

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
  it('throws on an unknown status for the flag', () => {
    const msg = 'unexpected experiment status'
    expect(() => selectExperiment([{ id: 7, feature: 299210, status: 'archived' }], 299210)).toThrow(msg)
    expect(() => selectExperiment([{ id: 7, feature: { id: 299210 }, status: 'archived' }], 299210)).toThrow(msg)
    expect(() => selectExperiment([{ id: 7, feature: 299210 }], 299210)).toThrow(msg)
    expect(() =>
      selectExperiment([{ id: 3, feature: 299210, status: 'running' }, { id: 7, feature: 299210, status: 'archived' }], 299210),
    ).toThrow(msg)
  })
  it('ignores unknown statuses on other flags', () => {
    expect(
      selectExperiment([{ id: 1, feature: 9, status: 'archived' }, { id: 2, feature: 299210, status: 'created' }], 299210).id,
    ).toBe(2)
    expect(selectExperiment([{ id: 1, feature: 9, status: 'archived' }], 299210)).toBeNull()
  })
  it('throws on an unknown feature shape in the list', () => {
    const msg = 'unexpected experiment feature'
    const bad = [
      [{ id: 7, feature: '299210', status: 'running' }],
      [{ id: 7, feature: { pk: 299210 }, status: 'running' }],
      [{ id: 7, feature: { id: '299210' }, status: 'running' }],
      [{ id: 7, feature: null, status: 'running' }],
      [{ id: 7, status: 'running' }],
      [null],
      [{ id: 3, feature: 299210, status: 'running' }, { id: 7, feature: '299210', status: 'running' }],
      [{ id: 1, feature: { pk: 9 }, status: 'running' }],
      { results: [{ id: 7, feature: '299210', status: 'running' }] },
    ]
    for (const list of bad) expect(() => selectExperiment(list, 299210)).toThrow(msg)
  })
  it('checks the feature shape before the status', () => {
    expect(() => selectExperiment([{ id: 7, feature: '299210', status: 'archived' }], 299210)).toThrow(
      'unexpected experiment feature',
    )
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

describe('projection', () => {
  const msg = 'unexpected results body'
  const full = () => structuredClone(fixture.results)
  it('projects the real fixture to the allowlisted shape', () => {
    expect(projectResults(fixture.results)).toEqual(projectedResults)
    expect(projectExposures(fixture.exposures)).toEqual(projectedExposures)
    expect(projectResults(null)).toBeNull()
    expect(projectExposures(null)).toBeNull()
  })
  it('keeps a null payload', () => {
    const b = full()
    b.results.payload = null
    expect(projectResults(b)).toEqual({ as_of: projectedResults.as_of, is_final: false, payload: null })
    const e = structuredClone(fixture.exposures)
    e.exposures.payload = null
    expect(projectExposures(e)).toEqual({ as_of: projectedExposures.as_of, excluded_identities: null })
  })
  it('keeps exactly the four inference fields', () => {
    const b = full()
    b.results.payload.metrics[0].inference.benefit_copy = { lift: 0.1, ci_low: 0.01, ci_high: 0.2, chance_to_win: 0.9, p: 1, extra: 'x' }
    expect(projectResults(b).payload.metrics[0].inference.benefit_copy).toEqual({ lift: 0.1, ci_low: 0.01, ci_high: 0.2, chance_to_win: 0.9 })
  })
  it.each([
    ['missing results wrapper', (b) => b.results],
    ['metrics not an array', (b) => ((b.results.payload.metrics = {}), b)],
    ['string n', (b) => ((b.results.payload.metrics[0].variants.benefit_copy.n = '1'), b)],
    ['inference missing chance_to_win', (b) => ((b.results.payload.metrics[0].inference.benefit_copy = { lift: 1, ci_low: 0, ci_high: 2 }), b)],
    ['non-integer metric_id', (b) => ((b.results.payload.metrics[0].metric_id = 1.5), b)],
    ['string srm_p_value', (b) => ((b.results.payload.srm_p_value = '0.5'), b)],
    ['missing is_final', (b) => (delete b.results.is_final, b)],
  ])('rejects %s', (_n, mutate) => {
    expect(() => projectResults(mutate(full()))).toThrow(msg)
  })
  it('rejects a bad exposures body', () => {
    expect(() => projectExposures({})).toThrow(msg)
    expect(() => projectExposures({ exposures: { as_of: null, payload: {} } })).toThrow(msg)
  })
  it('committed snapshot is already an allowlisted projection', () => {
    const snap = readJson('../src/features/results/snapshot.json')
    expect(projectResults({ results: snap.results })).toEqual(snap.results)
    expect(Object.keys(snap.exposures).sort()).toEqual(['as_of', 'excluded_identities'])
  })
  it('keeps only metric 319 and drops others', () => {
    const b = full()
    b.results.payload.metrics.push({ metric_id: 320, variants: { control: { n: 1, sum: 0 } }, inference: {} })
    expect(projectResults(b).payload.metrics.map((m) => m.metric_id)).toEqual([319])
  })
  it('rejects a duplicate metric 319, extra variant keys, bad counts and a bad as_of', () => {
    const m = (b) => b.results.payload.metrics[0]
    const dup = full()
    dup.results.payload.metrics.push(structuredClone(m(dup)))
    expect(() => projectResults(dup)).toThrow(msg)
    const v = full()
    m(v).variants.other = { n: 1, sum: 1 }
    expect(() => projectResults(v)).toThrow(msg)
    const i = full()
    m(i).inference.other = null
    expect(() => projectResults(i)).toThrow(msg)
    const neg = full()
    m(neg).variants.benefit_copy.n = -1
    expect(() => projectResults(neg)).toThrow(msg)
    const frac = full()
    m(frac).variants.benefit_copy.sum = 1.5
    expect(() => projectResults(frac)).toThrow(msg)
    for (const bad of ['May 5', '2026-11-27', '2026-11-27 16:51:16Z', '2026-13-45T99:99:99Z', 5]) {
      const a = full()
      a.results.as_of = bad
      expect(() => projectResults(a)).toThrow(msg)
      expect(() => projectExposures({ exposures: { as_of: bad, payload: null } })).toThrow(msg)
    }
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
  it('rejects and writes nothing when the flag has an experiment with an unknown status', async () => {
    const d = base()
    d.exec = vi.fn(async (args) =>
      args[0] === 'feature' ? '{"id":299210}' : '[{"id":7,"feature":299210,"status":"archived"}]',
    )
    await expect(run(d)).rejects.toThrow('unexpected experiment status')
    expect(d.writeFile).not.toHaveBeenCalled()
    expect(d.rename).not.toHaveBeenCalled()
    expect(d.exec).toHaveBeenCalledTimes(2)
  })
  it('rejects and writes nothing when an experiment has an unknown feature shape', async () => {
    const d = base()
    d.exec = vi.fn(async (args) =>
      args[0] === 'feature' ? '{"id":299210}' : '[{"id":7,"feature":"299210","status":"running"}]',
    )
    await expect(run(d)).rejects.toThrow('unexpected experiment feature')
    expect(d.writeFile).not.toHaveBeenCalled()
    expect(d.rename).not.toHaveBeenCalled()
    expect(d.exec).toHaveBeenCalledTimes(2)
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
      if (p.endsWith('/exposures/')) return '{"exposures":{"as_of":null,"payload":null}}'
      if (p.endsWith('/results/')) return resultsBody('benefit_copy')
      return ''
    })
    const line = await run(d)
    expect(line).toBe('experiment 3 running; results present; captured 2026-11-22T00:00:00.000Z')
    expect(d.sleep).toHaveBeenCalledWith(60000)
    expect(d.exec.mock.calls.filter((c) => c[0][2] === '-X')).toHaveLength(2)
    const written = d.writeFile.mock.calls[0][1]
    expect(written).not.toContain('ENVKEY1234')
    expect(JSON.parse(written).results.payload.metrics[0].variants).toEqual({ benefit_copy: { n: 1, sum: 1 } })
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
      if (p.endsWith('/exposures/')) return '{"exposures":{"as_of":null,"payload":null}}'
      return '{"results":{"as_of":null,"is_final":false,"payload":null}}'
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
  it.each([
    ['detail', (a) => a[1]?.endsWith('/3/')],
    ['exposures', (a) => a[1]?.endsWith('/exposures/')],
    ['results', (a) => a[1]?.endsWith('/results/')],
  ])('rejects empty CLI output for %s and writes nothing', async (_n, match) => {
    const d = base()
    const ok = listed()
    d.exec = vi.fn(async (args) => (match(args) ? '  ' : ok(args)))
    await expect(run(d)).rejects.toThrow('invalid JSON from cli')
    expect(d.writeFile).not.toHaveBeenCalled()
    expect(d.rename).not.toHaveBeenCalled()
  })
  it('aborts when a refresh POST body contains a server key', async () => {
    const d = base()
    d.refresh = true
    const ok = listed()
    d.exec = vi.fn(async (args) => (args[2] === '-X' ? '{"x":"ser.abc"}' : ok(args)))
    await expect(run(d)).rejects.toThrow('server key detected')
    expect(d.writeFile).not.toHaveBeenCalled()
    expect(d.rename).not.toHaveBeenCalled()
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
      if (p.endsWith('/exposures/')) return extra.exposures ?? '{"exposures":{"as_of":null,"payload":null}}'
      if (p.endsWith('/results/')) return extra.results ?? '{"results":{"as_of":null,"is_final":false,"payload":null}}'
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
    ['lenient started_at', { started_at: 'May 5 2026' }],
    ['lenient ended_at', { ended_at: 'May 5 2026' }],
  ])('rejects an invalid experiment detail (%s)', async (_n, detail) => {
    const d = base()
    d.exec = vi.fn(async (args) => listed({ detail })(args))
    await expect(run(d)).rejects.toThrow('unexpected experiment detail')
    expect(d.writeFile).not.toHaveBeenCalled()
  })
  it('accepts real ISO started_at and ended_at', async () => {
    const d = base()
    d.exec = vi.fn(async (args) => listed({ detail: { started_at: '2026-11-27T12:29:50.306307Z', ended_at: '2026-11-28T01:02:03+05:30' } })(args))
    await run(d)
    expect(JSON.parse(d.writeFile.mock.calls[0][1]).experiment.startedAt).toBe('2026-11-27T12:29:50.306307Z')
  })
  it.each(['detail', 'exposures', 'results'])('rejects a JSON null body for %s and writes nothing', async (name) => {
    const d = base()
    const ok = listed()
    d.exec = vi.fn(async (args) => (args[1]?.endsWith(name === 'detail' ? '/3/' : `/${name}/`) ? 'null' : ok(args)))
    await expect(run(d)).rejects.toThrow('invalid JSON from cli')
    expect(d.writeFile).not.toHaveBeenCalled()
    expect(d.rename).not.toHaveBeenCalled()
  })
  it('redacts a JSON-escaped client key from the experiment name', async () => {
    const d = base()
    const ok = listed()
    // Raw CLI text carries \u escapes ("ENVKEY1234"); redaction must run on the decoded value.
    d.exec = vi.fn(async (args) => (args[1]?.endsWith('/3/') ? '{"id":3,"name":"ENVKEY12\\u0033\\u0034","status":"running","started_at":null,"ended_at":null}' : ok(args)))
    await run(d)
    const written = d.writeFile.mock.calls[0][1]
    expect(written).not.toContain('ENVKEY1234')
    expect(JSON.parse(written).experiment.name).toBe('[ENV_KEY]')
  })
  it('rejects a non-integer experiment id from the list', async () => {
    const d = base()
    d.exec = vi.fn(async (args) =>
      args[1]?.endsWith('/experiments/') ? '[{"id":"../x","feature":299210,"status":"running"}]' : listed()(args),
    )
    await expect(run(d)).rejects.toThrow('unexpected experiment detail')
    expect(d.writeFile).not.toHaveBeenCalled()
  })
  it.each(['"str"', '5', 'true', '{"a":1}', '{"results":5}'])('rejects an invalid results body (%s)', async (body) => {
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
  // rawKey is JSON-escaped text placed verbatim as the variant key.
  const keyed = (rawKey) =>
    `{"results":{"as_of":null,"is_final":false,"payload":{"srm_p_value":null,"metrics":[{"metric_id":319,"variants":{"${rawKey}":{"n":1,"sum":1}},"inference":{"${rawKey}":null}}]}}}`
  it.each(['\\u0073er.abc', 'line\\nser.abc'])('rejects a server key in a body (%s)', async (key) => {
    const d = base()
    d.exec = vi.fn(async (args) => listed({ results: keyed(key) })(args))
    await expect(run(d)).rejects.toThrow('server key detected')
    expect(d.writeFile).not.toHaveBeenCalled()
  })
  // Variant keys are allowlisted now; the experiment name is the one free-text field left in the snapshot.
  it.each(['x@y.com', 'eyJhbGciOiJI.eyJzdWIiOiIx'])('rejects an email or JWT in the snapshot (%s)', async (name) => {
    const d = base()
    d.exec = vi.fn(async (args) => listed({ detail: { name } })(args))
    await expect(run(d)).rejects.toThrow('sensitive value detected')
    expect(d.writeFile).not.toHaveBeenCalled()
  })
  it('redacts the client key from the experiment name', async () => {
    const d = base()
    d.exec = vi.fn(async (args) => listed({ detail: { name: 'ENVKEY1234' } })(args))
    await run(d)
    expect(JSON.parse(d.writeFile.mock.calls[0][1]).experiment.name).toBe('[ENV_KEY]')
  })
  it('rejects and writes nothing when the client key reaches the final text', async () => {
    const d = base()
    d.now = () => ({ toISOString: () => 'ENVKEY1234' })
    d.exec = vi.fn(async (args) => listed()(args))
    await expect(run(d)).rejects.toThrow('client key in snapshot')
    expect(d.writeFile).not.toHaveBeenCalled()
    expect(d.rename).not.toHaveBeenCalled()
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
