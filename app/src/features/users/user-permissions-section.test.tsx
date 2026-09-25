import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { EffectivePermission } from "./effective-permissions"
import { UserPermissionsSection } from "./user-permissions-section"

function renderSection(overrides: Partial<ComponentProps<typeof UserPermissionsSection>> = {}) {
  const props: ComponentProps<typeof UserPermissionsSection> = {
    permissions: [],
    hasRoles: false,
    pending: false,
    failed: false,
    onRetry: vi.fn(),
    ...overrides,
  }

  render(<UserPermissionsSection {...props} />)
  return props
}

const userListPermission: EffectivePermission = {
  id: 10,
  code: "user:list",
  name: "获取用户列表",
  description: null,
  sources: [
    { id: 1, name: "管理员" },
    { id: 2, name: "开发" },
  ],
}

describe("UserPermissionsSection", () => {
  it("列出权限名称、编码与全部来源角色", () => {
    renderSection({ permissions: [userListPermission], hasRoles: true })

    expect(screen.getByText("获取用户列表")).toBeInTheDocument()
    expect(screen.getByText("user:list")).toBeInTheDocument()
    expect(screen.getByText("来源：管理员、开发")).toBeInTheDocument()
  })

  it("用户没有角色时说明权限来自角色", () => {
    renderSection({ hasRoles: false })

    expect(screen.getByText("该用户没有任何角色，因此没有权限。")).toBeInTheDocument()
  })

  it("已分配角色但角色没配权限时给出另一种空态", () => {
    renderSection({ hasRoles: true })

    expect(screen.getByText("已分配的角色都没有配置权限。")).toBeInTheDocument()
  })

  it("加载失败时提供重试", async () => {
    const user = userEvent.setup()
    const props = renderSection({ failed: true })

    await user.click(screen.getByRole("button", { name: "重试" }))

    expect(props.onRetry).toHaveBeenCalledTimes(1)
  })
})
