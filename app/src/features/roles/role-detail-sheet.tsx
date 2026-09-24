import { QueryState } from "@/components/query-state"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useRoleDetail } from "./queries"

type RoleDetailSheetProps = {
  roleId: number | null
  onOpenChange: (open: boolean) => void
}

export function RoleDetailSheet({ roleId, onOpenChange }: RoleDetailSheetProps) {
  const detailQuery = useRoleDetail(roleId)
  const role = detailQuery.data

  return (
    <Sheet open={roleId !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>角色详情</SheetTitle>
          <SheetDescription>角色信息与当前拥有的权限。</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4">
          {detailQuery.isPending ? (
            <QueryState status="loading" />
          ) : detailQuery.isError ? (
            <QueryState
              status="error"
              message={detailQuery.error instanceof Error ? detailQuery.error.message : undefined}
              onRetry={() => void detailQuery.refetch()}
            />
          ) : role ? (
            <>
              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">角色编码</dt>
                  <dd className="font-medium">{role.code}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">角色名称</dt>
                  <dd className="font-medium">{role.name}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">角色描述</dt>
                  <dd className="font-medium">{role.description || "未填写"}</dd>
                </div>
              </dl>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">当前权限</h3>
                {role.permissions && role.permissions.length > 0 ? (
                  <ul className="flex flex-col gap-1 text-sm">
                    {role.permissions.map((permission) => (
                      <li key={permission.id} className="flex items-center justify-between gap-3 border-b border-border pb-1 last:border-0">
                        <span>{permission.name}</span>
                        <span className="text-xs text-muted-foreground">{permission.code}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">该角色还没有分配权限。</p>
                )}
              </section>
            </>
          ) : (
            <QueryState status="empty" message="没有查询到该角色。" />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
