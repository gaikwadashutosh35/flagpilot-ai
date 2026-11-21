import { readStore, writeStore } from './storage'

const KEY = 'flagpilot.visitorId'
const VALID = /^fp_[0-9a-f-]{36}$/

export function getVisitorId(): { id: string; persistent: boolean } {
  const { value, persistent } = readStore(KEY)
  if (value && VALID.test(value)) return { id: value, persistent }
  const id = `fp_${crypto.randomUUID()}`
  return { id, persistent: writeStore(KEY, id) }
}
