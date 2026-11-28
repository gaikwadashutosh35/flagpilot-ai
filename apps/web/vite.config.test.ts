import { afterEach, describe, expect, it, vi } from 'vitest'
import config, { assertClientKey } from './vite.config'

describe('assertClientKey', () => {
  it.each([undefined, '', 'ABCDEFGHIJ', 'a-b_C-1234567', 'x'.repeat(64)])('accepts %j', (k) => {
    expect(() => assertClientKey(k)).not.toThrow()
  })
  it.each(['ser.abcdefghijkl', 'short', 'x'.repeat(65), ' ABCDEFGHIJ', 'ABCDEFGHIJ ', '"ABCDEFGHIJ"', 'has space1234', 'ABC.DEFGHIJKL', 'ABCDEFGHIJ\n'])(
    'rejects %j without echoing it',
    (k) => {
      const err = (() => {
        try {
          assertClientKey(k)
        } catch (e) {
          return e as Error
        }
      })()
      expect(err).toBeInstanceOf(Error)
      expect(err!.message).not.toContain(k.trim() || 'zzz-none')
    },
  )
})

describe('defineConfig wiring', () => {
  afterEach(() => vi.unstubAllEnvs())
  const run = () => (config as unknown as (e: { mode: string; command: string }) => unknown)({ mode: 'test', command: 'build' })
  it('throws on a server key in VITE_FLAGSMITH_ENVIRONMENT_KEY', () => {
    vi.stubEnv('VITE_FLAGSMITH_ENVIRONMENT_KEY', 'ser.abcdefghijkl')
    expect(run).toThrow(/client environment key/)
  })
  it('does not throw with the key empty', () => {
    vi.stubEnv('VITE_FLAGSMITH_ENVIRONMENT_KEY', '')
    expect(run).not.toThrow()
  })
})
