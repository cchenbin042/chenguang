import { CaretRightIcon } from "@phosphor-icons/react"
import { useQueries, useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { PageHeader } from "@/components/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { getHealth, getPermissionsTotal, getRolesTotal, getUsersTotal } from "./api"

const summaries = [
  { key: "users", label: "用户", to: "/users", fetchTotal: getUsersTotal },
  { key: "roles", label: "角色", to: "/roles", fetchTotal: getRolesTotal },
  { key: "permissions", label: "权限", to: "/permissions", fetchTotal: getPermissionsTotal },
] as const

export function OverviewPage() {
  // 四项请求并行发出，其中三项结构一致，用 useQueries 统一维护
  const healthQuery = useQuery({
    queryKey: ["overview", "health"],
    queryFn: getHealth,
    retry: false,
  })
  const totalQueries = useQueries({
    queries: summaries.map((item) => ({
      queryKey: ["overview", item.key],
      queryFn: item.fetchTotal,
      retry: false,
    })),
  })

  const healthy = healthQuery.isSuccess && healthQuery.data.status === "ok"
  const healthLabel = healthQuery.isPending ? "检测中" : healthy ? "服务正常" : "服务不可用"

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="概览" description="后端服务状态与管理对象数量。" />

      <div className="border border-border">
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "size-2 rounded-full",
                healthQuery.isPending ? "bg-muted-foreground" : healthy ? "bg-primary" : "bg-destructive",
              )}
              aria-hidden="true"
            />
            <span className="text-sm font-medium">后端服务</span>
          </span>
          <span role="status" className="text-sm text-muted-foreground">
            {healthLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {summaries.map((item, index) => {
            const query = totalQueries[index]

            return (
              <Link
                key={item.key}
                to={item.to}
                aria-label={`${item.label}管理`}
                className="flex items-center justify-between gap-3 px-4 py-4 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring"
              >
                <span className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  {query.isPending ? (
                    <Skeleton className="h-7 w-14" />
                  ) : query.isError ? (
                    <span className="text-sm text-muted-foreground">暂不可用</span>
                  ) : (
                    <span className="text-2xl font-semibold tabular-nums">{query.data?.total ?? 0}</span>
                  )}
                </span>
                <CaretRightIcon className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
