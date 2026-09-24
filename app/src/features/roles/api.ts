import { apiRequest } from "@/lib/api-client"
import type { PageResult } from "@/lib/api-types"
import type { RoleCreateInput, RoleListParams, RoleRead, RoleUpdateInput } from "./types"

/**
 * 角色接口。
 * 注意：后端角色 CRUD 的真实路径是 /api/v1/roles/roles（router 前缀与装饰器重复），
 * 只有「分配权限」是 /api/v1/roles/{id}/permissions。前端按现状对接，等后端统一后再改这里。
 */
export function listRoles(params: RoleListParams): Promise<PageResult<RoleRead>> {
  const query = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.page_size),
  })
  if (params.keyword) query.set("keyword", params.keyword)

  return apiRequest<PageResult<RoleRead>>(`/api/v1/roles/roles?${query.toString()}`)
}

export function createRole(input: RoleCreateInput): Promise<RoleRead> {
  return apiRequest<RoleRead>("/api/v1/roles/roles", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function getRole(id: number): Promise<RoleRead> {
  return apiRequest<RoleRead>(`/api/v1/roles/roles/${id}`)
}

export function updateRole(id: number, input: RoleUpdateInput): Promise<RoleRead> {
  return apiRequest<RoleRead>(`/api/v1/roles/roles/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export function deleteRole(id: number): Promise<null> {
  return apiRequest<null>(`/api/v1/roles/roles/${id}`, { method: "DELETE" })
}

/** 请求体是 { permission_ids: [...] }，整体替换该角色的权限 */
export function assignRolePermissions(id: number, permissionIds: number[]): Promise<RoleRead> {
  return apiRequest<RoleRead>(`/api/v1/roles/${id}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permission_ids: permissionIds }),
  })
}
