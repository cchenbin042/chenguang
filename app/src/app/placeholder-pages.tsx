function PlaceholderPage({ title }: { title: string }) {
  return (
    <section aria-label={title}>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
    </section>
  )
}

export function PermissionsPage() {
  return <PlaceholderPage title="权限" />
}
