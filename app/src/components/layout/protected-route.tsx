import { type ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { authStorage } from "@/lib/auth-storage"

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()

  if (!authStorage.getToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
