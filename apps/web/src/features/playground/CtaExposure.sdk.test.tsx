import { FlagsmithContext } from '@flagsmith/flagsmith/react'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Uses the REAL useExperiment (SDK 12.5.0) with a stub instance, to pin the ordering assumption:
// the SDK calls getExperimentFlag (records exposure) in its effect, before our flush effect.
const m = vi.hoisted(() => ({ order: [] as string[] }))
vi.mock('@flagsmith/flagsmith', () => ({
  default: {
    trackEvent: vi.fn(),
    flushEvents: vi.fn(async () => {
      m.order.push('flush')
    }),
  },
}))

import { CtaExposure } from './CtaExposure'

function stub(inExperiment: boolean, eventsEnabled = true) {
  const flag = { value: 'x', enabled: true, variant: 'control', experiment: { id: 1, name: 'x', inExperiment } }
  return {
    eventsEnabled,
    getAllFlags: () => ({ flagpilot_onboarding_cta: flag }),
    getContext: () => ({ identity: { identifier: 'fp_1' } }),
    getExperimentFlag: vi.fn(() => {
      m.order.push('exposure')
    }),
  }
}

const renderWith = (fs: ReturnType<typeof stub>) =>
  render(
    <FlagsmithContext.Provider value={fs as never}>
      <CtaExposure visitorId="fp_1" onClick={() => {}} />
    </FlagsmithContext.Provider>,
  )

describe('CtaExposure with the real useExperiment', () => {
  it('records the exposure (getExperimentFlag) before flushing', () => {
    m.order.length = 0
    const fs = stub(true)
    renderWith(fs)
    expect(fs.getExperimentFlag).toHaveBeenCalledOnce()
    expect(m.order).toEqual(['exposure', 'flush'])
  })
})
