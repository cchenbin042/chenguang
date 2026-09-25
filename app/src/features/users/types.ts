import type { RoleRead } from "@/features/roles/types"

export interface UserRead {
  id: number
  username: string
  email: string
  is_active: boolean
}

/**
 * GET /api/v1/users/{id}/roles 的返回。
 * roles 复用角色域的类型：后端 UserWithRolesRead.roles 就是 list[RoleRead]，
 * 每个角色都带 permissions，因此可以直接聚合出用户的有效权限。
 */
export interface UserWithRolesRead extends UserRead {
  roles: RoleRead[]
}

export interface UserCreateInput {
  username: string
  email: string
  password: string
}

export interface UserListParams {
  page: number
  page_size: number
  keyword?: string
}

export const USER_PAGE_SIZE = 10
