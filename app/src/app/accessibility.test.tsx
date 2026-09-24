import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http } from "msw"
import { MemoryRouter } from "react-router-dom"
import { AppProviders } from "@/app/providers"
import { AppRouter } from "@/app/router"
import { authStorage } from "@/lib/auth-storage"
import { ok } from "@/test/handlers"
import { createTestQueryClient } from "@/test/render"
import { server } from "@/test/server"

function renderApp(path: string) {
  const queryClient = createTestQueryClient()
  render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRouter />
      </MemoryRouter>
    </AppProviders>,
  )
  return queryClient
}

/** 图标按钮必须带可访问名称，否则读屏只会念出「按钮」 */
function buttonsWithoutAccessibleName() {
  return screen
    .getAllByRole("button", { hidden: true })
    .filter((button) => {
      const labelled = button.getAttribute("aria-label") ?? button.getAttribute("aria-labelledby")
      return !labelled && (button.textContent ?? "").trim() === ""
    })
    .map((button) => button.outerHTML)
}

function mockNarrowScreen() {
  return vi.spyOn(window, "matchMedia").mockImplementation((media) => ({
    matches: media.includes("max-width"),
    media,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }))
}

describe("accessibility", () => {
  beforeEach(() => authStorage.clear())

  it("provides accessible names for navigation and icon buttons", async () => {
    authStorage.setToken("token")
    renderApp("/users")

    const navigation = await screen.findByRole("navigation", { name: "主导航" })
    expect(within(navigation).getAllByRole("link")).toHaveLength(4)
    expect(within(navigation).getByRole("link", { name: "用户" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "退出登录" })).toBeInTheDocument()
    expect(buttonsWithoutAccessibleName()).toEqual([])
  })

  it("exposes a title on every creation sheet", async () => {
    const user = userEvent.setup()
    authStorage.setToken("token")
    renderApp("/users")

    await user.click(await screen.findByRole("button", { name: "新建用户" }))
    expect(await screen.findByRole("dialog", { name: "新建用户" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "关闭" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())

    await user.click(screen.getByRole("link", { name: "角色" }))
    await user.click(await screen.findByRole("button", { name: "新建角色" }))
    expect(await screen.findByRole("dialog", { name: "新建角色" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "关闭" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())

    await user.click(screen.getByRole("link", { name: "权限" }))
    await user.click(await screen.findByRole("button", { name: "新建权限" }))
    expect(await screen.findByRole("dialog", { name: "新建权限" })).toBeInTheDocument()
  })

  it("exposes a title on the delete confirmation dialog", async () => {
    const user = userEvent.setup()
    authStorage.setToken("token")
    server.use(
      http.get("/api/v1/roles/roles", () =>
        ok({
          items: [{ id: 1, code: "admin", name: "管理员", description: null }],
          total: 1,
          page: 1,
          page_size: 10,
        }),
      ),
    )
    renderApp("/roles")

    await user.click(await screen.findByRole("button", { name: "删除" }))

    expect(await screen.findByRole("alertdialog", { name: "确认删除" })).toBeInTheDocument()
  })

  it("opens the navigation from the menu button on a narrow screen", async () => {
    const matchMedia = mockNarrowScreen()
    try {
      authStorage.setToken("token")
      renderApp("/overview")

      await userEvent.click(await screen.findByRole("button", { name: "打开导航" }))

      const dialog = await screen.findByRole("dialog", { name: "导航菜单" })
      expect(within(dialog).getByRole("navigation", { name: "主导航" })).toBeInTheDocument()
    } finally {
      matchMedia.mockRestore()
    }
  })
})
