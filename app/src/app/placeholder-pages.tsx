export function LoginPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="w-full max-w-sm border border-border bg-card p-8">
        <p className="mb-5 text-sm font-medium text-primary">辰光管理后台</p>
        <h1 className="text-2xl font-semibold tracking-tight">登录</h1>
        <p className="mt-2 text-sm text-muted-foreground">登录页面即将接入。</p>
      </div>
    </main>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <section aria-label={title}>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
    </section>
  )
}

export function OverviewPage() {
  return <PlaceholderPage title="概览" />
}

export function UsersPage() {
  return <PlaceholderPage title="用户" />
}

export function RolesPage() {
  return <PlaceholderPage title="角色" />
}

export function PermissionsPage() {
  return <PlaceholderPage title="权限" />
}
