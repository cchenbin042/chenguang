import { QueryState } from "@/components/query-state"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { collectEffectivePermissions } from "./effective-permissions"
import { UserPermissionsSection } from "./user-permissions-section"
import { UserRolesSection } from "./user-roles-section"
import { useUserDetail, useUserRoles } from "./queries"

type UserDetailSheetProps = {
  userId: number | null
  onOpenChange: (open: boolean) => void
}

/** 用户域的唯一入口：账号信息、可编辑的角色、由角色决定的有效权限。 */
export function UserDetailSheet({ userId, onOpenChange }: UserDetailSheetProps) {
  const detailQuery = useUserDetail(userId)
  // 角色查询在这里发出一次，同时喂给角色区与权限区，避免重复请求
  const rolesQuery = useUserRoles(userId)
  const user = detailQuery.data
  const roles = rolesQuery.data?.roles ?? []
  const effectivePermissions = collectEffectivePermissions(roles)

  return (
    <Sheet open={userId !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>用户详情</SheetTitle>
          <SheetDescription>账号基础信息、角色与由角色决定的有效权限。</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4">
          {detailQuery.isPending ? (
            <QueryState status="loading" />
          ) : detailQuery.isError ? (
            <QueryState
              status="error"
              message={detailQuery.error instanceof Error ? detailQuery.error.message : undefined}
              onRetry={() => void detailQuery.refetch()}
            />
          ) : user ? (
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">账号信息</h3>
              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">用户名</dt>
                  <dd className="font-medium">{user.username}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">邮箱</dt>
                  <dd className="font-medium">{user.email}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">状态</dt>
                  <dd>
                    <Badge variant={user.is_active ? "secondary" : "outline"}>
                      {user.is_active ? "已启用" : "已禁用"}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </section>
          ) : (
            <QueryState status="empty" message="没有查询到该用户。" />
          )}

          <UserRolesSection
            userId={userId}
            currentRoleIds={roles.map((role) => role.id)}
            rolesPending={rolesQuery.isPending}
            rolesFailed={rolesQuery.isError}
            onRetry={() => void rolesQuery.refetch()}
          />

          <UserPermissionsSection
            permissions={effectivePermissions}
            hasRoles={roles.length > 0}
            pending={rolesQuery.isPending}
            failed={rolesQuery.isError}
            onRetry={() => void rolesQuery.refetch()}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
