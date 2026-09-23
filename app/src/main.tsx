import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { AppProviders } from "@/app/providers"
import "@/index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<p>辰光管理后台</p>} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  </StrictMode>,
)
