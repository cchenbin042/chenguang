import { useEffect, useMemo, useState } from "react"
import { ArrowsClockwiseIcon, PlusIcon } from "@phosphor-icons/react"
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { DataPagination } from "@/components/data-pagination"
import { DataToolbar } from "@/components/data-toolbar"
import { PageHeader } from "@/components/page-header"
import { QueryState } from "@/components/query-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useUserList } from "./queries"
import { USER_PAGE_SIZE, type UserRead } from "./types"
import { UserCreateSheet } from "./user-create-sheet"
import { UserDetailSheet } from "./user-detail-sheet"
import { UserRoleSheet } from "./user-role-sheet"

const SEARCH_DEBOUNCE_MS = 300

export function UsersPage() {
  const [keyword, setKeyword] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailUserId, setDetailUserId] = useState<number | null>(null)
  const [roleUserId, setRoleUserId] = useState<number | null>(null)

  // 输入停顿后才提交查询，并且回到第一页
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(keyword.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [keyword])

  const listQuery = useUserList({ page, page_size: USER_PAGE_SIZE, keyword: search || undefined })
  const items = listQuery.data?.items ?? []

  const columns = useMemo<ColumnDef<UserRead>[]>(
    () => [
      {
        accessorKey: "username",
        header: "用户名",
        cell: ({ row }) => <span className="font-medium">{row.original.username}</span>,
      },
      { accessorKey: "email", header: "邮箱" },
      {
        accessorKey: "is_active",
        header: "状态",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "secondary" : "outline"}>
            {row.original.is_active ? "已启用" : "已禁用"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">操作</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => setDetailUserId(row.original.id)}>
              详情
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRoleUserId(row.original.id)}>
              分配角色
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({ data: items, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="用户"
        description="创建账号并维护其角色。"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" strokeWidth={1.75} aria-hidden="true" />
            新建用户
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <DataToolbar searchValue={keyword} onSearchChange={setKeyword} searchPlaceholder="搜索用户名或邮箱">
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
          <QueryState status="empty" message={search ? "没有匹配的用户。" : "还没有用户。"} />
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
              pageSize={USER_PAGE_SIZE}
              total={listQuery.data?.total ?? 0}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <UserCreateSheet open={createOpen} onOpenChange={setCreateOpen} />
      <UserDetailSheet
        key={`user-detail-${detailUserId ?? "none"}`}
        userId={detailUserId}
        onOpenChange={(open) => {
          if (!open) setDetailUserId(null)
        }}
      />
      <UserRoleSheet
        key={`user-roles-${roleUserId ?? "none"}`}
        userId={roleUserId}
        onOpenChange={(open) => {
          if (!open) setRoleUserId(null)
        }}
      />
    </section>
  )
}
