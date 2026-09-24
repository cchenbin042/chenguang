import { beforeEach, describe, expect, it } from "vitest"
import { authStorage } from "./auth-storage"

describe("authStorage", () => {
  beforeEach(() => localStorage.clear())

  it("round-trips a versioned token", () => {
    authStorage.setToken("jwt-token")
    expect(localStorage.getItem("chenguang.auth.v1")).toBe(
      JSON.stringify({ version: 1, token: "jwt-token" }),
    )
    expect(authStorage.getToken()).toBe("jwt-token")
    authStorage.clear()
    expect(authStorage.getToken()).toBeNull()
  })

  it("removes malformed and outdated values", () => {
    for (const value of ["not-json", JSON.stringify({ version: 0, token: "old" })]) {
      localStorage.setItem("chenguang.auth.v1", value)
      expect(authStorage.getToken()).toBeNull()
      expect(localStorage.getItem("chenguang.auth.v1")).toBeNull()
    }
  })
})
