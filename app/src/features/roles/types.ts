export interface RolePermissionRead {
  id: number
  code: string
  name: string
  description: string | null
}

export interface RoleRead {
  id: number
  code: string
  name: string
  description: string | null
  permissions: RolePermissionRead[]
}

export interface RoleListParams {
  page: number
  page_size: number
  keyword?: string
}

/** 角色下拉/勾选列表一次加载的上限；总数超过它时必须明确提示，不能静默遗漏 */
export const ROLE_OPTIONS_PAGE_SIZE = 100
