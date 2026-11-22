// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'

const SERVER_KEY = /(^|[^A-Za-z0-9])ser\.[A-Za-z0-9]/

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v)
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out))
  else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      out.push(k)
      strings(x, out)
    }
  }
  return out
}

it('committed snapshot contains no server key and not the client key', () => {
  const clientKey = JSON.parse(readFileSync(resolve(process.cwd(), '../../flagsmith.json'), 'utf8')).environment
  expect(typeof clientKey).toBe('string')
  const text = readFileSync(resolve(process.cwd(), 'src/features/results/snapshot.json'), 'utf8')
  const all = [text, ...strings(JSON.parse(text))]
  expect(all.some((s) => SERVER_KEY.test(s))).toBe(false)
  expect(all.some((s) => s.includes(clientKey))).toBe(false)
})
