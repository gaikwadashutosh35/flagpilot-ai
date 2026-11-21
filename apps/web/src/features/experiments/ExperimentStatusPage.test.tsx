import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  useFlags: vi.fn(),
  useExperiment: vi.fn(),
  useFlagsmithLoading: vi.fn(),
  getVisitorId: vi.fn(),
  env: { hasFlagsmithKey: true, FLAGSMITH_ENV_KEY: 'SECRETKEY123' },
}))

vi.mock('@flagsmith/flagsmith/react', () => ({
  useFlags: m.useFlags,
  useExperiment: m.useExperiment,
  useFlagsmithLoading: m.useFlagsmithLoading,
}))
vi.mock('@flagsmith/flagsmith', () => ({ default: {} }))
vi.mock('@/lib/identity', () => ({ getVisitorId: m.getVisitorId }))
vi.mock('@/lib/flagsmith/env', () => ({
  get hasFlagsmithKey() { return m.env.hasFlagsmithKey },
  get FLAGSMITH_ENV_KEY() { return m.env.FLAGSMITH_ENV_KEY },
}))

import { ApprovedPlanProvider } from '@/features/copilot/approvedPlan'
import { FlagsmithAvailableContext } from '@/lib/flagsmith/FlagsmithRoot'
import { ExperimentStatusPage } from './ExperimentStatusPage'

const renderPage = (available = true) =>
  render(
    <FlagsmithAvailableContext.Provider value={available}>
      <ApprovedPlanProvider>
        <ExperimentStatusPage />
      </ApprovedPlanProvider>
    </FlagsmithAvailableContext.Provider>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  m.env.hasFlagsmithKey = true
  m.getVisitorId.mockReturnValue({ id: 'abcdef1234567890', persistent: true })
  m.useFlagsmithLoading.mockReturnValue({ isLoading: false, isFetching: false, error: null })
  m.useFlags.mockReturnValue({
    flagpilot_onboarding_cta: { enabled: true, value: 'control', variant: 'benefit_copy', experiment: { id: 1, name: 'x', inExperiment: true } },
  })
})

describe('ExperimentStatusPage', () => {
  it('shows key present yes/no but never the key value', () => {
    renderPage()
    expect(screen.getByText(/Client key present:\s*yes/)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('SECRETKEY123')
  })

  it('reads assignment with useFlags and never calls useExperiment', () => {
    renderPage()
    expect(m.useFlags).toHaveBeenCalled()
    expect(m.useExperiment).not.toHaveBeenCalled()
    expect(screen.getByText(/Variant:\s*benefit_copy/)).toBeInTheDocument()
    expect(screen.getByText(/In experiment:\s*yes/)).toBeInTheDocument()
  })

  it('shows identity first 8 chars and "not persistent" when storage is unavailable', () => {
    m.getVisitorId.mockReturnValue({ id: 'abcdef1234567890', persistent: false })
    renderPage()
    expect(screen.getByText(/abcdef12/)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('abcdef1234')
    expect(screen.getByText(/not persistent/i)).toBeInTheDocument()
  })

  it('shows the preview-only label verbatim', () => {
    renderPage()
    expect(screen.getByText(/Preview only: applied by the project owner via the Flagsmith CLI after explicit approval\. The browser never writes to Flagsmith\./)).toBeInTheDocument()
  })

  it('falls back to the flagship plan when nothing is approved yet', () => {
    renderPage()
    expect(screen.getAllByText(/flagpilot_onboarding_cta/).length).toBeGreaterThan(0)
  })

  it.each([
    ['loaded', { isLoading: false, isFetching: false, error: null }, /Flagsmith:\s*loaded/],
    ['loading', { isLoading: true, isFetching: true, error: null }, /Flagsmith:\s*loading/],
    ['error without raw text', { isLoading: false, isFetching: false, error: new Error('secret detail') }, /Flagsmith:\s*SDK error/],
  ])('shows honest Flagsmith state: %s', (_n, state, re) => {
    m.useFlagsmithLoading.mockReturnValue(state)
    renderPage()
    expect(screen.getByText(re)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('secret detail')
    expect(document.body.textContent).not.toMatch(/Events enabled|flush error/i)
  })

  it('renders four approval blocks, the target and the shell note', () => {
    renderPage()
    expect(screen.getByText('Target: project FlagPilot / environment Development')).toBeInTheDocument()
    expect(screen.getByText('bash / Git Bash only')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: /^Step \d — approval #\d, run separately/ })).toHaveLength(4)
    expect(document.querySelectorAll('pre')).toHaveLength(4)
  })

  it('without a key shows not configured and calls no SDK hooks', () => {
    m.env.hasFlagsmithKey = false
    renderPage(false)
    expect(screen.getByText(/Flagsmith:\s*not configured/)).toBeInTheDocument()
    expect(m.useFlags).not.toHaveBeenCalled()
    expect(m.useFlagsmithLoading).not.toHaveBeenCalled()
  })
})
