import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@flagsmith/flagsmith', () => ({
  default: { trackEvent: vi.fn(), flushEvents: vi.fn(async () => {}) },
}))

async function load() {
  const flagsmith = (await import('@flagsmith/flagsmith')).default
  const events = await import('./events')
  return { flagsmith, ...events }
}

describe('events', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })
  afterEach(() => vi.restoreAllMocks())

  it('skips when unavailable', async () => {
    const { flagsmith, completeDemo } = await load()
    expect(await completeDemo('fp_1', false)).toEqual({ sent: false, reason: 'unavailable' })
    expect(flagsmith.trackEvent).not.toHaveBeenCalled()
  })

  it('skips when CTA not seen', async () => {
    const { completeDemo } = await load()
    expect(await completeDemo('fp_1', true)).toEqual({ sent: false, reason: 'cta_not_seen' })
  })

  it('sends once then reports already_counted', async () => {
    const { flagsmith, completeDemo, markCtaSeen } = await load()
    markCtaSeen('fp_1')
    expect(await completeDemo('fp_1', true)).toEqual({ sent: true })
    expect(localStorage.getItem('flagpilot.completedFor')).toBe('fp_1')
    expect(flagsmith.trackEvent).toHaveBeenCalledExactlyOnceWith('flagpilot_demo_completed')
    expect(flagsmith.flushEvents).toHaveBeenCalledOnce()
    expect(await completeDemo('fp_1', true)).toEqual({ sent: false, reason: 'already_counted' })
  })

  it('resolves { sent: true } without waiting for a never-resolving flush', async () => {
    const { flagsmith, completeDemo, markCtaSeen } = await load()
    vi.mocked(flagsmith.flushEvents).mockReturnValueOnce(new Promise(() => {}))
    markCtaSeen('fp_1')
    expect(await completeDemo('fp_1', true)).toEqual({ sent: true })
    expect(flagsmith.flushEvents).toHaveBeenCalledOnce()
    expect(await completeDemo('fp_1', true)).toEqual({ sent: false, reason: 'already_counted' })
  })

  it('markCtaSeen is idempotent and survives storage throwing', async () => {
    const { completeDemo, markCtaSeen } = await load()
    markCtaSeen('fp_1')
    markCtaSeen('fp_1')
    expect(localStorage.getItem('flagpilot.ctaSeenFor')).toBe('fp_1')
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(() => markCtaSeen('fp_2')).not.toThrow()
    expect(await completeDemo('fp_2', true)).toEqual({ sent: true })
  })

  it('trackCtaClick sends only the click event when available', async () => {
    const { flagsmith, trackCtaClick } = await load()
    trackCtaClick(true)
    expect(flagsmith.trackEvent).toHaveBeenCalledExactlyOnceWith('flagpilot_primary_cta_clicked')
    trackCtaClick(false)
    expect(flagsmith.trackEvent).toHaveBeenCalledOnce()
  })
})
