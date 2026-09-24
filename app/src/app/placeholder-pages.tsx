function PlaceholderPage({ title }: { title: string }) {
  return (
    <section aria-label={title}>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
    </section>
  )
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
