import type { RoleRead } from "@/features/roles/types"

/** 授予某个权限的角色 */
export interface EffectivePermissionSource {
  id: number
  name: string
}

/** 用户的有效权限：同一权限被多个角色授予时只占一行，来源全部记录在 sources 里 */
export interface EffectivePermission {
  id: number
  code: string
  name: string
  description: string | null
  sources: EffectivePermissionSource[]
}

/**
 * 汇总用户角色带来的权限。
 * 按权限 id 去重，保留首次出现的顺序；sources 按角色在入参中的顺序聚合。
 * 角色列表接口的 response_model 会裁掉 permissions，因此这里对 undefined 按空数组处理。
 */
export function collectEffectivePermissions(roles: RoleRead[]): EffectivePermission[] {
  const merged = new Map<number, EffectivePermission>()

  for (const role of roles) {
    for (const permission of role.permissions ?? []) {
      const existing = merged.get(permission.id)
      if (existing) {
        existing.sources.push({ id: role.id, name: role.name })
        continue
      }

      merged.set(permission.id, {
        id: permission.id,
        code: permission.code,
        name: permission.name,
        description: permission.description,
        sources: [{ id: role.id, name: role.name }],
      })
    }
  }

  return [...merged.values()]
}
