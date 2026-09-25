import { describe, expect, it } from "vitest"
import type { RoleRead } from "@/features/roles/types"
import { collectEffectivePermissions } from "./effective-permissions"

function role(id: number, name: string, permissionIds: number[]): RoleRead {
  return {
    id,
    code: `role-${id}`,
    name,
    description: null,
    permissions: permissionIds.map((permissionId) => ({
      id: permissionId,
      code: `perm-${permissionId}`,
      name: `权限${permissionId}`,
      description: null,
    })),
  }
}

describe("collectEffectivePermissions", () => {
  it("按首次出现顺序合并多个角色的权限", () => {
    const result = collectEffectivePermissions([role(1, "管理员", [10, 20]), role(2, "开发", [30])])

    expect(result.map((item) => item.id)).toEqual([10, 20, 30])
  })

  it("同一权限被多个角色授予时只保留一行并记录全部来源", () => {
    const result = collectEffectivePermissions([role(1, "管理员", [10]), role(2, "开发", [10, 30])])

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe(10)
    expect(result[0].sources).toEqual([
      { id: 1, name: "管理员" },
      { id: 2, name: "开发" },
    ])
  })

  it("用户没有任何角色时返回空数组", () => {
    expect(collectEffectivePermissions([])).toEqual([])
  })

  it("角色的 permissions 缺失时不抛错", () => {
    const withoutPermissions: RoleRead = { id: 3, code: "viewer", name: "只读", description: null }

    expect(collectEffectivePermissions([withoutPermissions])).toEqual([])
  })
})
