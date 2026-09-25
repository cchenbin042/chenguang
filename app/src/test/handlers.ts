import { HttpResponse, http } from "msw"
import type { PageResult } from "@/lib/api-types"

/**
 * 默认处理器：让页面挂载时的请求都有稳定响应，避免无关用例被未处理请求打断。
 * 具体用例通过 server.use(...) 覆盖，afterEach 里 resetHandlers() 会还原成这一份。
 */

export function ok<T>(data: T) {
  return HttpResponse.json({ code: 200, message: "success", data })
}

export function businessFailure(code: number, message: string, status = 200) {
  return HttpResponse.json({ code, message, data: null }, { status })
}

export function emptyPage(pageSize = 10): PageResult<never> {
  return { items: [], total: 0, page: 1, page_size: pageSize }
}

export const handlers = [
  http.get("/health", () => HttpResponse.json({ status: "ok" })),
  http.get("/api/v1/captcha", () =>
    ok({ key: "captcha:test-key", image: "data:image/png;base64,VEVTVA==" }),
  ),
  http.post("/api/v1/auth/login", () =>
    ok({ access_token: "test-token", token_type: "bearer" }),
  ),
  http.get("/api/v1/users/me", () =>
    ok({ id: 1, username: "admin", email: "admin@example.com", is_active: true }),
  ),
  http.get("/api/v1/users", () => ok(emptyPage())),
  // 后端该接口返回单元素数组，因此包一层数组
  http.get("/api/v1/users/:id/roles", ({ params }) =>
    ok([{ id: Number(params.id), username: "admin", email: "admin@example.com", is_active: true, roles: [] }]),
  ),
  http.get("/api/v1/users/:id", ({ params }) =>
    ok({ id: Number(params.id), username: "admin", email: "admin@example.com", is_active: true }),
  ),
  http.get("/api/v1/roles/roles", () => ok(emptyPage())),
  http.get("/api/v1/permissions/", () => ok(emptyPage())),
]
