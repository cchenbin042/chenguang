import { apiRequest } from "@/lib/api-client"
import type { PageResult } from "@/lib/api-types"
import type { RoleListParams, RoleRead } from "./types"

/**
 * 角色列表。
 * 注意：后端角色 CRUD 的真实路径是 /api/v1/roles/roles（router 前缀与装饰器重复），
 * 前端按现状对接，等后端统一路径后再改这一处。
 */
export function listRoles(params: RoleListParams): Promise<PageResult<RoleRead>> {
  const query = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.page_size),
  })
  if (params.keyword) query.set("keyword", params.keyword)

  return apiRequest<PageResult<RoleRead>>(`/api/v1/roles/roles?${query.toString()}`)
}
