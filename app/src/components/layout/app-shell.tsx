import { type CSSProperties } from "react"
import { ChartBarIcon, SignOutIcon, UsersIcon, UserGearIcon, ShieldCheckIcon } from "@phosphor-icons/react"
import { useQueryClient } from "@tanstack/react-query"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarInset,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar"
import { authStorage } from "@/lib/auth-storage"

const navigation = [
  { to: "/overview", label: "概览", icon: ChartBarIcon },
  { to: "/users", label: "用户", icon: UsersIcon },
  { to: "/roles", label: "角色", icon: UserGearIcon },
  { to: "/permissions", label: "权限", icon: ShieldCheckIcon },
] as const

function AppNavigation() {
  const { setOpenMobile } = useSidebar()
  const { pathname } = useLocation()

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-4">
        <span className="text-sm font-semibold tracking-wide">辰光</span>
        <span className="text-xs text-sidebar-foreground/70">管理后台</span>
      </SidebarHeader>
      <SidebarContent className="py-3">
        <nav aria-label="主导航">
          <SidebarGroup>
            <SidebarMenu>
              {navigation.map(({ to, label, icon: Icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild isActive={pathname === to}>
                    <NavLink to={to} onClick={() => setOpenMobile(false)}>
                      <Icon strokeWidth={1.75} aria-hidden="true" />
                      <span>{label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </nav>
      </SidebarContent>
    </Sidebar>
  )
}

function ShellContent() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const current = navigation.find(({ to }) => to === pathname)?.label ?? "概览"

  function handleLogout() {
    authStorage.clear()
    queryClient.clear()
    navigate("/login", { replace: true })
  }

  return (
    <>
      <AppNavigation />
      <SidebarInset className="min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
          <span className="md:hidden"><SidebarTrigger aria-label="打开导航" /></span>
          <nav aria-label="面包屑" className="min-w-0 flex-1">
            <ol className="flex min-w-0 items-center gap-2 text-sm">
              <li className="shrink-0 font-medium">辰光管理后台</li>
              <li className="text-muted-foreground" aria-hidden="true">/</li>
              <li className="min-w-0 truncate text-muted-foreground" aria-current="page">{current}</li>
            </ol>
          </nav>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <SignOutIcon data-icon="inline-start" strokeWidth={1.75} aria-hidden="true" />
            退出登录
          </Button>
        </header>
        <div className="w-full flex-1 px-4 py-6 md:px-6"><Outlet /></div>
      </SidebarInset>
    </>
  )
}

export function AppShell() {
  return (
    <SidebarProvider style={{ "--sidebar-width": "14rem" } as CSSProperties}>
      <ShellContent />
    </SidebarProvider>
  )
}
