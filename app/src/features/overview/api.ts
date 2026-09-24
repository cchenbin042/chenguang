import { apiRequest, apiUrl } from "@/lib/api-client"
import type { PageResult } from "@/lib/api-types"

export interface HealthStatus {
  status: string
}

/**
 * /health 是后端唯一不走 {code,message,data} 包裹的接口，只能直接用 fetch，
 * 否则会被 apiRequest 判定为「响应格式错误」。
 */
export async function getHealth(): Promise<HealthStatus> {
  const response = await fetch(apiUrl("/health"))
  if (!response.ok) throw new Error(`服务状态不可用 (${response.status})`)

  const body: unknown = await response.json()
  const status = typeof body === "object" && body !== null && "status" in body ? body.status : undefined
  return { status: typeof status === "string" ? status : "unknown" }
}

export function getUsersTotal(): Promise<PageResult<unknown>> {
  return apiRequest<PageResult<unknown>>("/api/v1/users?page=1&page_size=1")
}

export function getRolesTotal(): Promise<PageResult<unknown>> {
  return apiRequest<PageResult<unknown>>("/api/v1/roles/roles?page=1&page_size=1")
}

export function getPermissionsTotal(): Promise<PageResult<unknown>> {
  return apiRequest<PageResult<unknown>>("/api/v1/permissions/?page=1&page_size=1")
}
