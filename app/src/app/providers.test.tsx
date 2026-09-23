import { describe, expect, it } from "vitest"
import { render, screen } from "@/test/render"

describe("AppProviders", () => {
  it("renders application children", () => {
    render(<p>辰光管理后台</p>)
    expect(screen.getByText("辰光管理后台")).toBeInTheDocument()
  })
})
