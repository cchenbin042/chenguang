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
import { useDeleteRole, useRoleList } from "./queries"
import { RoleDetailSheet } from "./role-detail-sheet"
import { RoleFormSheet, type RoleFormTarget } from "./role-form-sheet"
import { RolePermissionSheet } from "./role-permission-sheet"
import type { RoleRead } from "./types"

const SEARCH_DEBOUNCE_MS = 300
const ROLE_PAGE_SIZE = 10

export function RolesPage() {
  const [keyword, setKeyword] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [formTarget, setFormTarget] = useState<RoleFormTarget | null>(null)
  const [detailRoleId, setDetailRoleId] = useState<number | null>(null)
  const [permissionRoleId, setPermissionRoleId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RoleRead | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(keyword.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [keyword])

  const listQuery = useRoleList({ page, page_size: ROLE_PAGE_SIZE, keyword: search || undefined })
  const deleteMutation = useDeleteRole()
  const items = listQuery.data?.items ?? []

  const columns = useMemo<ColumnDef<RoleRead>[]>(
    () => [
      { accessorKey: "code", header: "角色编码" },
      {
        accessorKey: "name",
        header: "角色名称",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "description",
        header: "描述",
        cell: ({ row }) => (
          <span className="block max-w-64 truncate text-muted-foreground">
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        id: "permissionCount",
        header: "权限数量",
        cell: ({ row }) => (
          // 列表接口的 response_model 会裁掉 permissions，因此这里只能显示占位符
          <span className="tabular-nums text-muted-foreground">
            {row.original.permissions ? row.original.permissions.length : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">操作</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => setDetailRoleId(row.original.id)}>
              详情
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFormTarget({ mode: "edit", role: row.original })}
            >
              编辑
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPermissionRoleId(row.original.id)}>
              权限
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
        toast.success("角色已删除")
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
        title="角色"
        description="维护角色并配置其权限。"
        actions={
          <Button onClick={() => setFormTarget({ mode: "create" })}>
            <PlusIcon data-icon="inline-start" strokeWidth={1.75} aria-hidden="true" />
            新建角色
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <DataToolbar searchValue={keyword} onSearchChange={setKeyword} searchPlaceholder="搜索角色编码或名称">
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
          <QueryState status="empty" message={search ? "没有匹配的角色。" : "还没有角色。"} />
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
              pageSize={ROLE_PAGE_SIZE}
              total={listQuery.data?.total ?? 0}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <RoleFormSheet
        key={formTarget ? `${formTarget.mode}-${formTarget.mode === "edit" ? formTarget.role.id : "new"}` : "none"}
        target={formTarget}
        onOpenChange={(open) => {
          if (!open) setFormTarget(null)
        }}
      />
      <RoleDetailSheet
        key={`role-detail-${detailRoleId ?? "none"}`}
        roleId={detailRoleId}
        onOpenChange={(open) => {
          if (!open) setDetailRoleId(null)
        }}
      />
      <RolePermissionSheet
        key={`role-permissions-${permissionRoleId ?? "none"}`}
        roleId={permissionRoleId}
        onOpenChange={(open) => {
          if (!open) setPermissionRoleId(null)
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
