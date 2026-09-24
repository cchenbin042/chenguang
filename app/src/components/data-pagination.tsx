import { Button } from "@/components/ui/button"

type DataPaginationProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function DataPagination({ page, pageSize, total, onPageChange }: DataPaginationProps) {
  const safeTotal = Math.max(0, total)
  const safePageSize = Math.max(1, pageSize)
  const pageCount = Math.max(1, Math.ceil(safeTotal / safePageSize))
  const currentPage = Math.min(Math.max(1, page), pageCount)
  const firstItem = safeTotal === 0 ? 0 : (currentPage - 1) * safePageSize + 1
  const lastItem = Math.min(currentPage * safePageSize, safeTotal)

  return (
    <nav aria-label="分页" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">共 {safeTotal} 条，显示 {firstItem}-{lastItem} 条</p>
      <div className="flex items-center gap-2">
        <span className="tabular-nums text-muted-foreground">第 {currentPage} / {pageCount} 页</span>
        <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>上一页</Button>
        <Button variant="outline" size="sm" disabled={currentPage >= pageCount} onClick={() => onPageChange(currentPage + 1)}>下一页</Button>
      </div>
    </nav>
  )
}
