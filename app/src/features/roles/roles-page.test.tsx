import { describe, expect, it } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http } from "msw"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AppProviders } from "@/app/providers"
import { ok } from "@/test/handlers"
import { createTestQueryClient } from "@/test/render"
import { server } from "@/test/server"
import type { RoleRead } from "./types"
import { RolesPage } from "./roles-page"

// 列表接口按后端现状不会返回 permissions
const roles: RoleRead[] = [
  { id: 1, code: "admin", name: "管理员", description: "全部权限" },
  { id: 2, code: "editor", name: "编辑", description: null },
]

const permissionOptions = [
  { id: 10, code: "user:list", name: "用户列表", description: null },
  { id: 11, code: "role:list", name: "角色列表", description: null },
  { id: 12, code: "permission:list", name: "权限列表", description: null },
]

const roleListHandler = () => ok({ items: roles, total: 2, page: 1, page_size: 10 })

function renderRoles() {
  const queryClient = createTestQueryClient()
  render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={["/roles"]}>
        <Routes>
          <Route path="/roles" element={<RolesPage />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  )
  return queryClient
}

describe("RolesPage", () => {
  it("uses the duplicated roles path from OpenAPI", async () => {
    const requests: URL[] = []
    server.use(
      http.get("/api/v1/roles/roles", ({ request }) => {
        requests.push(new URL(request.url))
        return roleListHandler()
      }),
    )

    renderRoles()

    expect(await screen.findByText("admin")).toBeInTheDocument()
    expect(requests[0].pathname).toBe("/api/v1/roles/roles")
    expect(requests[0].searchParams.get("page")).toBe("1")
    expect(requests[0].searchParams.get("page_size")).toBe("10")
  })

  it("creates a role through the duplicated path", async () => {
    const bodies: unknown[] = []
    server.use(
      http.get("/api/v1/roles/roles", roleListHandler),
      http.post("/api/v1/roles/roles", async ({ request }) => {
        bodies.push(await request.json())
        return ok({ id: 3, code: "viewer", name: "只读", description: "只读账号" })
      }),
    )

    renderRoles()
    const user = userEvent.setup()
    await screen.findByText("admin")

    await user.click(screen.getByRole("button", { name: "新建角色" }))
    await user.type(await screen.findByLabelText("角色编码"), "viewer")
    await user.type(screen.getByLabelText("角色名称"), "只读")
    await user.type(screen.getByLabelText("角色描述"), "只读账号")
    await user.click(screen.getByRole("button", { name: "创建" }))

    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toEqual({ code: "viewer", name: "只读", description: "只读账号" })
  })

  it("keeps the code read-only and out of the update request", async () => {
    const puts: { url: URL; body: unknown }[] = []
    server.use(
      http.get("/api/v1/roles/roles", roleListHandler),
      http.put("/api/v1/roles/roles/:id", async ({ request }) => {
        puts.push({ url: new URL(request.url), body: await request.json() })
        return ok(roles[0])
      }),
    )

    renderRoles()
    const user = userEvent.setup()
    await screen.findByText("admin")

    await user.click(screen.getAllByRole("button", { name: "编辑" })[0])

    const codeInput = await screen.findByLabelText("角色编码")
    expect(codeInput).toHaveAttribute("readonly")
    expect(codeInput).toHaveValue("admin")

    const nameInput = screen.getByLabelText("角色名称")
    await user.clear(nameInput)
    await user.type(nameInput, "超级管理员")
    await user.click(screen.getByRole("button", { name: "保存" }))

    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0].url.pathname).toBe("/api/v1/roles/roles/1")
    // 请求体里不能出现 code
    expect(puts[0].body).toEqual({ name: "超级管理员", description: "全部权限" })
  })

  it("deletes a role only after confirmation", async () => {
    const deletes: string[] = []
    server.use(
      http.get("/api/v1/roles/roles", roleListHandler),
      http.delete("/api/v1/roles/roles/:id", ({ request }) => {
        deletes.push(new URL(request.url).pathname)
        return ok(null)
      }),
    )

    renderRoles()
    const user = userEvent.setup()
    await screen.findByText("admin")

    await user.click(screen.getAllByRole("button", { name: "删除" })[1])
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("编辑")
    expect(deletes).toHaveLength(0)

    await user.click(screen.getByRole("button", { name: "取消" }))
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
    expect(deletes).toHaveLength(0)

    await user.click(screen.getAllByRole("button", { name: "删除" })[1])
    await user.click(await screen.findByRole("button", { name: "确认删除" }))

    await waitFor(() => expect(deletes).toEqual(["/api/v1/roles/roles/2"]))
  })

  it("shows the role's current permissions in the detail sheet", async () => {
    server.use(
      http.get("/api/v1/roles/roles", roleListHandler),
      http.get("/api/v1/roles/roles/:id", () =>
        ok({
          id: 1,
          code: "admin",
          name: "管理员",
          description: "全部权限",
          permissions: [
            { id: 10, code: "user:list", name: "用户列表", description: null },
            { id: 11, code: "role:list", name: "角色列表", description: null },
          ],
        }),
      ),
    )

    renderRoles()
    const user = userEvent.setup()
    await screen.findByText("admin")

    await user.click(screen.getAllByRole("button", { name: "详情" })[0])

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("用户列表")).toBeInTheDocument()
    expect(within(dialog).getByText("user:list")).toBeInTheDocument()
    expect(within(dialog).queryByText("该角色还没有分配权限。")).not.toBeInTheDocument()
  })

  it("submits permission_ids when replacing permissions", async () => {
    const puts: { url: URL; body: unknown }[] = []
    server.use(
      http.get("/api/v1/roles/roles", roleListHandler),
      http.get("/api/v1/roles/roles/:id", () =>
        ok({
          id: 1,
          code: "admin",
          name: "管理员",
          description: "全部权限",
          permissions: [{ id: 10, code: "user:list", name: "用户列表", description: null }],
        }),
      ),
      http.get("/api/v1/permissions/", () =>
        ok({ items: permissionOptions, total: permissionOptions.length, page: 1, page_size: 100 }),
      ),
      http.put("/api/v1/roles/:id/permissions", async ({ request }) => {
        puts.push({ url: new URL(request.url), body: await request.json() })
        return ok(roles[0])
      }),
    )

    renderRoles()
    const user = userEvent.setup()
    await screen.findByText("admin")

    await user.click(screen.getAllByRole("button", { name: "权限" })[0])

    expect(await screen.findByRole("checkbox", { name: "用户列表" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "角色列表" })).not.toBeChecked()

    await user.click(screen.getByRole("checkbox", { name: "角色列表" }))
    await user.click(screen.getByRole("button", { name: "保存" }))

    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0].url.pathname).toBe("/api/v1/roles/1/permissions")
    expect(puts[0].body).toEqual({ permission_ids: [10, 11] })
  })

  it("blocks permission assignment when the permission list is truncated", async () => {
    server.use(
      http.get("/api/v1/roles/roles", roleListHandler),
      http.get("/api/v1/roles/roles/:id", () =>
        ok({ id: 1, code: "admin", name: "管理员", description: null, permissions: [] }),
      ),
      http.get("/api/v1/permissions/", () =>
        ok({ items: permissionOptions, total: 140, page: 1, page_size: 100 }),
      ),
    )

    renderRoles()
    const user = userEvent.setup()
    await screen.findByText("admin")

    await user.click(screen.getAllByRole("button", { name: "权限" })[0])

    expect(await screen.findByRole("alert")).toHaveTextContent("超过一次可加载的 100 条")
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled()
  })
})
