import { QueryState } from "@/components/query-state"
import type { EffectivePermission } from "./effective-permissions"

type UserPermissionsSectionProps = {
  permissions: EffectivePermission[]
  /** 该用户是否已经分配了角色，用于区分两种空态文案 */
  hasRoles: boolean
  pending: boolean
  failed: boolean
  onRetry: () => void
}

/** 只读展示用户的有效权限。权限由角色决定，这里不提供修改入口。 */
export function UserPermissionsSection({
  permissions,
  hasRoles,
  pending,
  failed,
  onRetry,
}: UserPermissionsSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">有效权限</h3>
      <p className="text-xs text-muted-foreground">权限由角色决定，此处只读。</p>

      {pending ? (
        <QueryState status="loading" />
      ) : failed ? (
        <QueryState status="error" message="权限数据加载失败。" onRetry={onRetry} />
      ) : permissions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {hasRoles ? "已分配的角色都没有配置权限。" : "该用户没有任何角色，因此没有权限。"}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {permissions.map((permission) => (
            <li key={permission.id} className="flex flex-col gap-0.5 border border-border px-3 py-2">
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium">{permission.name}</span>
                <span className="text-xs text-muted-foreground">{permission.code}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                来源：{permission.sources.map((source) => source.name).join("、")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
