import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { apiRequest } from "./api-client"
import { ApiError } from "./api-types"
import { authStorage } from "./auth-storage"

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

describe("apiRequest", () => {
  beforeEach(() => authStorage.clear())
  afterEach(() => {
    authStorage.clear()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it("returns data for code 200", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: 200, message: "success", data: { id: 1 } }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(apiRequest<{ id: number }>("/api/v1/users/me")).resolves.toEqual({ id: 1 })
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/users/me", expect.any(Object))
  })

  it("throws ApiError for HTTP 200 business failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      jsonResponse({ code: 1001, message: "验证码已过期", data: null }),
    ))

    await expect(apiRequest("/api/v1/auth/login")).rejects.toMatchObject({
      name: "ApiError",
      message: "验证码已过期",
      code: 1001,
      status: 200,
    })
  })

  it("formats FastAPI 422 details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      detail: [
        { loc: ["body", "username"], msg: "Field required", type: "missing" },
        { loc: ["body", "age"], msg: "Input should be a valid integer", type: "int_parsing" },
      ],
    }, 422)))

    await expect(apiRequest("/api/v1/users")).rejects.toMatchObject({
      name: "ApiError",
      code: 422,
      status: 422,
      message: "body.username: Field required; body.age: Input should be a valid integer",
      issues: [
        { loc: ["body", "username"], msg: "Field required", type: "missing" },
        { loc: ["body", "age"], msg: "Input should be a valid integer", type: "int_parsing" },
      ],
    })
  })

  it("does not retain sensitive fields from FastAPI validation issues", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      detail: [{
        loc: ["body", "password"],
        msg: "Field required",
        type: "missing",
        input: { password: "secret-password" },
        ctx: { supplied: "secret-password" },
      }],
    }, 422)))

    try {
      await apiRequest("/api/v1/auth/login")
      expect.fail("Expected an ApiError")
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).issues).toEqual([
        { loc: ["body", "password"], msg: "Field required", type: "missing" },
      ])
    }
  })

  it("adds bearer token when available", async () => {
    authStorage.setToken("jwt-token")
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: 200, message: "success", data: null }))
    vi.stubGlobal("fetch", fetchMock)

    await apiRequest("/api/v1/users/me")

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new Headers(options.headers).get("Authorization")).toBe("Bearer jwt-token")
  })

  it("does not send content-type for a GET without body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: 200, message: "success", data: null }))
    vi.stubGlobal("fetch", fetchMock)

    await apiRequest("/api/v1/users")

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new Headers(options.headers).has("Content-Type")).toBe(false)
    expect(options.body).toBeUndefined()
  })

  it("throws ApiError for HTTP errors with a response envelope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      jsonResponse({ code: 403, message: "没有权限", data: null }, 403),
    ))

    await expect(apiRequest("/api/v1/roles")).rejects.toMatchObject({
      name: "ApiError",
      message: "没有权限",
      code: 403,
      status: 403,
    })
  })

  it("keeps the HTTP status when an error response is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Service unavailable", { status: 503 })))

    await expect(apiRequest("/api/v1/users")).rejects.toMatchObject({
      name: "ApiError",
      message: "请求失败 (503)",
      code: 503,
      status: 503,
    })
  })

  it("uses VITE_API_BASE_URL without duplicating slashes", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://example.com/backend/")
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: 200, message: "success", data: null }))
    vi.stubGlobal("fetch", fetchMock)

    await apiRequest("/api/v1/users")

    expect(fetchMock).toHaveBeenCalledWith("https://example.com/backend/api/v1/users", expect.any(Object))
  })

  it("forwards AbortSignal to fetch", async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: 200, message: "success", data: null }))
    vi.stubGlobal("fetch", fetchMock)

    await apiRequest("/api/v1/users", { signal: controller.signal })

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(options.signal).toBe(controller.signal)
  })

  it("sets JSON content-type when sending a body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: 200, message: "success", data: null }))
    vi.stubGlobal("fetch", fetchMock)

    await apiRequest("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ username: "admin" }) })

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new Headers(options.headers).get("Content-Type")).toBe("application/json")
  })

  it("exposes ApiError instances to callers", () => {
    expect(new ApiError("failure", 400, 400)).toBeInstanceOf(Error)
  })
})
