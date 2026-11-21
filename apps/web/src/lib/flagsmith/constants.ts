export const FLAG_KEY = 'flagpilot_onboarding_cta' as const

export const EVENTS = {
  demoCompleted: 'flagpilot_demo_completed',
  ctaClicked: 'flagpilot_primary_cta_clicked',
} as const

export const CTA_COPY = {
  control: 'Create your first experiment',
  benefit_copy: 'Launch an experiment in minutes',
}

export function ctaCopyFor(variant: string | null | undefined): string {
  return variant === 'benefit_copy' ? CTA_COPY.benefit_copy : CTA_COPY.control
}
