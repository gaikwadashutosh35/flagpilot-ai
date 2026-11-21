import { describe, expect, it } from 'vitest'
import { FLAGSHIP_QUESTION, generatePlan } from '../copilot/plan'
import { configPreview } from './configPreview'

describe('configPreview', () => {
  it('flagship plan maps to the exact CLI steps', () => {
    const steps = configPreview(generatePlan({ question: FLAGSHIP_QUESTION })).blocks.flatMap((b) => b.commands)
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
    const steps = configPreview(plan).blocks.flatMap((b) => b.commands)
    expect(steps[3]).toContain("Visitor's copy wins")
    expect(steps[3]).toContain("-X POST --input - <<'JSON'\n")
    expect(steps[3].endsWith('\nJSON')).toBe(true)
    expect(steps.join('\n')).not.toContain("echo '")
  })

  it('splits into four blocks, one approval each, with step 1 holding flag create and variant add', () => {
    const { blocks, valid } = configPreview(generatePlan({ question: FLAGSHIP_QUESTION }))
    expect(valid).toBe(true)
    expect(blocks.map((b) => b.heading)).toEqual([
      'Step 1 — approval #1, run separately',
      'Step 2 — approval #2, run separately',
      'Step 3 — approval #3, run separately',
      'Step 4 — approval #4, run separately — only after step 3 succeeded',
    ])
    expect(blocks.map((b) => b.commands.length)).toEqual([2, 1, 1, 1])
  })

  it('escapes non-ASCII (line separators, bidi overrides) in JSON bodies', () => {
    const plan = { ...generatePlan({ question: FLAGSHIP_QUESTION }), hypothesis: 'a\u2028b\u202Ec\u200Bd' }
    const text = configPreview(plan).blocks.flatMap((b) => b.commands).join('\n')
    expect(text).toContain(String.raw`a\u2028b\u202ec\u200bd`)
    expect([...text].every((c) => c.charCodeAt(0) < 128)).toBe(true)
  })

  it('emits no commands for an invalid plan', () => {
    const plan = { ...generatePlan({ question: FLAGSHIP_QUESTION }), flagKey: 'x; rm -rf ~' }
    expect(configPreview(plan)).toMatchObject({ valid: false, blocks: [] })
  })
})
