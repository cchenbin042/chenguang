import { useState } from "react"
import { toast } from "sonner"
import { QueryState } from "@/components/query-state"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { ROLE_OPTIONS_PAGE_SIZE } from "@/features/roles/types"
import { useAssignUserRoles, useRoleOptions } from "./queries"

type UserRolesSectionProps = {
  userId: number | null
  /** 服务端返回的当前角色，用于回显勾选态 */
  currentRoleIds: number[]
  rolesPending: boolean
  rolesFailed: boolean
  onRetry: () => void
}

/** 内联在用户详情里的角色勾选区，保存后整体替换该用户的角色。 */
export function UserRolesSection({
  userId,
  currentRoleIds,
  rolesPending,
  rolesFailed,
  onRetry,
}: UserRolesSectionProps) {
  // null 表示还没动过勾选，此时直接采用服务端的当前角色，避免多一次渲染才对齐
  const [selected, setSelected] = useState<number[] | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const rolesQuery = useRoleOptions()
  const assignMutation = useAssignUserRoles()

  const selectedIds = selected ?? currentRoleIds
  const options = rolesQuery.data?.items ?? []
  const truncated = rolesQuery.data?.truncated ?? false
  const loading = rolesPending || rolesQuery.isPending
  const failed = rolesFailed || rolesQuery.isError

  function toggle(roleId: number, checked: boolean) {
    setSelected(checked ? [...new Set([...selectedIds, roleId])] : selectedIds.filter((id) => id !== roleId))
  }

  function handleRetry() {
    onRetry()
    void rolesQuery.refetch()
  }

  function handleSave() {
    if (userId === null) return

    setFormError(null)
    assignMutation.mutate(
      { id: userId, roleIds: selectedIds },
      {
        // 保存成功后留在详情里，靠 users/roles/{id} 缓存失效刷新有效权限
        onSuccess: () => {
          toast.success("角色已更新")
        },
        onError: (error: unknown) => {
          setFormError(error instanceof Error ? error.message : "保存失败，请稍后重试。")
        },
      },
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">角色</h3>
      <p className="text-xs text-muted-foreground">保存后整体替换该用户的角色。</p>

      {loading ? (
        <QueryState status="loading" />
      ) : failed ? (
        <QueryState status="error" message="角色数据加载失败。" onRetry={handleRetry} />
      ) : truncated ? (
        <p role="alert" className="text-sm text-destructive">
          角色总数（{rolesQuery.data?.total ?? 0}）超过一次可加载的 {ROLE_OPTIONS_PAGE_SIZE} 条，请先在角色管理中精简后再分配。
        </p>
      ) : options.length === 0 ? (
        <QueryState status="empty" message="还没有可分配的角色。" />
      ) : (
        <ul className="flex flex-col gap-2">
          {options.map((role) => (
            <li key={role.id} className="flex items-center gap-2">
              <Checkbox
                id={`role-option-${role.id}`}
                checked={selectedIds.includes(role.id)}
                onCheckedChange={(checked) => toggle(role.id, checked === true)}
              />
              <Label htmlFor={`role-option-${role.id}`} className="flex-1">
                {role.name}
              </Label>
              <span className="text-xs text-muted-foreground">{role.code}</span>
            </li>
          ))}
        </ul>
      )}

      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <Button
        onClick={handleSave}
        disabled={assignMutation.isPending || loading || failed || truncated}
        className="self-start"
      >
        {assignMutation.isPending ? (
          <>
            <Spinner data-icon="inline-start" aria-hidden="true" />
            正在保存
          </>
        ) : (
          "保存"
        )}
      </Button>
    </section>
  )
}
