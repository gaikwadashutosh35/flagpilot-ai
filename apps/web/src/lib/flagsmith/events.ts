import flagsmith from '@flagsmith/flagsmith'
import { readStore, writeStore } from '../storage'
import { EVENTS } from './constants'

export type CompleteResult =
  | { sent: true }
  | { sent: false; reason: 'unavailable' | 'cta_not_seen' | 'already_counted' }

const SEEN_KEY = 'flagpilot.ctaSeenFor'
const COMPLETED_KEY = 'flagpilot.completedFor'

export function markCtaSeen(visitorId: string): void {
  writeStore(SEEN_KEY, visitorId)
}

// Fire-and-forget: the SDK buffers events (10 s timer) and has no unload handling, so flush now.
// flushEvents never rejects per SDK docs and may retry for several seconds; .catch is a guard.
export function flushNow(): void {
  void flagsmith.flushEvents().catch(() => {})
}

export function trackCtaClick(available: boolean): void {
  if (!available) return
  flagsmith.trackEvent(EVENTS.ctaClicked)
  flushNow()
}

export async function completeDemo(visitorId: string, available: boolean): Promise<CompleteResult> {
  if (!available) return { sent: false, reason: 'unavailable' }
  if (readStore(SEEN_KEY).value !== visitorId) return { sent: false, reason: 'cta_not_seen' }
  if (readStore(COMPLETED_KEY).value === visitorId) return { sent: false, reason: 'already_counted' }
  flagsmith.trackEvent(EVENTS.demoCompleted)
  writeStore(COMPLETED_KEY, visitorId)
  flushNow()
  return { sent: true }
}
