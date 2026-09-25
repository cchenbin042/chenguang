import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http } from "msw"
import { AppProviders } from "@/app/providers"
import { ok } from "@/test/handlers"
import { createTestQueryClient } from "@/test/render"
import { server } from "@/test/server"
import { UserRolesSection } from "./user-roles-section"

const roleOptions = [
  { id: 1, code: "admin", name: "管理员", description: null, permissions: [] },
  { id: 2, code: "editor", name: "编辑", description: null, permissions: [] },
  { id: 3, code: "viewer", name: "只读", description: null, permissions: [] },
]

function renderSection(overrides: Partial<ComponentProps<typeof UserRolesSection>> = {}) {
  const queryClient = createTestQueryClient()
  const props: ComponentProps<typeof UserRolesSection> = {
    userId: 1,
    currentRoleIds: [1],
    rolesPending: false,
    rolesFailed: false,
    onRetry: vi.fn(),
    ...overrides,
  }

  render(
    <AppProviders queryClient={queryClient}>
      <UserRolesSection {...props} />
    </AppProviders>,
  )

  return props
}

describe("UserRolesSection", () => {
  it("回显已分配角色并以裸数组提交角色 ID", async () => {
    const puts: unknown[] = []
    server.use(
      http.get("/api/v1/roles/roles", () =>
        ok({ items: roleOptions, total: roleOptions.length, page: 1, page_size: 100 }),
      ),
      http.put("/api/v1/users/:id/roles", async ({ request }) => {
        puts.push(await request.json())
        return ok({ id: 1, username: "alice", email: "alice@example.com", is_active: true })
      }),
    )

    renderSection()
    const user = userEvent.setup()

    expect(await screen.findByRole("checkbox", { name: "管理员" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "编辑" })).not.toBeChecked()

    await user.click(screen.getByRole("checkbox", { name: "只读" }))
    await user.click(screen.getByRole("button", { name: "保存" }))

    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0]).toEqual([1, 3])
  })

  it("角色总数超过上限时提示并禁用保存", async () => {
    server.use(
      http.get("/api/v1/roles/roles", () => ok({ items: roleOptions, total: 120, page: 1, page_size: 100 })),
    )

    renderSection()

    expect(await screen.findByRole("alert")).toHaveTextContent("超过一次可加载的 100 条")
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled()
  })

  it("失败时重试同时覆盖用户角色与角色选项", async () => {
    server.use(
      http.get("/api/v1/roles/roles", () =>
        ok({ items: roleOptions, total: roleOptions.length, page: 1, page_size: 100 }),
      ),
    )
    const user = userEvent.setup()
    const props = renderSection({ rolesFailed: true })

    await user.click(await screen.findByRole("button", { name: "重试" }))

    expect(props.onRetry).toHaveBeenCalledTimes(1)
  })
})
