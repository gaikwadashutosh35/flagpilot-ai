import { describe, expect, it, vi } from 'vitest'
import { EVENTS, FLAG_KEY, ctaCopyFor } from './constants'

describe('constants', () => {
  it('flag key and event names are exact', () => {
    expect(FLAG_KEY).toBe('flagpilot_onboarding_cta')
    expect(EVENTS).toEqual({
      demoCompleted: 'flagpilot_demo_completed',
      ctaClicked: 'flagpilot_primary_cta_clicked',
    })
  })
  it('maps variants to copy', () => {
    expect(ctaCopyFor('benefit_copy')).toBe('Launch an experiment in minutes')
    for (const v of ['control', null, undefined])
      expect(ctaCopyFor(v)).toBe('Create your first experiment')
  })
  it('warns once per unknown variant key and returns control copy', async () => {
    vi.resetModules()
    const { ctaCopyFor: fresh } = await import('./constants')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(fresh('weird')).toBe('Create your first experiment')
    expect(fresh('weird')).toBe('Create your first experiment')
    expect(warn).toHaveBeenCalledTimes(1)
    fresh('other')
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })
})
