import { apiRequest } from "@/lib/api-client"
import type { PageResult } from "@/lib/api-types"
import type { UserCreateInput, UserListParams, UserRead, UserWithRolesRead } from "./types"

export function listUsers(params: UserListParams): Promise<PageResult<UserRead>> {
  const query = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.page_size),
  })
  if (params.keyword) query.set("keyword", params.keyword)

  return apiRequest<PageResult<UserRead>>(`/api/v1/users?${query.toString()}`)
}

export function createUser(input: UserCreateInput): Promise<UserRead> {
  return apiRequest<UserRead>("/api/v1/users", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function getUser(id: number): Promise<UserRead> {
  return apiRequest<UserRead>(`/api/v1/users/${id}`)
}

/** 后端把用户角色包在单元素数组里返回，这里规范化为单个对象 */
export async function getUserRoles(id: number): Promise<UserWithRolesRead | null> {
  const users = await apiRequest<UserWithRolesRead[]>(`/api/v1/users/${id}/roles`)
  const user = users[0]
  if (!user) return null

  return { ...user, roles: user.roles ?? [] }
}

/** 请求体是裸的角色 ID 数组，不是 { role_ids: [...] } */
export function assignUserRoles(id: number, roleIds: number[]): Promise<UserRead> {
  return apiRequest<UserRead>(`/api/v1/users/${id}/roles`, {
    method: "PUT",
    body: JSON.stringify(roleIds),
  })
}
