import { lazy, Suspense } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "@/components/layout/app-shell"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Skeleton } from "@/components/ui/skeleton"

const LoginPage = lazy(() => import("./placeholder-pages").then(({ LoginPage }) => ({ default: LoginPage })))
const OverviewPage = lazy(() => import("./placeholder-pages").then(({ OverviewPage }) => ({ default: OverviewPage })))
const UsersPage = lazy(() => import("./placeholder-pages").then(({ UsersPage }) => ({ default: UsersPage })))
const RolesPage = lazy(() => import("./placeholder-pages").then(({ RolesPage }) => ({ default: RolesPage })))
const PermissionsPage = lazy(() => import("./placeholder-pages").then(({ PermissionsPage }) => ({ default: PermissionsPage })))

function RouteFallback() {
  return <div className="p-6"><Skeleton className="h-8 w-48" /></div>
}

export function AppRouter() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/permissions" element={<PermissionsPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </Suspense>
  )
}
