const STORAGE_KEY = "chenguang.auth.v1"

export const authStorage = {
  getToken(): string | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === null) return null

      const stored: unknown = JSON.parse(raw)
      if (
        typeof stored === "object" &&
        stored !== null &&
        "version" in stored &&
        stored.version === 1 &&
        "token" in stored &&
        typeof stored.token === "string" &&
        stored.token.length > 0
      ) {
        return stored.token
      }

      localStorage.removeItem(STORAGE_KEY)
      return null
    } catch {
      this.clear()
      return null
    }
  },

  setToken(token: string): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, token }))
    } catch {
      // Storage may be disabled or full; the caller can still use the token in memory.
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage may be unavailable.
    }
  },
}
