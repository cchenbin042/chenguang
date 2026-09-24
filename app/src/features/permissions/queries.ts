import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createPermission, deletePermission, getPermission, listPermissions, updatePermission } from "./api"
import type { PermissionListParams, PermissionUpdateInput } from "./types"

export const permissionKeys = {
  root: ["permissions"] as const,
  listRoot: ["permissions", "list"] as const,
  list: (params: PermissionListParams) => ["permissions", "list", params] as const,
  detail: (id: number) => ["permissions", "detail", id] as const,
}

export function usePermissionList(params: PermissionListParams) {
  return useQuery({
    queryKey: permissionKeys.list(params),
    queryFn: () => listPermissions(params),
    placeholderData: keepPreviousData,
  })
}

export function usePermissionDetail(id: number | null) {
  return useQuery({
    queryKey: permissionKeys.detail(id ?? 0),
    queryFn: () => getPermission(id as number),
    enabled: id !== null,
  })
}

/** 权限的增删改都会影响列表、详情，以及角色页的权限勾选项 */
function useInvalidatePermissions() {
  const queryClient = useQueryClient()

  return () => {
    void queryClient.invalidateQueries({ queryKey: permissionKeys.root })
  }
}

export function useCreatePermission() {
  const invalidate = useInvalidatePermissions()
  return useMutation({ mutationFn: createPermission, onSuccess: invalidate })
}

export function useUpdatePermission() {
  const invalidate = useInvalidatePermissions()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: PermissionUpdateInput }) => updatePermission(id, input),
    onSuccess: invalidate,
  })
}

export function useDeletePermission() {
  const invalidate = useInvalidatePermissions()
  return useMutation({ mutationFn: deletePermission, onSuccess: invalidate })
}
