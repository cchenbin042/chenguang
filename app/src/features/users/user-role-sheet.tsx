import { useState } from "react"
import { toast } from "sonner"
import { QueryState } from "@/components/query-state"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { ROLE_OPTIONS_PAGE_SIZE } from "@/features/roles/types"
import { useAssignUserRoles, useRoleOptions, useUserRoles } from "./queries"

type UserRoleSheetProps = {
  userId: number | null
  onOpenChange: (open: boolean) => void
}

export function UserRoleSheet({ userId, onOpenChange }: UserRoleSheetProps) {
  // null 表示还没动过勾选，此时直接采用服务端的当前角色，避免多一次渲染才对齐
  const [selected, setSelected] = useState<number[] | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const rolesQuery = useRoleOptions()
  const userRolesQuery = useUserRoles(userId)
  const assignMutation = useAssignUserRoles()

  const currentRoleIds = userRolesQuery.data?.roles.map((role) => role.id) ?? []
  const selectedIds = selected ?? currentRoleIds
  const options = rolesQuery.data?.items ?? []
  const truncated = rolesQuery.data?.truncated ?? false
  const loading = rolesQuery.isPending || userRolesQuery.isPending
  const failed = rolesQuery.isError || userRolesQuery.isError

  function toggle(roleId: number, checked: boolean) {
    setSelected(checked ? [...new Set([...selectedIds, roleId])] : selectedIds.filter((id) => id !== roleId))
  }

  function handleSave() {
    if (userId === null) return

    setFormError(null)
    assignMutation.mutate(
      { id: userId, roleIds: selectedIds },
      {
        onSuccess: () => {
          toast.success("角色已更新")
          onOpenChange(false)
        },
        onError: (error: unknown) => {
          setFormError(error instanceof Error ? error.message : "保存失败，请稍后重试。")
        },
      },
    )
  }

  return (
    <Sheet open={userId !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>分配角色</SheetTitle>
          <SheetDescription>保存后整体替换该用户的角色。</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4">
          {loading ? (
            <QueryState status="loading" />
          ) : failed ? (
            <QueryState
              status="error"
              message="角色数据加载失败。"
              onRetry={() => {
                void rolesQuery.refetch()
                void userRolesQuery.refetch()
              }}
            />
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
        </div>

        <SheetFooter>
          <Button
            onClick={handleSave}
            disabled={assignMutation.isPending || loading || failed || truncated}
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
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
