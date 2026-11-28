// Run from the repo root: node apps/web/scripts/snapshot-results.mjs [--refresh]
import { execFile } from 'node:child_process'
import { statSync } from 'node:fs'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { assertNoServerKey, buildSnapshot, isEnvKey, projectExposures, projectResults, scan, selectExperiment, validateExperiment } from './snapshot-lib.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..', '..')
const snapshotPath = path.join(here, '..', 'src', 'features', 'results', 'snapshot.json')
const FLAG = 'flagpilot_onboarding_cta'

const exe = process.platform === 'win32' ? 'flagsmith.exe' : 'flagsmith'
const isFile = (p) => {
  try {
    return statSync(p).isFile()
  } catch {
    return false
  }
}

// Absolute paths only: never execute a bare name (Windows searches the current directory first).
function resolveBin(env = process.env) {
  if (env.FLAGSMITH_BIN) {
    if (path.isAbsolute(env.FLAGSMITH_BIN) && isFile(env.FLAGSMITH_BIN)) return env.FLAGSMITH_BIN
    throw new Error('FLAGSMITH_BIN not found')
  }
  const dirs = [path.join(os.homedir(), '.local', 'bin'), ...(env.PATH ?? '').split(path.delimiter)]
  for (const dir of dirs) {
    if (!dir || !path.isAbsolute(dir)) continue
    const bin = path.join(dir, exe)
    if (isFile(bin)) return bin
  }
  throw new Error('flagsmith cli not found')
}

// Errors are generic: the CLI's error output carries a URL with the env key.
function realExec() {
  const bin = resolveBin()
  return (args) =>
    new Promise((resolve, reject) =>
      execFile(bin, args, { cwd: repoRoot, timeout: 60000, maxBuffer: 32 * 1024 * 1024 }, (err, stdout) =>
        err ? reject(new Error('cli call failed')) : resolve(stdout),
      ),
    )
}

export async function run({
  exec = realExec(),
  readFile: rf = (p) => readFile(p, 'utf8'),
  writeFile: wf = writeFile,
  rename: mv = rename,
  rm: del = (p) => rm(p, { force: true }),
  now = () => new Date(),
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  refresh = false,
  target = snapshotPath,
} = {}) {
  let envKey
  try {
    envKey = JSON.parse(await rf(path.join(repoRoot, 'flagsmith.json'))).environment
  } catch {
    throw new Error('invalid flagsmith.json')
  }
  if (!isEnvKey(envKey)) throw new Error('invalid flagsmith.json')
  const step = async (name, args) => {
    try {
      return await exec(args)
    } catch {
      throw new Error(`cli call failed (${name})`)
    }
  }
  const json = async (name, args) => {
    const out = (await step(name, args)).trim()
    assertNoServerKey(out)
    if (!out) return null
    try {
      return scan(JSON.parse(out), envKey)
    } catch (e) {
      throw e.message === 'server key detected' ? e : new Error('invalid JSON from cli')
    }
  }
  const base = `api/v1/environments/${envKey}/experiments/`

  const flag = await json('flag', ['feature', 'get', FLAG, '--json'])
  if (typeof flag?.id !== 'number') throw new Error('flag id not found')
  const list = await json('list', ['api', base])
  const arr = Array.isArray(list) ? list : Array.isArray(list?.results) ? list.results : null
  if (!arr) throw new Error('unexpected experiments list')
  if (!Array.isArray(list) && list.next != null) throw new Error('experiments list is paginated')
  const found = selectExperiment(arr, flag.id)

  let snap = buildSnapshot({ experiment: null, exposures: null, results: null, capturedAt: null })
  let line = `no experiment (${arr.length} listed)`
  if (found) {
    if (!Number.isInteger(found.id) || found.id <= 0) throw new Error('unexpected experiment detail')
    const url = `${base}${found.id}/`
    let failed = 0
    if (refresh) {
      // A failed refresh (rate limit) makes the CLI exit 1: keep last results. Only the exec is guarded,
      // so a server key in a successful body still aborts.
      for (const kind of ['results', 'exposures']) {
        let out
        try {
          out = await exec(['api', `${url}${kind}/refresh/`, '-X', 'POST'])
        } catch {
          failed++
          continue
        }
        assertNoServerKey(out)
      }
      if (failed < 2) await sleep(60000)
    }
    const detail = await json('detail', ['api', url])
    const rawExposures = await json('exposures', ['api', `${url}exposures/`])
    const rawResults = await json('results', ['api', `${url}results/`])
    const experiment = validateExperiment(detail, found)
    const exposures = projectExposures(rawExposures)
    const results = projectResults(rawResults)
    const capturedAt = now().toISOString()
    snap = buildSnapshot({ experiment, exposures, results, capturedAt })
    line = `experiment ${experiment.id} ${experiment.status}; results ${results === null ? 'null' : 'present'}; captured ${capturedAt}${failed ? '; refresh failed' : ''}`
  }

  const text = JSON.stringify(scan(snap, null, { sensitive: true }), null, 2) + '\n'
  assertNoServerKey(text)
  if (text.includes(envKey)) throw new Error('client key in snapshot')
  // Temp file + rename so no partial file is left.
  const tmp = `${target}.tmp`
  try {
    await wf(tmp, text)
    await mv(tmp, target)
  } catch (e) {
    await Promise.resolve(del(tmp)).catch(() => {})
    throw e
  }
  return line
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run({ refresh: process.argv.includes('--refresh') }).then(
    (line) => console.log(line),
    (e) => {
      console.error(`snapshot failed: ${e?.message ?? 'unknown'}`)
      process.exit(1)
    },
  )
}
