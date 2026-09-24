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
import { PERMISSION_OPTIONS_PAGE_SIZE } from "@/features/permissions/types"
import { useAssignRolePermissions, usePermissionOptions, useRoleDetail } from "./queries"

type RolePermissionSheetProps = {
  roleId: number | null
  onOpenChange: (open: boolean) => void
}

export function RolePermissionSheet({ roleId, onOpenChange }: RolePermissionSheetProps) {
  // null 表示尚未改动勾选，直接用服务端返回的当前权限，避免多一次渲染才对齐
  const [selected, setSelected] = useState<number[] | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const roleQuery = useRoleDetail(roleId)
  const permissionsQuery = usePermissionOptions()
  const assignMutation = useAssignRolePermissions()

  const currentIds = roleQuery.data?.permissions?.map((permission) => permission.id) ?? []
  const selectedIds = selected ?? currentIds
  const options = permissionsQuery.data?.items ?? []
  const truncated = permissionsQuery.data?.truncated ?? false
  const loading = roleQuery.isPending || permissionsQuery.isPending
  const failed = roleQuery.isError || permissionsQuery.isError

  function toggle(permissionId: number, checked: boolean) {
    setSelected(
      checked
        ? [...new Set([...selectedIds, permissionId])]
        : selectedIds.filter((id) => id !== permissionId),
    )
  }

  function handleSave() {
    if (roleId === null) return

    setFormError(null)
    assignMutation.mutate(
      { id: roleId, permissionIds: selectedIds },
      {
        onSuccess: () => {
          toast.success("权限已更新")
          onOpenChange(false)
        },
        onError: (error: unknown) => {
          setFormError(error instanceof Error ? error.message : "保存失败，请稍后重试。")
        },
      },
    )
  }

  return (
    <Sheet open={roleId !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>分配权限</SheetTitle>
          <SheetDescription>保存后整体替换该角色的权限。</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4">
          {loading ? (
            <QueryState status="loading" />
          ) : failed ? (
            <QueryState
              status="error"
              message="权限数据加载失败。"
              onRetry={() => {
                void roleQuery.refetch()
                void permissionsQuery.refetch()
              }}
            />
          ) : truncated ? (
            <p role="alert" className="text-sm text-destructive">
              权限总数（{permissionsQuery.data?.total ?? 0}）超过一次可加载的 {PERMISSION_OPTIONS_PAGE_SIZE} 条，请先精简权限后再分配。
            </p>
          ) : options.length === 0 ? (
            <QueryState status="empty" message="还没有可分配的权限。" />
          ) : (
            <ul className="flex flex-col gap-2">
              {options.map((permission) => (
                <li key={permission.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`permission-option-${permission.id}`}
                    checked={selectedIds.includes(permission.id)}
                    onCheckedChange={(checked) => toggle(permission.id, checked === true)}
                  />
                  <Label htmlFor={`permission-option-${permission.id}`} className="flex-1">
                    {permission.name}
                  </Label>
                  <span className="text-xs text-muted-foreground">{permission.code}</span>
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
          <Button onClick={handleSave} disabled={assignMutation.isPending || loading || failed || truncated}>
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
