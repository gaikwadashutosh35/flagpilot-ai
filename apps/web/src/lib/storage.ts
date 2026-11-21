// Safe localStorage with module-level in-memory fallback (storage may throw).
const mem = new Map<string, string>()

/** persistent is true only when the value was read from localStorage. */
export function readStore(key: string): { value: string | null; persistent: boolean } {
  try {
    const v = localStorage.getItem(key)
    if (v !== null) return { value: v, persistent: true }
  } catch {
    // fall through to memory
  }
  return { value: mem.get(key) ?? null, persistent: false }
}

/** Returns true if persisted to localStorage. */
export function writeStore(key: string, value: string): boolean {
  mem.set(key, value)
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}
