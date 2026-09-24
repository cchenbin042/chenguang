import { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { QueryClient } from "@tanstack/react-query"
import { MemoryRouter, useLocation } from "react-router-dom"
import { AppProviders } from "@/app/providers"
import { AppRouter } from "@/app/router"
import { authStorage } from "@/lib/auth-storage"
import { DataPagination } from "@/components/data-pagination"
import { DataToolbar } from "@/components/data-toolbar"
import { QueryState } from "@/components/query-state"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

function renderAtRoute(path: string, queryClient = new QueryClient()) {
  render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRouter />
        <LocationProbe />
      </MemoryRouter>
    </AppProviders>,
  )
  return queryClient
}

describe("protected routes", () => {
  beforeEach(() => authStorage.clear())

  it("redirects anonymous visitors to login", async () => {
    renderAtRoute("/users")
    expect(await screen.findByRole("heading", { name: "登录" })).toBeInTheDocument()
    expect(screen.getByTestId("location")).toHaveTextContent("/login")
  })

  it("renders protected content when a token exists", async () => {
    authStorage.setToken("token")
    renderAtRoute("/users")
    expect(await screen.findByRole("heading", { name: "用户" })).toBeInTheDocument()
    expect(screen.getByTestId("location")).toHaveTextContent("/users")
  })

  it("redirects an unknown route to overview", async () => {
    authStorage.setToken("token")
    renderAtRoute("/missing")
    expect(await screen.findByRole("heading", { name: "概览" })).toBeInTheDocument()
    expect(screen.getByTestId("location")).toHaveTextContent("/overview")
  })

  it("redirects root to overview", async () => {
    authStorage.setToken("token")
    renderAtRoute("/")
    expect(await screen.findByRole("heading", { name: "概览" })).toBeInTheDocument()
    expect(screen.getByTestId("location")).toHaveTextContent("/overview")
  })

  it("clears the token and query cache on logout", async () => {
    authStorage.setToken("token")
    const queryClient = new QueryClient()
    queryClient.setQueryData(["private"], { name: "secret" })
    renderAtRoute("/overview", queryClient)

    fireEvent.click(await screen.findByRole("button", { name: "退出登录" }))

    expect(authStorage.getToken()).toBeNull()
    expect(queryClient.getQueryData(["private"])).toBeUndefined()
    expect(await screen.findByRole("heading", { name: "登录" })).toBeInTheDocument()
    expect(screen.getByTestId("location")).toHaveTextContent("/login")
  })

  it("keeps the desktop sidebar visible after Ctrl+B", async () => {
    authStorage.setToken("token")
    renderAtRoute("/overview")
    const navigation = await screen.findByRole("navigation", { name: "主导航" })

    fireEvent.keyDown(window, { key: "b", ctrlKey: true })

    expect(navigation.closest('[data-slot="sidebar"]')).not.toHaveAttribute("data-collapsible", "offcanvas")
  })

  it("opens navigation in a Sheet on a narrow screen", async () => {
    const matchMedia = vi.spyOn(window, "matchMedia").mockImplementation((media) => ({
      matches: media.includes("max-width"),
      media,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }))
    try {
      authStorage.setToken("token")
      renderAtRoute("/overview")
      const trigger = await screen.findByRole("button", { name: "打开导航" })

      fireEvent.click(trigger)

      expect(await screen.findByRole("navigation", { name: "主导航" })).toBeInTheDocument()
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    } finally {
      matchMedia.mockRestore()
    }
  })
})

describe("shared list controls", () => {
  it("passes the search text through the toolbar", () => {
    const onSearchChange = vi.fn()
    render(<DataToolbar searchValue="" onSearchChange={onSearchChange} />)
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "alice" } })
    expect(onSearchChange).toHaveBeenCalledWith("alice")
  })

  it("assigns distinct labels to multiple toolbars", () => {
    render(
      <>
        <DataToolbar searchValue="" onSearchChange={vi.fn()} searchPlaceholder="搜索用户" />
        <DataToolbar searchValue="" onSearchChange={vi.fn()} searchPlaceholder="搜索角色" />
      </>,
    )
    const [users, roles] = screen.getAllByRole("searchbox")
    expect(users.id).not.toBe(roles.id)
    expect(screen.getByLabelText("搜索用户")).toBe(users)
    expect(screen.getByLabelText("搜索角色")).toBe(roles)
  })

  it("disables previous on first page and changes to next page", () => {
    const onPageChange = vi.fn()
    render(<DataPagination page={1} pageSize={10} total={25} onPageChange={onPageChange} />)
    expect(screen.getByRole("button", { name: "上一页" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "下一页" }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it("shows a stable empty range when total is zero", () => {
    render(<DataPagination page={4} pageSize={10} total={0} onPageChange={vi.fn()} />)
    expect(screen.getByText("共 0 条，显示 0-0 条")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "上一页" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "下一页" })).toBeDisabled()
  })

  it("offers retry for an error state", () => {
    const onRetry = vi.fn()
    render(<QueryState status="error" onRetry={onRetry} />)
    fireEvent.click(screen.getByRole("button", { name: "重试" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("requires confirmation before delete", () => {
    const onConfirm = vi.fn()
    render(<ConfirmDeleteDialog open onOpenChange={vi.fn()} onConfirm={onConfirm} itemName="测试用户" />)
    expect(screen.getByText(/测试用户/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it("keeps the dialog open and disables actions while deletion is pending", () => {
    function DialogHarness() {
      const [open, setOpen] = useState(true)
      const [pending, setPending] = useState(false)
      return (
        <ConfirmDeleteDialog
          open={open}
          onOpenChange={setOpen}
          onConfirm={() => setPending(true)}
          itemName="测试用户"
          pending={pending}
        />
      )
    }

    render(<DialogHarness />)
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }))

    expect(screen.getByRole("alertdialog")).toBeVisible()
    expect(screen.getByRole("button", { name: "正在删除" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "取消" })).toBeDisabled()
  })
})
