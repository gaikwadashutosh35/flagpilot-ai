import { readStore, writeStore } from './storage'

const KEY = 'flagpilot.visitorId'
const VALID = /^fp_[0-9a-f-]{36}$/

let cached: { id: string; persistent: boolean } | undefined

// One identity per page load: exposure, conversion and the SDK all see the same id.
export function getVisitorId(): { id: string; persistent: boolean } {
  if (cached) return cached
  const { value, persistent } = readStore(KEY)
  if (value && VALID.test(value)) return (cached = { id: value, persistent })
  const id = `fp_${crypto.randomUUID()}`
  return (cached = { id, persistent: writeStore(KEY, id) })
}
