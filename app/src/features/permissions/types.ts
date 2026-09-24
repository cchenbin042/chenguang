export interface PermissionRead {
  id: number
  code: string
  name: string
  description: string | null
}

export interface PermissionListParams {
  page: number
  page_size: number
  keyword?: string
}

export interface PermissionCreateInput {
  code: string
  name: string
  description?: string
}

/** 权限编码创建后不可修改，更新请求只包含名称与描述 */
export interface PermissionUpdateInput {
  name: string
  description?: string
}

/** 权限勾选列表一次加载的上限；总数超过它时必须明确提示，不能静默遗漏 */
export const PERMISSION_OPTIONS_PAGE_SIZE = 100
