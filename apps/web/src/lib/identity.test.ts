import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('getVisitorId', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })
  afterEach(() => vi.restoreAllMocks())

  it('creates fp_<uuid> once and reuses it', async () => {
    const { getVisitorId } = await import('./identity')
    const a = getVisitorId()
    expect(a.id).toMatch(/^fp_[0-9a-f-]{36}$/)
    expect(getVisitorId().id).toBe(a.id)
    expect(a.persistent).toBe(true)
  })

  it('caches one identity per page load even if storage changes', async () => {
    const { getVisitorId } = await import('./identity')
    const a = getVisitorId()
    localStorage.clear()
    expect(getVisitorId()).toEqual(a)
  })

  it('replaces a malformed stored id', async () => {
    localStorage.setItem('flagpilot.visitorId', 'bob@example.com')
    const { getVisitorId } = await import('./identity')
    expect(getVisitorId().id).toMatch(/^fp_/)
  })

  it('falls back to in-memory when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    const { getVisitorId } = await import('./identity')
    const a = getVisitorId()
    expect(a.persistent).toBe(false)
    expect(getVisitorId().id).toBe(a.id)
  })
})
