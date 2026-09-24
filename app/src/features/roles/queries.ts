import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listPermissions } from "@/features/permissions/api"
import { PERMISSION_OPTIONS_PAGE_SIZE, type PermissionRead } from "@/features/permissions/types"
import { assignRolePermissions, createRole, deleteRole, getRole, listRoles, updateRole } from "./api"
import type { RoleListParams, RoleUpdateInput } from "./types"

export const roleKeys = {
  root: ["roles"] as const,
  listRoot: ["roles", "list"] as const,
  list: (params: RoleListParams) => ["roles", "list", params] as const,
  detail: (id: number) => ["roles", "detail", id] as const,
}

export const permissionOptionsKey = ["permissions", "options"] as const

export function useRoleList(params: RoleListParams) {
  return useQuery({
    queryKey: roleKeys.list(params),
    queryFn: () => listRoles(params),
    placeholderData: keepPreviousData,
  })
}

export function useRoleDetail(id: number | null) {
  return useQuery({
    queryKey: roleKeys.detail(id ?? 0),
    queryFn: () => getRole(id as number),
    enabled: id !== null,
  })
}

/** 权限勾选列表：一次拉满上限，总数超过上限时由调用方提示 */
export function usePermissionOptions() {
  return useQuery({
    queryKey: permissionOptionsKey,
    queryFn: () => listPermissions({ page: 1, page_size: PERMISSION_OPTIONS_PAGE_SIZE }),
    select: (page): { items: PermissionRead[]; total: number; truncated: boolean } => ({
      items: page.items,
      total: page.total,
      truncated: page.total > PERMISSION_OPTIONS_PAGE_SIZE,
    }),
  })
}

/** 角色的增删改都会影响列表、详情，以及用户页的角色勾选项 */
function useInvalidateRoles() {
  const queryClient = useQueryClient()

  return () => {
    void queryClient.invalidateQueries({ queryKey: roleKeys.root })
  }
}

export function useCreateRole() {
  const invalidate = useInvalidateRoles()
  return useMutation({ mutationFn: createRole, onSuccess: invalidate })
}

export function useUpdateRole() {
  const invalidate = useInvalidateRoles()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: RoleUpdateInput }) => updateRole(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteRole() {
  const invalidate = useInvalidateRoles()
  return useMutation({ mutationFn: deleteRole, onSuccess: invalidate })
}

export function useAssignRolePermissions() {
  const invalidate = useInvalidateRoles()
  return useMutation({
    mutationFn: ({ id, permissionIds }: { id: number; permissionIds: number[] }) =>
      assignRolePermissions(id, permissionIds),
    onSuccess: invalidate,
  })
}
