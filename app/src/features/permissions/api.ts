import { apiRequest } from "@/lib/api-client"
import type { PageResult } from "@/lib/api-types"
import type { PermissionCreateInput, PermissionListParams, PermissionRead, PermissionUpdateInput } from "./types"

/** 权限列表路径带尾斜杠，与后端路由声明一致 */
export function listPermissions(params: PermissionListParams): Promise<PageResult<PermissionRead>> {
  const query = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.page_size),
  })
  if (params.keyword) query.set("keyword", params.keyword)

  return apiRequest<PageResult<PermissionRead>>(`/api/v1/permissions/?${query.toString()}`)
}

export function createPermission(input: PermissionCreateInput): Promise<PermissionRead> {
  return apiRequest<PermissionRead>("/api/v1/permissions", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function getPermission(id: number): Promise<PermissionRead> {
  return apiRequest<PermissionRead>(`/api/v1/permissions/${id}`)
}

export function updatePermission(id: number, input: PermissionUpdateInput): Promise<PermissionRead> {
  return apiRequest<PermissionRead>(`/api/v1/permissions/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export function deletePermission(id: number): Promise<PermissionRead> {
  return apiRequest<PermissionRead>(`/api/v1/permissions/${id}`, { method: "DELETE" })
}
