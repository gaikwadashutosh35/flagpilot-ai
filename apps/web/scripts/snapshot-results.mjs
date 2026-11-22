// Run from the repo root: node apps/web/scripts/snapshot-results.mjs [--refresh]
import { execFile } from 'node:child_process'
import { readFile, rename, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { assertNoServerKey, buildSnapshot, mapExperiment, redact, selectExperiment } from './snapshot-lib.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..', '..')
const snapshotPath = path.join(here, '..', 'src', 'features', 'results', 'snapshot.json')
const FLAG = 'flagpilot_onboarding_cta'

const run1 = (bin, args) =>
  new Promise((resolve, reject) =>
    execFile(bin, args, { maxBuffer: 32 * 1024 * 1024 }, (err, stdout) => (err ? reject(err) : resolve(stdout))),
  )

// Real CLI: FLAGSMITH_BIN, else PATH, else ~/.local/bin. Errors are generic: args carry the env key.
async function realExec(args) {
  const home = path.join(os.homedir(), '.local', 'bin', process.platform === 'win32' ? 'flagsmith.exe' : 'flagsmith')
  const bins = [process.env.FLAGSMITH_BIN, 'flagsmith', home].filter(Boolean)
  for (const bin of bins) {
    try {
      return await run1(bin, args)
    } catch (e) {
      if (e?.code !== 'ENOENT') throw new Error('cli call failed')
    }
  }
  throw new Error('flagsmith cli not found')
}

export async function run({
  exec = realExec,
  readFile: rf = (p) => readFile(p, 'utf8'),
  writeFile: wf = writeFile,
  rename: mv = rename,
  now = () => new Date(),
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  refresh = false,
  target = snapshotPath,
} = {}) {
  const envKey = JSON.parse(await rf(path.join(repoRoot, 'flagsmith.json'))).environment
  const call = async (args) => {
    const out = await exec(args)
    assertNoServerKey(out)
    return redact(out, envKey)
  }
  const json = async (args) => {
    const out = (await call(args)).trim()
    if (!out) return null
    try {
      return JSON.parse(out)
    } catch {
      throw new Error('invalid JSON from cli')
    }
  }
  const base = `api/v1/environments/${envKey}/experiments/`

  const flag = await json(['feature', 'get', FLAG, '--json'])
  if (typeof flag?.id !== 'number') throw new Error('flag id not found')
  const found = selectExperiment(await json(['api', base]), flag.id)

  let snap = buildSnapshot({ experiment: null, exposures: null, results: null, capturedAt: null })
  let line = 'no experiment'
  if (found) {
    const url = `${base}${found.id}/`
    if (refresh) {
      await call(['api', `${url}results/refresh/`, '-X', 'POST'])
      await call(['api', `${url}exposures/refresh/`, '-X', 'POST'])
      await sleep(60000)
    }
    const detail = await json(['api', url])
    const exposures = await json(['api', `${url}exposures/`])
    const results = await json(['api', `${url}results/`])
    const experiment = mapExperiment(detail ?? found)
    const capturedAt = now().toISOString()
    snap = buildSnapshot({ experiment, exposures, results, capturedAt })
    line = `experiment ${experiment.id} ${experiment.status}; results ${results === null ? 'null' : 'present'}; captured ${capturedAt}`
  }

  // Only reached after every call succeeded: temp file + rename so no partial file is left.
  const tmp = `${target}.tmp`
  await wf(tmp, JSON.stringify(snap, null, 2) + '\n')
  await mv(tmp, target)
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
