import { describe, expect, it } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AppProviders } from "@/app/providers"
import type { PageResult } from "@/lib/api-types"
import { businessFailure, ok } from "@/test/handlers"
import { createTestQueryClient } from "@/test/render"
import { server } from "@/test/server"
import { OverviewPage } from "./overview-page"

function page(total: number): PageResult<never> {
  return { items: [], total, page: 1, page_size: 1 }
}

function renderOverview() {
  const queryClient = createTestQueryClient()
  render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={["/overview"]}>
        <Routes>
          <Route path="/overview" element={<OverviewPage />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  )
  return queryClient
}

describe("OverviewPage", () => {
  it("shows the backend health and three real totals", async () => {
    server.use(
      http.get("/health", () => HttpResponse.json({ status: "ok" })),
      http.get("/api/v1/users", () => ok(page(12))),
      http.get("/api/v1/roles/roles", () => ok(page(4))),
      http.get("/api/v1/permissions/", () => ok(page(18))),
    )

    renderOverview()

    expect(await screen.findByText("服务正常")).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole("link", { name: "用户管理" })).toHaveTextContent("12"))
    expect(screen.getByRole("link", { name: "角色管理" })).toHaveTextContent("4")
    expect(screen.getByRole("link", { name: "权限管理" })).toHaveTextContent("18")
  })

  it("keeps successful totals visible when one request fails", async () => {
    server.use(
      http.get("/api/v1/users", () => ok(page(12))),
      http.get("/api/v1/roles/roles", () => ok(page(4))),
      http.get("/api/v1/permissions/", () => businessFailure(500, "服务器内部错误", 500)),
    )

    renderOverview()

    expect(await screen.findByText("暂不可用")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "用户管理" })).toHaveTextContent("12")
    expect(screen.getByRole("link", { name: "角色管理" })).toHaveTextContent("4")
  })

  it("reports an unhealthy backend separately from the totals", async () => {
    server.use(http.get("/health", () => HttpResponse.json({ status: "error" }, { status: 503 })))

    renderOverview()

    expect(await screen.findByText("服务不可用")).toBeInTheDocument()
    expect(screen.queryByText("服务正常")).not.toBeInTheDocument()
  })

  it("links each summary to its management page", async () => {
    renderOverview()

    expect(await screen.findByRole("link", { name: "用户管理" })).toHaveAttribute("href", "/users")
    expect(screen.getByRole("link", { name: "角色管理" })).toHaveAttribute("href", "/roles")
    expect(screen.getByRole("link", { name: "权限管理" })).toHaveAttribute("href", "/permissions")
  })
})
