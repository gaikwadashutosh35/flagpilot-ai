import { CTA_COPY, EVENTS, FLAG_KEY } from '@/lib/flagsmith/constants'

export type PlanInput = { question: string; successAction?: string }

export type ExperimentPlan = {
  title: string
  question: string
  hypothesis: string
  flagKey: string // ^[a-z][a-z0-9_]{2,49}$
  variants: [
    { key: 'control'; label: string; description: string },
    { key: string; label: string; description: string }, // treatment, key ≠ 'control'
  ]
  primaryMetric: { event: string; aggregation: 'occurrence'; direction: 'up' }
  diagnosticEvent?: string // same regex as event names
  allocation: { control: 50; treatment: 50 }
  risks: string[]
}

export const NAME_RE = /^[a-z][a-z0-9_]{2,49}$/

export const FLAGSHIP_QUESTION = 'Does benefit-oriented CTA copy increase demo completion?'

type Template = 'cta' | 'onboarding' | 'pricing' | 'signup' | 'generic'

// Order matters: first match wins. ponytail: plain keyword match, no scoring.
const ROUTES: [Template, RegExp][] = [
  ['signup', /\b(sign ?ups?|register|registrations?|forms?)\b/],
  ['pricing', /\b(pric\w*|plans?|upgrades?|subscriptions?|billing)\b/],
  ['onboarding', /\b(onboarding|checklist|tour|walkthrough|welcome)\b/],
  ['cta', /\b(cta|buttons?|copy|headlines?|wording|say|label)\b/],
]

const TEMPLATES: Record<Template, { title: string; control: string; treatment: string; treatmentKey: string; defaultEvent: string; risk: string }> = {
  cta: { title: 'CTA copy test', control: 'Current CTA copy', treatment: 'New CTA copy', treatmentKey: 'new_copy', defaultEvent: 'cta_conversion', risk: 'Clicks may not translate into real conversions.' },
  onboarding: { title: 'Onboarding flow test', control: 'Current onboarding', treatment: 'Improved onboarding', treatmentKey: 'new_onboarding', defaultEvent: 'onboarding_completed', risk: 'Users who drop out early may bias completion.' },
  pricing: { title: 'Pricing presentation test', control: 'Current pricing layout', treatment: 'New pricing layout', treatmentKey: 'new_pricing', defaultEvent: 'plan_upgraded', risk: 'Upgrades are rare, so results may stay inconclusive.' },
  signup: { title: 'Signup form test', control: 'Current signup form', treatment: 'Shorter signup form', treatmentKey: 'short_form', defaultEvent: 'signup_completed', risk: 'A shorter form may attract lower-quality signups.' },
  generic: { title: 'Product experiment', control: 'Current experience', treatment: 'New experience', treatmentKey: 'treatment', defaultEvent: 'goal_completed', risk: 'The change is broad, so any effect may be hard to attribute.' },
}

const slug = (s: string, words = Infinity) =>
  (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).slice(0, words).join('_')

export function generatePlan({ question, successAction }: PlanInput): ExperimentPlan {
  const q = question.trim()
  const risks = ['Low traffic may leave the result inconclusive.']

  if (q.toLowerCase() === FLAGSHIP_QUESTION.toLowerCase()) {
    return {
      title: 'Benefit-oriented CTA copy',
      question: q,
      hypothesis: 'Benefit-oriented CTA copy increases genuine demo completion.',
      flagKey: FLAG_KEY,
      variants: [
        { key: 'control', label: CTA_COPY.control, description: 'Current feature-oriented call to action.' },
        { key: 'benefit_copy', label: CTA_COPY.benefit_copy, description: 'Call to action that states the benefit.' },
      ],
      primaryMetric: { event: EVENTS.demoCompleted, aggregation: 'occurrence', direction: 'up' },
      diagnosticEvent: EVENTS.ctaClicked,
      allocation: { control: 50, treatment: 50 },
      risks: [...risks, 'Clicks are diagnostic only; success is genuine demo completion.'],
    }
  }

  const lower = q.toLowerCase()
  const template = ROUTES.find(([, re]) => re.test(lower))?.[0] ?? 'generic'
  const t = TEMPLATES[template]
  let event = slug(successAction ?? '')
  if (event && !/^[a-z]/.test(event)) event = `event_${event}`
  event = event.slice(0, 50)
  if (!NAME_RE.test(event)) event = t.defaultEvent

  return {
    title: t.title,
    question: q,
    hypothesis: `${t.treatment} increases ${event.replace(/_/g, ' ')} compared with ${t.control.toLowerCase()}.`,
    flagKey: `${template}_${slug(q, 4) || 'experiment'}`.slice(0, 50),
    variants: [
      { key: 'control', label: t.control, description: 'Existing behavior.' },
      { key: t.treatmentKey, label: t.treatment, description: 'Proposed change.' },
    ],
    primaryMetric: { event, aggregation: 'occurrence', direction: 'up' },
    allocation: { control: 50, treatment: 50 },
    risks: [...risks, t.risk],
  }
}

export function validatePlan(plan: ExperimentPlan): string[] {
  const errors: string[] = []
  if (!plan.title.trim()) errors.push('Title is required.')
  if (!plan.question.trim()) errors.push('Question is required.')
  if (!plan.hypothesis.trim()) errors.push('Hypothesis is required.')
  if (!NAME_RE.test(plan.flagKey))
    errors.push('Flag key must start with a lowercase letter and use only lowercase letters, digits and underscores (3-50 characters).')
  const keys = plan.variants.map((v) => v.key)
  if (new Set(keys).size !== keys.length) errors.push('Variant keys must be distinct.')
  if (keys[0] !== 'control') errors.push('The first variant must have the key "control".')
  if (!NAME_RE.test(plan.variants[1].key))
    errors.push('Treatment variant key must start with a lowercase letter and use only lowercase letters, digits and underscores (3-50 characters).')
  if (plan.variants.some((v) => !v.label.trim())) errors.push('Every variant needs a label.')
  if (!NAME_RE.test(plan.primaryMetric.event))
    errors.push('Primary metric event name must start with a lowercase letter and use only lowercase letters, digits and underscores (3-50 characters).')
  if (plan.diagnosticEvent !== undefined && !NAME_RE.test(plan.diagnosticEvent))
    errors.push('Diagnostic event name must start with a lowercase letter and use only lowercase letters, digits and underscores (3-50 characters).')
  if (plan.allocation.control + plan.allocation.treatment !== 100) errors.push('Allocation must add up to 100.')
  return errors
}
