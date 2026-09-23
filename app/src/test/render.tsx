import { type ReactElement, type ReactNode } from "react"
import { QueryClient } from "@tanstack/react-query"
import { render as testingRender } from "@testing-library/react"
import { AppProviders } from "@/app/providers"

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

export function render(ui: ReactElement) {
  const queryClient = createTestQueryClient()

  function Wrapper({ children }: { children: ReactNode }) {
    return <AppProviders queryClient={queryClient}>{children}</AppProviders>
  }

  return testingRender(ui, { wrapper: Wrapper })
}

export { screen } from "@testing-library/react"
