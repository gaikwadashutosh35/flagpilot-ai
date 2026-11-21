import flagsmith from '@flagsmith/flagsmith'
import { readStore, writeStore } from '../storage'
import { EVENTS } from './constants'

export type CompleteResult =
  | { sent: true }
  | { sent: false; reason: 'unavailable' | 'cta_not_seen' | 'already_counted' }

const seenKey = (id: string) => `flagpilot.ctaSeen.${id}`
const completedKey = (id: string) => `flagpilot.completedFor.${id}`

let lastFlushError: string | null = null
export const getLastFlushError = () => lastFlushError

export function markCtaSeen(visitorId: string): void {
  writeStore(seenKey(visitorId), '1')
}

export function trackCtaClick(available: boolean): void {
  if (available) flagsmith.trackEvent(EVENTS.ctaClicked)
}

export async function completeDemo(visitorId: string, available: boolean): Promise<CompleteResult> {
  if (!available) return { sent: false, reason: 'unavailable' }
  if (!readStore(seenKey(visitorId))) return { sent: false, reason: 'cta_not_seen' }
  if (readStore(completedKey(visitorId))) return { sent: false, reason: 'already_counted' }
  flagsmith.trackEvent(EVENTS.demoCompleted)
  writeStore(completedKey(visitorId), '1')
  try {
    await flagsmith.flushEvents()
    lastFlushError = null
  } catch (e) {
    lastFlushError = e instanceof Error ? e.message : String(e)
  }
  return { sent: true }
}
