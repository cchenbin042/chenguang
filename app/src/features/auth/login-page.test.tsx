import { beforeEach, describe, expect, it } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http } from "msw"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { AppProviders } from "@/app/providers"
import { authStorage } from "@/lib/auth-storage"
import { businessFailure, ok } from "@/test/handlers"
import { createTestQueryClient } from "@/test/render"
import { server } from "@/test/server"
import { LoginPage } from "./login-page"

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

function renderLogin() {
  const queryClient = createTestQueryClient()
  render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/overview" element={<h1>概览</h1>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </AppProviders>,
  )
  return queryClient
}

type User = ReturnType<typeof userEvent.setup>

async function fillCredentials(user: User, password = "secret123") {
  await user.type(await screen.findByLabelText("用户名"), "admin")
  await user.type(screen.getByLabelText("密码"), password)
  await user.type(screen.getByLabelText("验证码"), "A2BC")
}

describe("LoginPage", () => {
  beforeEach(() => authStorage.clear())

  it("loads and refreshes the captcha", async () => {
    const user = userEvent.setup()
    let issued = 0
    server.use(
      http.get("/api/v1/captcha", () => {
        issued += 1
        return ok({ key: `captcha:${issued}`, image: `data:image/png;base64,AAAA${issued}` })
      }),
    )

    renderLogin()

    const first = await screen.findByRole("img", { name: "验证码图片" })
    expect(first).toHaveAttribute("src", "data:image/png;base64,AAAA1")

    await user.click(screen.getByRole("button", { name: "刷新验证码" }))

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "验证码图片" })).toHaveAttribute("src", "data:image/png;base64,AAAA2")
    })
    expect(issued).toBe(2)
  })

  it("submits the captcha key returned by the server", async () => {
    const user = userEvent.setup()
    const bodies: unknown[] = []
    server.use(
      http.get("/api/v1/captcha", () => ok({ key: "captcha:server-key", image: "data:image/png;base64,AAAA" })),
      http.post("/api/v1/auth/login", async ({ request }) => {
        bodies.push(await request.json())
        return ok({ access_token: "jwt", token_type: "bearer" })
      }),
    )

    renderLogin()
    await fillCredentials(user)
    await user.click(screen.getByRole("button", { name: "登录" }))

    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toEqual({
      username: "admin",
      password: "secret123",
      captcha_code: "A2BC",
      captcha_key: "captcha:server-key",
    })
  })

  it("stores the token and redirects after success", async () => {
    const user = userEvent.setup()
    server.use(
      http.post("/api/v1/auth/login", () => ok({ access_token: "jwt-token", token_type: "bearer" })),
      http.get("/api/v1/users/me", () =>
        ok({ id: 7, username: "admin", email: "admin@example.com", is_active: true }),
      ),
    )

    renderLogin()
    await fillCredentials(user)
    await user.click(screen.getByRole("button", { name: "登录" }))

    expect(await screen.findByRole("heading", { name: "概览" })).toBeInTheDocument()
    expect(screen.getByTestId("location")).toHaveTextContent("/overview")
    expect(authStorage.getToken()).toBe("jwt-token")
  })

  it("keeps the username, clears the password and refreshes the captcha after a business failure", async () => {
    const user = userEvent.setup()
    let issued = 0
    server.use(
      http.get("/api/v1/captcha", () => {
        issued += 1
        return ok({ key: `captcha:${issued}`, image: `data:image/png;base64,AAAA${issued}` })
      }),
      http.post("/api/v1/auth/login", () => businessFailure(1003, "密码错误！")),
    )

    renderLogin()
    await fillCredentials(user)
    await user.click(screen.getByRole("button", { name: "登录" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("密码错误！")
    await waitFor(() => expect(screen.getByLabelText("密码")).toHaveValue(""))
    await waitFor(() => expect(issued).toBe(2))
    expect(screen.getByLabelText("用户名")).toHaveValue("admin")
    expect(authStorage.getToken()).toBeNull()
    expect(screen.getByTestId("location")).toHaveTextContent("/login")
  })

  it("falls back to a message when the captcha image cannot be decoded", async () => {
    renderLogin()

    const image = await screen.findByRole("img", { name: "验证码图片" })
    fireEvent.error(image)

    expect(await screen.findByText("验证码加载失败")).toBeInTheDocument()
    expect(screen.queryByRole("img", { name: "验证码图片" })).not.toBeInTheDocument()
  })

  it("blocks submission and shows field errors when the form is empty", async () => {
    const user = userEvent.setup()
    const posts: string[] = []
    server.use(
      http.post("/api/v1/auth/login", () => {
        posts.push("called")
        return ok({ access_token: "jwt", token_type: "bearer" })
      }),
    )

    renderLogin()
    await screen.findByRole("img", { name: "验证码图片" })
    await user.click(screen.getByRole("button", { name: "登录" }))

    expect(await screen.findByText("请输入用户名")).toBeInTheDocument()
    expect(screen.getByLabelText("用户名")).toHaveAttribute("aria-invalid", "true")
    expect(posts).toHaveLength(0)
  })
})
