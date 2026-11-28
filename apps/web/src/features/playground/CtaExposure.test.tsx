import { render } from '@testing-library/react'
import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  order: [] as string[],
  flag: { variant: 'control' } as Record<string, unknown>,
  flush: vi.fn(),
}))

// The mock hook records "exposure" in its own effect, like the SDK's useExperiment does,
// and is declared before CtaExposure's effect, so it runs first.
vi.mock('@flagsmith/flagsmith/react', () => ({
  useExperiment: () => {
    useEffect(() => {
      if ((m.flag.experiment as { inExperiment?: boolean } | undefined)?.inExperiment) m.order.push('exposure')
    })
    return m.flag
  },
}))
vi.mock('@flagsmith/flagsmith', () => ({
  default: { trackEvent: vi.fn(), flushEvents: m.flush },
}))

import { CtaExposure } from './CtaExposure'

const IN = { variant: 'control', experiment: { id: 1, name: 'x', inExperiment: true } }

describe('CtaExposure flush', () => {
  beforeEach(() => {
    localStorage.clear()
    m.order.length = 0
    m.flush.mockReset()
    m.flush.mockImplementation(async () => {
      m.order.push('flush')
    })
    m.flag = IN
  })

  it('flushes once, after the exposure is recorded, when in experiment', () => {
    render(<CtaExposure visitorId="fp_1" onClick={() => {}} />)
    expect(m.order).toEqual(['exposure', 'flush'])
  })

  it('does not flush when not in experiment', () => {
    m.flag = { variant: 'control', experiment: { id: 1, name: 'x', inExperiment: false } }
    render(<CtaExposure visitorId="fp_1" onClick={() => {}} />)
    expect(m.flush).not.toHaveBeenCalled()
  })

  it('does not flush again on re-render with the same visitor and state', () => {
    const { rerender } = render(<CtaExposure visitorId="fp_1" onClick={() => {}} />)
    rerender(<CtaExposure visitorId="fp_1" onClick={() => {}} />)
    expect(m.flush).toHaveBeenCalledOnce()
  })

  it('flushes after exposure when inExperiment turns true after mount', () => {
    m.flag = { variant: 'control', experiment: { id: 1, name: 'x', inExperiment: false } }
    const { rerender } = render(<CtaExposure visitorId="fp_1" onClick={() => {}} />)
    expect(m.flush).not.toHaveBeenCalled()
    m.flag = IN
    rerender(<CtaExposure visitorId="fp_1" onClick={() => {}} />)
    expect(m.order).toEqual(['exposure', 'flush'])
    expect(m.flush).toHaveBeenCalledOnce()
  })

  it('swallows a rejected flush', async () => {
    m.flush.mockRejectedValue(new Error('boom'))
    expect(() => render(<CtaExposure visitorId="fp_1" onClick={() => {}} />)).not.toThrow()
    await Promise.resolve()
  })
})
