import { WarningCircleIcon, TrayIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

type QueryStateProps = {
  status: "loading" | "empty" | "error"
  message?: string
  onRetry?: () => void
}

export function QueryState({ status, message, onRetry }: QueryStateProps) {
  if (status === "loading") {
    return (
      <div role="status" aria-label="正在加载" className="flex flex-col gap-3 py-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }

  const isError = status === "error"
  return (
    <Empty className="min-h-48">
      <EmptyHeader>
        <EmptyMedia variant="icon">{isError ? <WarningCircleIcon aria-hidden="true" /> : <TrayIcon aria-hidden="true" />}</EmptyMedia>
        <EmptyTitle>{isError ? "加载失败" : "暂无数据"}</EmptyTitle>
        <EmptyDescription>{message ?? (isError ? "请稍后重试。" : "当前条件下没有结果。")}</EmptyDescription>
      </EmptyHeader>
      {isError && onRetry ? <EmptyContent><Button variant="outline" size="sm" onClick={onRetry}>重试</Button></EmptyContent> : null}
    </Empty>
  )
}
