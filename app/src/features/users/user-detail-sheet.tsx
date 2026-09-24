import { QueryState } from "@/components/query-state"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useUserDetail } from "./queries"

type UserDetailSheetProps = {
  userId: number | null
  onOpenChange: (open: boolean) => void
}

export function UserDetailSheet({ userId, onOpenChange }: UserDetailSheetProps) {
  const detailQuery = useUserDetail(userId)
  const user = detailQuery.data

  return (
    <Sheet open={userId !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>用户详情</SheetTitle>
          <SheetDescription>账号基础信息与启用状态。</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          {detailQuery.isPending ? (
            <QueryState status="loading" />
          ) : detailQuery.isError ? (
            <QueryState
              status="error"
              message={detailQuery.error instanceof Error ? detailQuery.error.message : undefined}
              onRetry={() => void detailQuery.refetch()}
            />
          ) : user ? (
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
          ) : (
            <QueryState status="empty" message="没有查询到该用户。" />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
