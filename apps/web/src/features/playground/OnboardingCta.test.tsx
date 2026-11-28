import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  useExperiment: vi.fn(),
  useFlagsmithLoading: vi.fn(),
  trackEvent: vi.fn(),
}))

vi.mock('@flagsmith/flagsmith/react', () => ({
  useExperiment: m.useExperiment,
  useFlagsmithLoading: m.useFlagsmithLoading,
  FlagsmithProvider: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('@flagsmith/flagsmith', () => ({
  default: { trackEvent: m.trackEvent, flushEvents: vi.fn(async () => {}) },
}))

import { FlagsmithAvailableContext } from '@/lib/flagsmith/FlagsmithRoot'
import { getVisitorId } from '@/lib/identity'
import { OnboardingCta } from './OnboardingCta'

const LOADING = { isLoading: true, isFetching: true, error: null }
const LOADED = { isLoading: false, isFetching: false, error: null }

const tree = (available: boolean) => (
    <FlagsmithAvailableContext.Provider value={available}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<OnboardingCta timeoutMs={3000} />} />
          <Route path="/copilot" element={<div data-testid="copilot" />} />
        </Routes>
      </MemoryRouter>
    </FlagsmithAvailableContext.Provider>
)

function setup(available = true, strict = false) {
  return render(strict ? <StrictMode>{tree(available)}</StrictMode> : tree(available))
}

describe('OnboardingCta', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    m.useFlagsmithLoading.mockReturnValue(LOADED)
    m.useExperiment.mockReturnValue({ variant: 'control' })
  })
  afterEach(() => vi.useRealTimers())

  it('shows a skeleton and no text while flags load', () => {
    m.useFlagsmithLoading.mockReturnValue(LOADING)
    setup()
    expect(screen.getByTestId('cta-skeleton')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
    expect(m.useExperiment).not.toHaveBeenCalled()
  })

  it.each([
    ['control', 'Create your first experiment'],
    ['benefit_copy', 'Launch an experiment in minutes'],
  ])('renders %s copy once loaded', (variant, copy) => {
    m.useExperiment.mockReturnValue({ variant })
    setup()
    expect(screen.getByRole('button', { name: copy })).toBeInTheDocument()
  })

  it('marks CTA seen only when the visitor is in the experiment', () => {
    m.useExperiment.mockReturnValue({ variant: 'control', experiment: { id: 1, name: 'x', inExperiment: true } })
    m.useFlagsmithLoading.mockReturnValue(LOADING)
    const { rerender } = setup()
    expect(localStorage.getItem('flagpilot.ctaSeenFor')).toBeNull()
    m.useFlagsmithLoading.mockReturnValue(LOADED)
    rerender(tree(true))
    expect(localStorage.getItem('flagpilot.ctaSeenFor')).toBe(getVisitorId().id)
  })

  it.each([
    ['no experiment data', { variant: 'control' }],
    ['not in experiment', { variant: 'control', experiment: { id: 1, name: 'x', inExperiment: false } }],
  ])('does not mark CTA seen with %s', (_n, flag) => {
    m.useExperiment.mockReturnValue(flag)
    setup()
    expect(localStorage.getItem('flagpilot.ctaSeenFor')).toBeNull()
  })

  it('after timeout shows control copy and never mounts exposure, even if flags arrive later', () => {
    vi.useFakeTimers()
    m.useFlagsmithLoading.mockReturnValue(LOADING)
    const { rerender } = setup()
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByRole('button', { name: 'Create your first experiment' })).toBeInTheDocument()
    m.useFlagsmithLoading.mockReturnValue(LOADED)
    m.useExperiment.mockReturnValue({ variant: 'benefit_copy' })
    rerender(tree(true))
    expect(m.useExperiment).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Create your first experiment' })).toBeInTheDocument()
    expect(localStorage.getItem('flagpilot.ctaSeenFor')).toBeNull()
  })

  it('treats loading error as unavailable: control copy, no events on click', async () => {
    m.useFlagsmithLoading.mockReturnValue({ isLoading: false, isFetching: false, error: new Error('x') })
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Create your first experiment' }))
    expect(m.useExperiment).not.toHaveBeenCalled()
    expect(m.trackEvent).not.toHaveBeenCalled()
    expect(screen.getByTestId('copilot')).toBeInTheDocument()
  })

  it('click sends only flagpilot_primary_cta_clicked and navigates to /copilot', async () => {
    setup()
    await userEvent.click(screen.getByRole('button'))
    expect(m.trackEvent).toHaveBeenCalledTimes(1)
    expect(m.trackEvent).toHaveBeenCalledWith('flagpilot_primary_cta_clicked')
    expect(screen.getByTestId('copilot')).toBeInTheDocument()
  })

  it('without a key renders control copy, calls no SDK hook, sends no event', async () => {
    setup(false)
    await userEvent.click(screen.getByRole('button', { name: 'Create your first experiment' }))
    expect(m.useFlagsmithLoading).not.toHaveBeenCalled()
    expect(m.useExperiment).not.toHaveBeenCalled()
    expect(m.trackEvent).not.toHaveBeenCalled()
    expect(screen.getByTestId('copilot')).toBeInTheDocument()
  })

  it('StrictMode double mount sends no events on mount', () => {
    setup(true, true)
    expect(m.trackEvent).not.toHaveBeenCalled()
  })
})
