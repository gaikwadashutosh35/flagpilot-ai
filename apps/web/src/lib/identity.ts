import { readStore, writeStore } from './storage'

const KEY = 'flagpilot.visitorId'
const VALID = /^fp_[0-9a-f-]{36}$/

export function getVisitorId(): { id: string; persistent: boolean } {
  const stored = readStore(KEY)
  if (stored && VALID.test(stored)) {
    return { id: stored, persistent: isPersisted(stored) }
  }
  const id = `fp_${crypto.randomUUID()}`
  return { id, persistent: writeStore(KEY, id) }
}

function isPersisted(id: string): boolean {
  try {
    return localStorage.getItem(KEY) === id
  } catch {
    return false
  }
}
