import { describe, expect, it } from 'vitest'
import { generatePlan, NAME_RE, validatePlan } from './plan'

describe('generatePlan', () => {
  it('flagship question returns the real experiment', () => {
    const p = generatePlan({ question: '  does benefit-oriented CTA copy increase demo completion? ' })
    expect(p.flagKey).toBe('flagpilot_onboarding_cta')
    expect(p.hypothesis).toBe('Benefit-oriented CTA copy increases genuine demo completion.')
    expect(p.variants).toEqual([
      { key: 'control', label: 'Create your first experiment', description: expect.any(String) },
      { key: 'benefit_copy', label: 'Launch an experiment in minutes', description: expect.any(String) },
    ])
    expect(p.primaryMetric).toEqual({ event: 'flagpilot_demo_completed', aggregation: 'occurrence', direction: 'up' })
    expect(p.diagnosticEvent).toBe('flagpilot_primary_cta_clicked')
    expect(p.allocation).toEqual({ control: 50, treatment: 50 })
  })

  it('is deterministic', () => {
    const q = { question: 'Will a shorter signup form raise registrations?' }
    expect(generatePlan(q)).toEqual(generatePlan(q))
  })

  it.each([
    ['Should the hero button say Start free?', 'cta'],
    ['Does a checklist improve onboarding completion?', 'onboarding'],
    ['Will annual pricing shown first increase upgrades?', 'pricing'],
    ['Will a shorter signup form raise registrations?', 'signup'],
    ['Do testimonials help?', 'generic'],
  ])('routes %s to %s and produces a valid plan', (question, template) => {
    const p = generatePlan({ question })
    expect(p.flagKey.startsWith(`${template}_`)).toBe(true)
    expect(validatePlan(p)).toEqual([])
  })

  it.each(['🚀🚀 better results? 🚀🚀', 'क्या नया बटन बेहतर है?'])('non-ASCII question %s still yields a valid flagKey', (q) => {
    expect(generatePlan({ question: q }).flagKey).toMatch(NAME_RE)
  })

  it('uses successAction for the metric event when given', () => {
    expect(generatePlan({ question: 'Do testimonials help?', successAction: 'Booked a demo!' }).primaryMetric.event).toBe('booked_a_demo')
  })
})

describe('validatePlan', () => {
  it('reports each rule', () => {
    const p = generatePlan({ question: 'Do testimonials help?' })
    const bad = {
      ...p,
      hypothesis: '  ',
      flagKey: 'Bad Key',
      variants: [
        { ...p.variants[0], key: 'treat' },
        { ...p.variants[1], key: 'treat' },
      ],
      primaryMetric: { ...p.primaryMetric, event: 'x' },
    } as unknown as typeof p
    const errors = validatePlan(bad)
    expect(errors).toHaveLength(5)
    expect(new Set(errors).size).toBe(5)
  })

  it('rejects an invalid treatment variant key', () => {
    const p = generatePlan({ question: 'Do testimonials help?' })
    const bad = { ...p, variants: [p.variants[0], { ...p.variants[1], key: 'x; rm -rf' }] } as typeof p
    expect(validatePlan(bad)).toEqual([expect.stringMatching(/treatment variant key/i)])
  })
})
