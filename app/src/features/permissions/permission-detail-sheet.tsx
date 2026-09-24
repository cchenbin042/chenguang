import { QueryState } from "@/components/query-state"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { usePermissionDetail } from "./queries"

type PermissionDetailSheetProps = {
  permissionId: number | null
  onOpenChange: (open: boolean) => void
}

export function PermissionDetailSheet({ permissionId, onOpenChange }: PermissionDetailSheetProps) {
  const detailQuery = usePermissionDetail(permissionId)
  const permission = detailQuery.data

  return (
    <Sheet open={permissionId !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>权限详情</SheetTitle>
          <SheetDescription>权限编码与说明。</SheetDescription>
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
          ) : permission ? (
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">权限编码</dt>
                <dd className="font-medium">{permission.code}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">权限名称</dt>
                <dd className="font-medium">{permission.name}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground">权限描述</dt>
                <dd className="font-medium">{permission.description || "未填写"}</dd>
              </div>
            </dl>
          ) : (
            <QueryState status="empty" message="没有查询到该权限。" />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
