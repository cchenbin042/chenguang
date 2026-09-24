export interface UserRead {
  id: number
  username: string
  email: string
  is_active: boolean
}

export interface UserRoleRead {
  id: number
  code: string
  name: string
  description: string | null
}

export interface UserWithRolesRead extends UserRead {
  roles: UserRoleRead[]
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
