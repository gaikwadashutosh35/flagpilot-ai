import { describe, expect, it } from 'vitest'
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
    for (const v of ['control', null, undefined, 'weird'])
      expect(ctaCopyFor(v)).toBe('Create your first experiment')
  })
})
