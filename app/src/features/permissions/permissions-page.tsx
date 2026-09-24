import { useEffect, useMemo, useState } from "react"
import { ArrowsClockwiseIcon, PlusIcon } from "@phosphor-icons/react"
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { DataPagination } from "@/components/data-pagination"
import { DataToolbar } from "@/components/data-toolbar"
import { PageHeader } from "@/components/page-header"
import { QueryState } from "@/components/query-state"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PermissionDetailSheet } from "./permission-detail-sheet"
import { PermissionFormSheet, type PermissionFormTarget } from "./permission-form-sheet"
import { useDeletePermission, usePermissionList } from "./queries"
import type { PermissionRead } from "./types"

const SEARCH_DEBOUNCE_MS = 300
const PERMISSION_PAGE_SIZE = 10

export function PermissionsPage() {
  const [keyword, setKeyword] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [formTarget, setFormTarget] = useState<PermissionFormTarget | null>(null)
  const [detailPermissionId, setDetailPermissionId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PermissionRead | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(keyword.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [keyword])

  const listQuery = usePermissionList({ page, page_size: PERMISSION_PAGE_SIZE, keyword: search || undefined })
  const deleteMutation = useDeletePermission()
  const items = listQuery.data?.items ?? []

  const columns = useMemo<ColumnDef<PermissionRead>[]>(
    () => [
      { accessorKey: "code", header: "权限编码" },
      {
        accessorKey: "name",
        header: "权限名称",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "description",
        header: "描述",
        cell: ({ row }) => (
          <span className="block max-w-80 truncate text-muted-foreground">
            {row.original.description || "无"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">操作</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => setDetailPermissionId(row.original.id)}>
              详情
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFormTarget({ mode: "edit", permission: row.original })}
            >
              编辑
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(row.original)}>
              删除
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({ data: items, columns, getCoreRowModel: getCoreRowModel() })

  function handleConfirmDelete() {
    if (!deleteTarget) return

    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("权限已删除")
        setDeleteTarget(null)
      },
      onError: (error: unknown) => {
        toast.error(error instanceof Error ? error.message : "删除失败，请稍后重试。")
      },
    })
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="权限"
        description="维护可控的权限编码。"
        actions={
          <Button onClick={() => setFormTarget({ mode: "create" })}>
            <PlusIcon data-icon="inline-start" strokeWidth={1.75} aria-hidden="true" />
            新建权限
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <DataToolbar searchValue={keyword} onSearchChange={setKeyword} searchPlaceholder="搜索权限编码或名称">
          <Button
            variant="outline"
            size="sm"
            disabled={listQuery.isFetching}
            onClick={() => void listQuery.refetch()}
          >
            <ArrowsClockwiseIcon data-icon="inline-start" strokeWidth={1.75} aria-hidden="true" />
            刷新
          </Button>
        </DataToolbar>

        {listQuery.isPending ? (
          <QueryState status="loading" />
        ) : listQuery.isError ? (
          <QueryState
            status="error"
            message={listQuery.error instanceof Error ? listQuery.error.message : undefined}
            onRetry={() => void listQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <QueryState status="empty" message={search ? "没有匹配的权限。" : "还没有权限。"} />
        ) : (
          <>
            <div className="border border-border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DataPagination
              page={page}
              pageSize={PERMISSION_PAGE_SIZE}
              total={listQuery.data?.total ?? 0}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <PermissionFormSheet
        key={formTarget ? `${formTarget.mode}-${formTarget.mode === "edit" ? formTarget.permission.id : "new"}` : "none"}
        target={formTarget}
        onOpenChange={(open) => {
          if (!open) setFormTarget(null)
        }}
      />
      <PermissionDetailSheet
        key={`permission-detail-${detailPermissionId ?? "none"}`}
        permissionId={detailPermissionId}
        onOpenChange={(open) => {
          if (!open) setDetailPermissionId(null)
        }}
      />
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={handleConfirmDelete}
        itemName={deleteTarget?.name ?? ""}
        pending={deleteMutation.isPending}
      />
    </section>
  )
}
