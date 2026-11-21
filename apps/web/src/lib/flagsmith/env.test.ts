import { afterEach, describe, expect, it, vi } from 'vitest'

async function load(value: string) {
  vi.stubEnv('VITE_FLAGSMITH_ENVIRONMENT_KEY', value)
  vi.resetModules()
  return import('./env')
}

describe('env', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('accepts a client key', async () => {
    const e = await load('CLIENTKEY')
    expect(e.hasFlagsmithKey).toBe(true)
    expect(e.FLAGSMITH_ENV_KEY).toBe('CLIENTKEY')
  })

  it('treats a server key (ser.) as missing', async () => {
    const e = await load('ser.abc123')
    expect(e.hasFlagsmithKey).toBe(false)
    expect(e.FLAGSMITH_ENV_KEY).toBe('')
  })

  it('treats an empty value as missing', async () => {
    expect((await load('')).hasFlagsmithKey).toBe(false)
  })
})
