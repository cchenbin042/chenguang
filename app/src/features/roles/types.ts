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
  /**
   * 列表接口的 response_model 声明成了 PageResult[PermissionRead]，
   * FastAPI 会把该字段裁掉，因此列表里它是 undefined，只有详情接口才返回。
   */
  permissions?: RolePermissionRead[]
}

export interface RoleListParams {
  page: number
  page_size: number
  keyword?: string
}

export interface RoleCreateInput {
  code: string
  name: string
  description?: string
}

/** 后端不允许修改 code，更新请求只包含名称与描述 */
export interface RoleUpdateInput {
  name: string
  description?: string
}

/** 角色下拉/勾选列表一次加载的上限；总数超过它时必须明确提示，不能静默遗漏 */
export const ROLE_OPTIONS_PAGE_SIZE = 100
