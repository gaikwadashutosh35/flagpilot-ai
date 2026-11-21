// Safe localStorage with module-level in-memory fallback (storage may throw).
const mem = new Map<string, string>()

export function readStore(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? mem.get(key) ?? null
  } catch {
    return mem.get(key) ?? null
  }
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
