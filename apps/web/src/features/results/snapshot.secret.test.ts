// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'

it('committed snapshot contains no server key and not the client key', () => {
  const clientKey = JSON.parse(readFileSync(resolve(process.cwd(), '../../flagsmith.json'), 'utf8')).environment
  expect(typeof clientKey).toBe('string')
  const text = readFileSync(resolve(process.cwd(), 'src/features/results/snapshot.json'), 'utf8')
  expect(/\bser\.[A-Za-z0-9]/.test(text)).toBe(false)
  expect(text.includes(clientKey)).toBe(false)
})
