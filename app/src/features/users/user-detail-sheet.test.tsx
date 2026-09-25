import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http } from "msw"
import { AppProviders } from "@/app/providers"
import { ok } from "@/test/handlers"
import { createTestQueryClient } from "@/test/render"
import { server } from "@/test/server"
import { UserDetailSheet } from "./user-detail-sheet"

const alice = { id: 1, username: "alice", email: "alice@example.com", is_active: true }

const roleOptions = [
  { id: 1, code: "admin", name: "管理员", description: null, permissions: [] },
  { id: 2, code: "editor", name: "编辑", description: null, permissions: [] },
]

const userListPermission = { id: 10, code: "user:list", name: "获取用户列表", description: null }
const userDeletePermission = { id: 20, code: "user:delete", name: "删除用户", description: null }

function renderSheet() {
  const queryClient = createTestQueryClient()
  render(
    <AppProviders queryClient={queryClient}>
      <UserDetailSheet userId={1} onOpenChange={() => {}} />
    </AppProviders>,
  )
}

describe("UserDetailSheet", () => {
  it("同时展示账号信息、角色勾选态与带来源的有效权限", async () => {
    server.use(
      http.get("/api/v1/users/:id", () => ok(alice)),
      http.get("/api/v1/users/:id/roles", () =>
        ok([
          {
            ...alice,
            roles: [
              {
                id: 1,
                code: "admin",
                name: "管理员",
                description: null,
                permissions: [userListPermission, userDeletePermission],
              },
              {
                id: 2,
                code: "editor",
                name: "编辑",
                description: null,
                permissions: [userListPermission],
              },
            ],
          },
        ]),
      ),
      http.get("/api/v1/roles/roles", () =>
        ok({ items: roleOptions, total: roleOptions.length, page: 1, page_size: 100 }),
      ),
    )

    renderSheet()

    // 账号信息
    expect(await screen.findByText("alice@example.com")).toBeInTheDocument()
    expect(screen.getByText("已启用")).toBeInTheDocument()
    // 角色勾选态
    expect(await screen.findByRole("checkbox", { name: "管理员" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "编辑" })).toBeChecked()
    // 有效权限去重并标注来源
    expect(screen.getByText("获取用户列表")).toBeInTheDocument()
    expect(screen.getByText("来源：管理员、编辑")).toBeInTheDocument()
    expect(screen.getByText("删除用户")).toBeInTheDocument()
    expect(screen.getByText("来源：管理员")).toBeInTheDocument()
  })

  it("可以在详情里改角色勾选", async () => {
    server.use(
      http.get("/api/v1/users/:id", () => ok(alice)),
      http.get("/api/v1/users/:id/roles", () =>
        ok([{ ...alice, roles: [{ id: 1, code: "admin", name: "管理员", description: null, permissions: [] }] }]),
      ),
      http.get("/api/v1/roles/roles", () =>
        ok({ items: roleOptions, total: roleOptions.length, page: 1, page_size: 100 }),
      ),
    )

    renderSheet()
    const user = userEvent.setup()

    const editor = await screen.findByRole("checkbox", { name: "编辑" })
    expect(editor).not.toBeChecked()

    await user.click(editor)

    expect(screen.getByRole("checkbox", { name: "编辑" })).toBeChecked()
  })

  it("用户没有角色时给出对应空态", async () => {
    server.use(
      http.get("/api/v1/users/:id", () => ok(alice)),
      http.get("/api/v1/users/:id/roles", () => ok([{ ...alice, roles: [] }])),
      http.get("/api/v1/roles/roles", () =>
        ok({ items: roleOptions, total: roleOptions.length, page: 1, page_size: 100 }),
      ),
    )

    renderSheet()

    expect(await screen.findByText("该用户没有任何角色，因此没有权限。")).toBeInTheDocument()
  })

  it("角色存在但都没配权限时给出另一种空态", async () => {
    server.use(
      http.get("/api/v1/users/:id", () => ok(alice)),
      http.get("/api/v1/users/:id/roles", () =>
        ok([{ ...alice, roles: [{ id: 1, code: "admin", name: "管理员", description: null, permissions: [] }] }]),
      ),
      http.get("/api/v1/roles/roles", () =>
        ok({ items: roleOptions, total: roleOptions.length, page: 1, page_size: 100 }),
      ),
    )

    renderSheet()

    expect(await screen.findByText("已分配的角色都没有配置权限。")).toBeInTheDocument()
  })
})
