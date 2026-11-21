export const FLAG_KEY = 'flagpilot_onboarding_cta' as const

export const EVENTS = {
  demoCompleted: 'flagpilot_demo_completed',
  ctaClicked: 'flagpilot_primary_cta_clicked',
} as const

export const CTA_COPY = {
  control: 'Create your first experiment',
  benefit_copy: 'Launch an experiment in minutes',
}

const warned = new Set<string>()

export function ctaCopyFor(variant: string | null | undefined): string {
  if (variant === 'benefit_copy') return CTA_COPY.benefit_copy
  if (variant && variant !== 'control' && !warned.has(variant)) {
    warned.add(variant)
    console.warn(`Unknown variant "${variant}" for ${FLAG_KEY}; showing control copy.`)
  }
  return CTA_COPY.control
}
