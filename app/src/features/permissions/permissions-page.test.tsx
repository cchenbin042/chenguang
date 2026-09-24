import { describe, expect, it } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http } from "msw"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AppProviders } from "@/app/providers"
import { ok } from "@/test/handlers"
import { createTestQueryClient } from "@/test/render"
import { server } from "@/test/server"
import type { PermissionRead } from "./types"
import { PermissionsPage } from "./permissions-page"

const permissions: PermissionRead[] = [
  { id: 10, code: "user:list", name: "用户列表", description: "查看用户" },
  { id: 11, code: "role:list", name: "角色列表", description: null },
]

function permissionPage(total = permissions.length, page = 1) {
  return ok({ items: permissions, total, page, page_size: 10 })
}

function renderPermissions() {
  const queryClient = createTestQueryClient()
  render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={["/permissions"]}>
        <Routes>
          <Route path="/permissions" element={<PermissionsPage />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  )
  return queryClient
}

describe("PermissionsPage", () => {
  it("loads, searches and paginates permissions", async () => {
    const requests: URL[] = []
    server.use(
      http.get("/api/v1/permissions/", ({ request }) => {
        const url = new URL(request.url)
        requests.push(url)
        return ok({
          items: permissions,
          total: 40,
          page: Number(url.searchParams.get("page")),
          page_size: 10,
        })
      }),
    )

    renderPermissions()
    const user = userEvent.setup()

    expect(await screen.findByText("user:list")).toBeInTheDocument()
    expect(requests[0].pathname).toBe("/api/v1/permissions/")
    expect(requests[0].searchParams.get("page")).toBe("1")
    expect(requests[0].searchParams.get("page_size")).toBe("10")

    await user.click(screen.getByRole("button", { name: "下一页" }))
    await waitFor(() => expect(requests.some((url) => url.searchParams.get("page") === "2")).toBe(true))

    await user.type(screen.getByRole("searchbox"), "role")
    await waitFor(() => expect(requests.some((url) => url.searchParams.get("keyword") === "role")).toBe(true))
    const keywordRequests = requests.filter((url) => url.searchParams.get("keyword") === "role")
    expect(keywordRequests).toHaveLength(1)
    expect(keywordRequests[0].searchParams.get("page")).toBe("1")
  })

  it("creates a permission", async () => {
    const posted: unknown[] = []
    server.use(
      http.get("/api/v1/permissions/", () => permissionPage()),
      http.post("/api/v1/permissions", async ({ request }) => {
        posted.push(await request.json())
        return ok({ id: 12, code: "agent:list", name: "Agent 列表", description: null })
      }),
    )

    renderPermissions()
    const user = userEvent.setup()
    await screen.findByText("user:list")

    await user.click(screen.getByRole("button", { name: "新建权限" }))
    await user.type(await screen.findByLabelText("权限编码"), "agent:list")
    await user.type(screen.getByLabelText("权限名称"), "Agent 列表")
    await user.click(screen.getByRole("button", { name: "创建" }))

    await waitFor(() => expect(posted).toHaveLength(1))
    expect(posted[0]).toEqual({ code: "agent:list", name: "Agent 列表" })
  })

  it("keeps the code read-only and out of the update request", async () => {
    const puts: { url: URL; body: unknown }[] = []
    server.use(
      http.get("/api/v1/permissions/", () => permissionPage()),
      http.put("/api/v1/permissions/:id", async ({ request }) => {
        puts.push({ url: new URL(request.url), body: await request.json() })
        return ok(permissions[0])
      }),
    )

    renderPermissions()
    const user = userEvent.setup()
    await screen.findByText("user:list")

    await user.click(screen.getAllByRole("button", { name: "编辑" })[0])

    const codeInput = await screen.findByLabelText("权限编码")
    expect(codeInput).toHaveAttribute("readonly")
    expect(codeInput).toHaveValue("user:list")

    const nameInput = screen.getByLabelText("权限名称")
    await user.clear(nameInput)
    await user.type(nameInput, "用户清单")
    await user.click(screen.getByRole("button", { name: "保存" }))

    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0].url.pathname).toBe("/api/v1/permissions/10")
    expect(puts[0].body).toEqual({ name: "用户清单", description: "查看用户" })
  })

  it("shows the permission detail sheet", async () => {
    server.use(
      http.get("/api/v1/permissions/", () => permissionPage()),
      http.get("/api/v1/permissions/:id", () =>
        ok({ id: 11, code: "role:list", name: "角色列表", description: null }),
      ),
    )

    renderPermissions()
    const user = userEvent.setup()
    await screen.findByText("user:list")

    await user.click(screen.getAllByRole("button", { name: "详情" })[1])

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("role:list")).toBeInTheDocument()
    expect(within(dialog).getByText("未填写")).toBeInTheDocument()
  })

  it("deletes only after confirmation", async () => {
    const deletes: string[] = []
    server.use(
      http.get("/api/v1/permissions/", () => permissionPage()),
      http.delete("/api/v1/permissions/:id", ({ request }) => {
        deletes.push(new URL(request.url).pathname)
        return ok(permissions[1])
      }),
    )

    renderPermissions()
    const user = userEvent.setup()
    await screen.findByText("user:list")

    await user.click(screen.getAllByRole("button", { name: "删除" })[1])
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("角色列表")
    expect(deletes).toHaveLength(0)

    await user.click(screen.getByRole("button", { name: "取消" }))
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
    expect(deletes).toHaveLength(0)

    await user.click(screen.getAllByRole("button", { name: "删除" })[1])
    await user.click(await screen.findByRole("button", { name: "确认删除" }))

    await waitFor(() => expect(deletes).toEqual(["/api/v1/permissions/11"]))
  })
})
