import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listRoles } from "@/features/roles/api"
import { ROLE_OPTIONS_PAGE_SIZE } from "@/features/roles/types"
import type { RoleRead } from "@/features/roles/types"
import { assignUserRoles, createUser, getUser, getUserRoles, listUsers } from "./api"
import type { UserListParams } from "./types"

export const userKeys = {
  listRoot: ["users", "list"] as const,
  list: (params: UserListParams) => ["users", "list", params] as const,
  detail: (id: number) => ["users", "detail", id] as const,
  roles: (id: number) => ["users", "roles", id] as const,
}

export const roleOptionsKey = ["roles", "options"] as const

export function useUserList(params: UserListParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => listUsers(params),
    placeholderData: keepPreviousData,
  })
}

export function useUserDetail(id: number | null) {
  return useQuery({
    queryKey: userKeys.detail(id ?? 0),
    queryFn: () => getUser(id as number),
    enabled: id !== null,
  })
}

export function useUserRoles(id: number | null) {
  return useQuery({
    queryKey: userKeys.roles(id ?? 0),
    queryFn: () => getUserRoles(id as number),
    enabled: id !== null,
  })
}

/** 角色勾选列表：一次拉满上限，总数超过上限时由调用方提示 */
export function useRoleOptions() {
  return useQuery({
    queryKey: roleOptionsKey,
    queryFn: () => listRoles({ page: 1, page_size: ROLE_OPTIONS_PAGE_SIZE }),
    select: (page): { items: RoleRead[]; total: number; truncated: boolean } => ({
      items: page.items,
      total: page.total,
      truncated: page.total > ROLE_OPTIONS_PAGE_SIZE,
    }),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.listRoot })
    },
  })
}

export function useAssignUserRoles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, roleIds }: { id: number; roleIds: number[] }) => assignUserRoles(id, roleIds),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.roles(variables.id) })
      void queryClient.invalidateQueries({ queryKey: userKeys.listRoot })
    },
  })
}
