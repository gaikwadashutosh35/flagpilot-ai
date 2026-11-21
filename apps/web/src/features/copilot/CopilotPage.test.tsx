import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  trackEvent: vi.fn(),
  flushEvents: vi.fn(),
  useFlags: vi.fn(),
}))

vi.mock('@flagsmith/flagsmith', () => ({
  default: { trackEvent: m.trackEvent, flushEvents: m.flushEvents },
}))
// storage.ts keeps an in-memory fallback that survives localStorage.clear(), so each test gets a fresh visitor.
vi.mock('@/lib/identity', () => {
  let n = 0
  let id = 'visitor-0'
  return { getVisitorId: () => ({ id, persistent: true }), __next: () => (id = `visitor-${++n}`) }
})
vi.mock('@flagsmith/flagsmith/react', () => ({
  useFlags: m.useFlags,
  FlagsmithProvider: ({ children }: { children: React.ReactNode }) => children,
}))

import { FlagsmithAvailableContext } from '@/lib/flagsmith/FlagsmithRoot'
import { markCtaSeen } from '@/lib/flagsmith/events'
import * as identity from '@/lib/identity'
import { getVisitorId } from '@/lib/identity'
import { ApprovedPlanProvider } from './approvedPlan'
import { CopilotPage } from './CopilotPage'

const FLAGSHIP = 'Does benefit-oriented CTA copy increase demo completion?'

function setup({ available = true, seen = true } = {}) {
  if (seen) markCtaSeen(getVisitorId().id)
  const user = userEvent.setup()
  render(
    <FlagsmithAvailableContext.Provider value={available}>
      <ApprovedPlanProvider>
        <MemoryRouter>
          <CopilotPage />
        </MemoryRouter>
      </ApprovedPlanProvider>
    </FlagsmithAvailableContext.Provider>,
  )
  return user
}

const next = () => screen.getByRole('button', { name: /^next/i })

async function toReview(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: FLAGSHIP }))
  await user.click(next())
  await user.click(next())
}

describe('CopilotPage', () => {
  beforeEach(() => {
    localStorage.clear()
    ;(identity as unknown as { __next: () => void }).__next()
    vi.clearAllMocks()
    m.flushEvents.mockResolvedValue(undefined)
    m.useFlags.mockReturnValue({ flagpilot_onboarding_cta: { variant: 'benefit_copy' } })
  })

  it('blocks Next until the question is 10–500 chars', async () => {
    const user = setup()
    expect(next()).toBeDisabled()
    await user.type(screen.getByLabelText(/question/i), 'too short')
    expect(next()).toBeDisabled()
    await user.type(screen.getByLabelText(/question/i), ' now long enough')
    expect(next()).toBeEnabled()
  })

  it('suggestion chip fills the flagship question and Next shows the flagship plan', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: FLAGSHIP }))
    expect(screen.getByLabelText(/question/i)).toHaveValue(FLAGSHIP)
    await user.click(next())
    expect(screen.getByLabelText(/flag key/i)).toHaveValue('flagpilot_onboarding_cta')
    expect(screen.getByLabelText(/title/i)).toHaveValue('Benefit-oriented CTA copy')
  })

  it('limits the success field to 200 characters', () => {
    setup()
    expect(screen.getByLabelText(/what counts as success/i)).toHaveAttribute('maxlength', '200')
  })

  it('editing flagKey to "Bad Key" shows an inline error and disables moving on', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: FLAGSHIP }))
    await user.click(next())
    const key = screen.getByLabelText(/flag key/i)
    await user.clear(key)
    await user.type(key, 'Bad Key')
    expect(screen.getByRole('alert')).toHaveTextContent(/flag key/i)
    expect(next()).toBeDisabled()
  })

  it('Approve is disabled until the "I reviewed this plan" box is ticked', async () => {
    const user = setup()
    await toReview(user)
    const approve = screen.getByRole('button', { name: 'Approve plan' })
    expect(approve).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /i reviewed this plan/i }))
    expect(approve).toBeEnabled()
  })

  async function approve(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('checkbox', { name: /i reviewed this plan/i }))
    await user.click(screen.getByRole('button', { name: 'Approve plan' }))
  }

  it('approve sends flagpilot_demo_completed once and shows "Plan approved"', async () => {
    const user = setup()
    await toReview(user)
    await approve(user)
    expect(await screen.findByText('Plan approved')).toBeInTheDocument()
    expect(m.trackEvent).toHaveBeenCalledTimes(1)
    expect(m.trackEvent).toHaveBeenCalledWith('flagpilot_demo_completed')
    expect(screen.getByText(/benefit_copy/)).toBeInTheDocument()
  })

  it('double-click on Approve sends once and shows one Done view', async () => {
    const user = setup()
    await toReview(user)
    await user.click(screen.getByRole('checkbox', { name: /i reviewed this plan/i }))
    await user.dblClick(screen.getByRole('button', { name: 'Approve plan' }))
    expect(await screen.findAllByText('Plan approved')).toHaveLength(1)
    expect(m.trackEvent).toHaveBeenCalledTimes(1)
  })

  it('Start another plan then approve again shows "already counted for this visitor" and sends nothing', async () => {
    const user = setup()
    await toReview(user)
    await approve(user)
    await screen.findByText('Plan approved')
    await user.click(screen.getByRole('button', { name: 'Start another plan' }))
    await toReview(user)
    await approve(user)
    expect(await screen.findByText(/already counted for this visitor/)).toBeInTheDocument()
    expect(m.trackEvent).toHaveBeenCalledTimes(1)
  })

  it("direct visit without CTA seen: Done says \"not counted: you didn't arrive through the experiment CTA\"", async () => {
    const user = setup({ seen: false })
    await toReview(user)
    await approve(user)
    expect(
      await screen.findByText(/not counted: you didn't arrive through the experiment CTA/),
    ).toBeInTheDocument()
    expect(m.trackEvent).not.toHaveBeenCalled()
  })

  it('unavailable: Done says "Flagsmith unavailable" and shows "not assigned"', async () => {
    const user = setup({ available: false })
    await toReview(user)
    await approve(user)
    expect(await screen.findByText(/Flagsmith unavailable/)).toBeInTheDocument()
    expect(screen.getByText(/not assigned/)).toBeInTheDocument()
    expect(m.useFlags).not.toHaveBeenCalled()
    expect(m.trackEvent).not.toHaveBeenCalled()
  })

  it('user text renders as text (no HTML injection)', async () => {
    const user = setup()
    const evil = '<img src=x onerror=alert(1)>'
    await user.type(screen.getByLabelText(/question/i), evil)
    await user.click(next())
    await user.click(next())
    expect(screen.getByText(evil, { exact: false })).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })
})
