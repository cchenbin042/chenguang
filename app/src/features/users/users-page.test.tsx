import { describe, expect, it } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http } from "msw"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AppProviders } from "@/app/providers"
import { ok } from "@/test/handlers"
import { createTestQueryClient } from "@/test/render"
import { server } from "@/test/server"
import type { UserRead } from "./types"
import { UsersPage } from "./users-page"

const users: UserRead[] = [
  { id: 1, username: "alice", email: "alice@example.com", is_active: true },
  { id: 2, username: "bob", email: "bob@example.com", is_active: false },
]

const roleOptions = [
  { id: 1, code: "admin", name: "管理员", description: null, permissions: [] },
  { id: 2, code: "editor", name: "编辑", description: null, permissions: [] },
  { id: 3, code: "viewer", name: "只读", description: null, permissions: [] },
]

function renderUsers() {
  const queryClient = createTestQueryClient()
  render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={["/users"]}>
        <Routes>
          <Route path="/users" element={<UsersPage />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  )
  return queryClient
}

describe("UsersPage", () => {
  it("loads users with page, page_size and keyword", async () => {
    const requests: URL[] = []
    server.use(
      http.get("/api/v1/users", ({ request }) => {
        requests.push(new URL(request.url))
        return ok({ items: users, total: 2, page: 1, page_size: 10 })
      }),
    )

    renderUsers()
    const user = userEvent.setup()

    expect(await screen.findByText("alice")).toBeInTheDocument()
    expect(requests[0].pathname).toBe("/api/v1/users")
    expect(requests[0].searchParams.get("page")).toBe("1")
    expect(requests[0].searchParams.get("page_size")).toBe("10")
    expect(requests[0].searchParams.has("keyword")).toBe(false)

    await user.type(screen.getByRole("searchbox"), "alice")

    await waitFor(() => {
      expect(requests.some((url) => url.searchParams.get("keyword") === "alice")).toBe(true)
    })
  })

  it("debounces the search and resets to page one", async () => {
    const requests: URL[] = []
    server.use(
      http.get("/api/v1/users", ({ request }) => {
        const url = new URL(request.url)
        requests.push(url)
        return ok({
          items: [users[0]],
          total: 40,
          page: Number(url.searchParams.get("page")),
          page_size: 10,
        })
      }),
    )

    renderUsers()
    const user = userEvent.setup()
    await screen.findByText("alice")

    await user.click(screen.getByRole("button", { name: "下一页" }))
    await waitFor(() => expect(requests.some((url) => url.searchParams.get("page") === "2")).toBe(true))

    await user.type(screen.getByRole("searchbox"), "bob")

    await waitFor(() => expect(requests.some((url) => url.searchParams.get("keyword") === "bob")).toBe(true))
    const keywordRequests = requests.filter((url) => url.searchParams.get("keyword") === "bob")
    // 三次击键只应产生一次查询
    expect(keywordRequests).toHaveLength(1)
    expect(keywordRequests[0].searchParams.get("page")).toBe("1")
  })

  it("creates a user and refreshes the list", async () => {
    const bodies: unknown[] = []
    let listCalls = 0
    server.use(
      http.get("/api/v1/users", () => {
        listCalls += 1
        return ok({ items: users, total: 2, page: 1, page_size: 10 })
      }),
      http.post("/api/v1/users", async ({ request }) => {
        bodies.push(await request.json())
        return ok({ id: 3, username: "carol", email: "carol@example.com", is_active: true })
      }),
    )

    renderUsers()
    const user = userEvent.setup()
    await screen.findByText("alice")
    const callsBefore = listCalls

    await user.click(screen.getByRole("button", { name: "新建用户" }))
    await user.type(await screen.findByLabelText("用户名"), "carol")
    await user.type(screen.getByLabelText("邮箱"), "carol@example.com")
    await user.type(screen.getByLabelText("密码"), "secret123")
    await user.click(screen.getByRole("button", { name: "创建" }))

    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toEqual({ username: "carol", email: "carol@example.com", password: "secret123" })
    await waitFor(() => expect(listCalls).toBeGreaterThan(callsBefore))
  })

  it("loads the selected user's roles and submits a raw role id array", async () => {
    const puts: { url: URL; body: unknown }[] = []
    server.use(
      http.get("/api/v1/users", () => ok({ items: users, total: 2, page: 1, page_size: 10 })),
      http.get("/api/v1/users/:id/roles", ({ params }) =>
        ok([
          {
            ...users[0],
            id: Number(params.id),
            roles: [{ id: 1, code: "admin", name: "管理员", description: null }],
          },
        ]),
      ),
      http.get("/api/v1/roles/roles", () =>
        ok({ items: roleOptions, total: roleOptions.length, page: 1, page_size: 100 }),
      ),
      http.put("/api/v1/users/:id/roles", async ({ request }) => {
        puts.push({ url: new URL(request.url), body: await request.json() })
        return ok(users[0])
      }),
    )

    renderUsers()
    const user = userEvent.setup()
    await screen.findByText("alice")

    await user.click(screen.getAllByRole("button", { name: "分配角色" })[0])

    expect(await screen.findByRole("checkbox", { name: "管理员" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "编辑" })).not.toBeChecked()

    await user.click(screen.getByRole("checkbox", { name: "只读" }))
    await user.click(screen.getByRole("button", { name: "保存" }))

    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0].url.pathname).toBe("/api/v1/users/1/roles")
    expect(puts[0].body).toEqual([1, 3])
  })

  it("shows the user detail sheet with the selected account", async () => {
    server.use(
      http.get("/api/v1/users", () => ok({ items: users, total: 2, page: 1, page_size: 10 })),
      http.get("/api/v1/users/:id", ({ params }) =>
        ok({ id: Number(params.id), username: "bob", email: "bob@example.com", is_active: false }),
      ),
    )

    renderUsers()
    const user = userEvent.setup()
    await screen.findByText("bob")

    await user.click(screen.getAllByRole("button", { name: "详情" })[1])

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("bob@example.com")).toBeInTheDocument()
    expect(within(dialog).getByText("已禁用")).toBeInTheDocument()
  })

  it("blocks role assignment when the role list is truncated", async () => {
    server.use(
      http.get("/api/v1/users", () => ok({ items: users, total: 2, page: 1, page_size: 10 })),
      http.get("/api/v1/users/:id/roles", () => ok([{ ...users[0], roles: [] }])),
      http.get("/api/v1/roles/roles", () =>
        ok({ items: roleOptions, total: 120, page: 1, page_size: 100 }),
      ),
    )

    renderUsers()
    const user = userEvent.setup()
    await screen.findByText("alice")

    await user.click(screen.getAllByRole("button", { name: "分配角色" })[0])

    expect(await screen.findByRole("alert")).toHaveTextContent("超过一次可加载的 100 条")
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled()
  })
})
