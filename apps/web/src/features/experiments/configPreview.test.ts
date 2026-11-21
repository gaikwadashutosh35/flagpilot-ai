import { describe, expect, it } from 'vitest'
import { FLAGSHIP_QUESTION, generatePlan } from '../copilot/plan'
import { configPreview } from './configPreview'

describe('configPreview', () => {
  it('flagship plan maps to the exact CLI steps', () => {
    const steps = configPreview(generatePlan({ question: FLAGSHIP_QUESTION })).cliSteps
    expect(steps[0]).toBe('flagsmith feature create flagpilot_onboarding_cta --value control --enabled')
    expect(steps[1]).toBe('flagsmith feature variant add flagpilot_onboarding_cta --value benefit_copy --key benefit_copy --weight 0')
    expect(steps[2]).toContain('flagsmith api api/v1/environments/<ENV_KEY>/experiment-metrics/ -X POST --input -')
    expect(steps[3]).toContain('<FLAG_ID>')
    expect(steps[3]).toContain('<METRIC_ID>')
    expect(steps.join('\n')).not.toMatch(/ser\./)
  })

  it('maps resources from the plan', () => {
    const p = configPreview(generatePlan({ question: FLAGSHIP_QUESTION }))
    expect(p.flag.variations).toEqual([{ key: 'benefit_copy', value: 'benefit_copy', weight: 0 }])
    expect(p.metric.name).toBe('Demo completed')
    expect(p.metric).toMatchObject({ event: 'flagpilot_demo_completed', aggregation: 'occurrence', direction: 'up' })
    expect(p.experiment.allocation).toEqual({ control: 50, benefit_copy: 50 })
  })

  it('uses a sentence-case metric name for other events', () => {
    const plan = generatePlan({ question: 'Does a shorter signup form help?', successAction: 'signup_completed' })
    expect(configPreview(plan).metric.name).toBe('Signup completed')
  })

  it('emits bodies via quoted heredoc so apostrophes stay verbatim', () => {
    const plan = { ...generatePlan({ question: FLAGSHIP_QUESTION }), hypothesis: "Visitor's copy wins" }
    const steps = configPreview(plan).cliSteps
    expect(steps[3]).toContain("Visitor's copy wins")
    expect(steps[3]).toContain("-X POST --input - <<'JSON'\n")
    expect(steps[3].endsWith('\nJSON')).toBe(true)
    expect(steps.join('\n')).not.toContain("echo '")
  })
})
