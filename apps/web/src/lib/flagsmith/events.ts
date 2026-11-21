import flagsmith from '@flagsmith/flagsmith'
import { readStore, writeStore } from '../storage'
import { EVENTS } from './constants'

export type CompleteResult =
  | { sent: true }
  | { sent: false; reason: 'unavailable' | 'cta_not_seen' | 'already_counted' }

const SEEN_KEY = 'flagpilot.ctaSeenFor'
const COMPLETED_KEY = 'flagpilot.completedFor'

let lastFlushError: string | null = null
export const getLastFlushError = () => lastFlushError

export function markCtaSeen(visitorId: string): void {
  writeStore(SEEN_KEY, visitorId)
}

export function trackCtaClick(available: boolean): void {
  if (available) flagsmith.trackEvent(EVENTS.ctaClicked)
}

export async function completeDemo(visitorId: string, available: boolean): Promise<CompleteResult> {
  if (!available) return { sent: false, reason: 'unavailable' }
  if (readStore(SEEN_KEY).value !== visitorId) return { sent: false, reason: 'cta_not_seen' }
  if (readStore(COMPLETED_KEY).value === visitorId) return { sent: false, reason: 'already_counted' }
  flagsmith.trackEvent(EVENTS.demoCompleted)
  writeStore(COMPLETED_KEY, visitorId)
  try {
    await flagsmith.flushEvents()
    lastFlushError = null
  } catch (e) {
    lastFlushError = e instanceof Error ? e.message : String(e)
  }
  return { sent: true }
}
