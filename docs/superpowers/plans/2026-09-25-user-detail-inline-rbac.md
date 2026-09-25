# 用户详情内联角色与有效权限 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把用户角色管理和有效权限展示内联进「用户详情」抽屉，使用户域只剩「详情」一个入口。

**Architecture:** 在 `app/src/features/users/` 内新增三个聚焦单元：一个无 React 依赖的权限聚合纯函数、一个可编辑的角色勾选区、一个只读的权限展示区；`user-detail-sheet.tsx` 作为组合层持有两个查询并把数据分发给两个子区。删除原来的 `user-role-sheet.tsx`，从 `users-page.tsx` 移除「分配角色」入口。不新增后端接口、表或迁移。

**Tech Stack:** React 19、TypeScript、Vite、TanStack Query、shadcn/ui（Radix）、Tailwind CSS 4、Vitest + React Testing Library + MSW。

## Global Constraints

- 代码注释、日志、用户可见文案、提交信息一律用中文。
- **禁止新增后端接口、数据表或 alembic 迁移**；本次改动只消费现有接口。
- **提交必须路径限定。** 仓库内存在他人未提交的改动（`src/modules/provider/repository.py`、`src/modules/provider/servcie.py` 已在暂存区），因此禁止 `git add -A`、`git add .`、`git commit -a`。每个提交都用 `git commit -m "<msg>" -- <本次改动的确切文件>`。
- 用户域保持既有分层：页面只消费 `queries.ts`，不直接调用 `api.ts`；新增组件不得直接 `fetch`。
- 角色勾选项一次最多加载 `ROLE_OPTIONS_PAGE_SIZE`（= 100）条；超过时必须提示并禁用保存，不静默遗漏。
- 视觉沿用 `app/README.md`：固定浅色主题、单一琥珀强调色、6 到 8px 圆角、只用 `@phosphor-icons/react`、文案不使用 em dash / en dash。
- 浮层宽度沿用 `SheetContent` 默认值（`data-[side=right]:sm:max-w-sm`），不新增宽度类，避免与 Radix 的 data 变体打架。
- 所有 `npm` 命令的工作目录是 `D:\python\Agent\chenguang\app`；所有 `git` 命令的工作目录是仓库根目录 `D:\python\Agent\chenguang`。

## 文件结构

| 文件 | 类型 | 职责 |
| --- | --- | --- |
| `app/src/features/users/effective-permissions.ts` | 新增 | 纯函数 `collectEffectivePermissions(roles: RoleRead[]): EffectivePermission[]`；按权限 id 去重、保留首次出现顺序、聚合来源角色 |
| `app/src/features/users/effective-permissions.test.ts` | 新增 | 上述纯函数的单元测试 |
| `app/src/features/users/user-permissions-section.tsx` | 新增 | 只读权限区；不发起请求 |
| `app/src/features/users/user-permissions-section.test.tsx` | 新增 | 只读权限区的组件测试 |
| `app/src/features/users/user-roles-section.tsx` | 新增 | 可编辑角色勾选区；持有 `useRoleOptions` 与 `useAssignUserRoles` |
| `app/src/features/users/user-roles-section.test.tsx` | 新增 | 角色勾选区的组件测试 |
| `app/src/features/users/user-detail-sheet.tsx` | 修改 | 组合层：账号信息 + 角色区 + 权限区 |
| `app/src/features/users/user-detail-sheet.test.tsx` | 新增 | 组合层测试 |
| `app/src/features/users/types.ts` | 修改 | 删除重复且缺 `permissions` 的 `UserRoleRead`，复用 `RoleRead` |
| `app/src/test/handlers.ts` | 修改 | 补 `/api/v1/users/:id` 与 `/api/v1/users/:id/roles` 默认处理器 |
| `app/src/features/users/users-page.tsx` | 修改 | 移除「分配角色」按钮与 `UserRoleSheet` |
| `app/src/features/users/user-create-sheet.tsx` | 修改 | 一句引导文案改指向详情 |
| `app/src/features/users/users-page.test.tsx` | 修改 | 入口改动后的用例调整 |
| `app/src/features/users/user-role-sheet.tsx` | 删除 | 职责并入详情抽屉 |
| `app/README.md` | 修改 | 契约表与目录说明 |

---

### Task 1: 权限聚合纯函数

**Files:**
- Create: `app/src/features/users/effective-permissions.ts`
- Test: `app/src/features/users/effective-permissions.test.ts`

**Interfaces:**
- Consumes: `RoleRead`（`@/features/roles/types`）
- Produces: `EffectivePermissionSource`、`EffectivePermission`、`collectEffectivePermissions(roles: RoleRead[]): EffectivePermission[]`，供 Task 3、Task 5 使用

- [ ] **Step 1: 先写失败的测试**

创建 `app/src/features/users/effective-permissions.test.ts`：

```ts
import { describe, expect, it } from "vitest"
import type { RoleRead } from "@/features/roles/types"
import { collectEffectivePermissions } from "./effective-permissions"

function role(id: number, name: string, permissionIds: number[]): RoleRead {
  return {
    id,
    code: `role-${id}`,
    name,
    description: null,
    permissions: permissionIds.map((permissionId) => ({
      id: permissionId,
      code: `perm-${permissionId}`,
      name: `权限${permissionId}`,
      description: null,
    })),
  }
}

describe("collectEffectivePermissions", () => {
  it("按首次出现顺序合并多个角色的权限", () => {
    const result = collectEffectivePermissions([role(1, "管理员", [10, 20]), role(2, "开发", [30])])

    expect(result.map((item) => item.id)).toEqual([10, 20, 30])
  })

  it("同一权限被多个角色授予时只保留一行并记录全部来源", () => {
    const result = collectEffectivePermissions([role(1, "管理员", [10]), role(2, "开发", [10, 30])])

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe(10)
    expect(result[0].sources).toEqual([
      { id: 1, name: "管理员" },
      { id: 2, name: "开发" },
    ])
  })

  it("用户没有任何角色时返回空数组", () => {
    expect(collectEffectivePermissions([])).toEqual([])
  })

  it("角色的 permissions 缺失时不抛错", () => {
    const withoutPermissions: RoleRead = { id: 3, code: "viewer", name: "只读", description: null }

    expect(collectEffectivePermissions([withoutPermissions])).toEqual([])
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run（工作目录 `app`）：`npx vitest run src/features/users/effective-permissions.test.ts`

Expected: FAIL，报错指向 `Failed to resolve import "./effective-permissions"`（模块尚未创建）。

- [ ] **Step 3: 写最小实现**

创建 `app/src/features/users/effective-permissions.ts`：

```ts
import type { RoleRead } from "@/features/roles/types"

/** 授予某个权限的角色 */
export interface EffectivePermissionSource {
  id: number
  name: string
}

/** 用户的有效权限：同一权限被多个角色授予时只占一行，来源全部记录在 sources 里 */
export interface EffectivePermission {
  id: number
  code: string
  name: string
  description: string | null
  sources: EffectivePermissionSource[]
}

/**
 * 汇总用户角色带来的权限。
 * 按权限 id 去重，保留首次出现的顺序；sources 按角色在入参中的顺序聚合。
 * 角色列表接口的 response_model 会裁掉 permissions，因此这里对 undefined 按空数组处理。
 */
export function collectEffectivePermissions(roles: RoleRead[]): EffectivePermission[] {
  const merged = new Map<number, EffectivePermission>()

  for (const role of roles) {
    for (const permission of role.permissions ?? []) {
      const existing = merged.get(permission.id)
      if (existing) {
        existing.sources.push({ id: role.id, name: role.name })
        continue
      }

      merged.set(permission.id, {
        id: permission.id,
        code: permission.code,
        name: permission.name,
        description: permission.description,
        sources: [{ id: role.id, name: role.name }],
      })
    }
  }

  return [...merged.values()]
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run：`npx vitest run src/features/users/effective-permissions.test.ts`

Expected: PASS，4 个用例全绿。

- [ ] **Step 5: 提交**

```bash
git add app/src/features/users/effective-permissions.ts app/src/features/users/effective-permissions.test.ts
git commit -m "feat(users): 新增用户有效权限聚合函数" -- app/src/features/users/effective-permissions.ts app/src/features/users/effective-permissions.test.ts
```

---

### Task 2: 类型修正，复用 RoleRead

**Files:**
- Modify: `app/src/features/users/types.ts`

**Interfaces:**
- Consumes: `RoleRead`（`@/features/roles/types`）
- Produces: `UserWithRolesRead.roles: RoleRead[]`，使 `permissions` 在类型上可见，供 Task 5 传给 `collectEffectivePermissions`

- [ ] **Step 1: 改写 types.ts**

把 `app/src/features/users/types.ts` 整体替换为：

```ts
import type { RoleRead } from "@/features/roles/types"

export interface UserRead {
  id: number
  username: string
  email: string
  is_active: boolean
}

/**
 * GET /api/v1/users/{id}/roles 的返回。
 * roles 复用角色域的类型：后端 UserWithRolesRead.roles 就是 list[RoleRead]，
 * 每个角色都带 permissions，因此可以直接聚合出用户的有效权限。
 */
export interface UserWithRolesRead extends UserRead {
  roles: RoleRead[]
}

export interface UserCreateInput {
  username: string
  email: string
  password: string
}

export interface UserListParams {
  page: number
  page_size: number
  keyword?: string
}

export const USER_PAGE_SIZE = 10
```

- [ ] **Step 2: 跑全量测试确认没有引用被破坏**

Run（工作目录 `app`）：`npm test`

Expected: PASS。原 `UserRoleRead` 只在本文件定义、在本文件之外无引用，删除后 `user-role-sheet.tsx` 与 `users-page.tsx` 仍能通过类型检查与测试。

- [ ] **Step 3: 提交**

```bash
git add app/src/features/users/types.ts
git commit -m "refactor(users): 用户角色类型复用 RoleRead 以带上 permissions" -- app/src/features/users/types.ts
```

---

### Task 3: 只读有效权限区

**Files:**
- Create: `app/src/features/users/user-permissions-section.tsx`
- Test: `app/src/features/users/user-permissions-section.test.tsx`

**Interfaces:**
- Consumes: `EffectivePermission`（Task 1）；`QueryState`（`@/components/query-state`）
- Produces: `UserPermissionsSection`，props 为 `{ permissions: EffectivePermission[]; hasRoles: boolean; pending: boolean; failed: boolean; onRetry: () => void }`，供 Task 5 使用

- [ ] **Step 1: 先写失败的测试**

创建 `app/src/features/users/user-permissions-section.test.tsx`：

```tsx
import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { EffectivePermission } from "./effective-permissions"
import { UserPermissionsSection } from "./user-permissions-section"

function renderSection(overrides: Partial<ComponentProps<typeof UserPermissionsSection>> = {}) {
  const props: ComponentProps<typeof UserPermissionsSection> = {
    permissions: [],
    hasRoles: false,
    pending: false,
    failed: false,
    onRetry: vi.fn(),
    ...overrides,
  }

  render(<UserPermissionsSection {...props} />)
  return props
}

const userListPermission: EffectivePermission = {
  id: 10,
  code: "user:list",
  name: "获取用户列表",
  description: null,
  sources: [
    { id: 1, name: "管理员" },
    { id: 2, name: "开发" },
  ],
}

describe("UserPermissionsSection", () => {
  it("列出权限名称、编码与全部来源角色", () => {
    renderSection({ permissions: [userListPermission], hasRoles: true })

    expect(screen.getByText("获取用户列表")).toBeInTheDocument()
    expect(screen.getByText("user:list")).toBeInTheDocument()
    expect(screen.getByText("来源：管理员、开发")).toBeInTheDocument()
  })

  it("用户没有角色时说明权限来自角色", () => {
    renderSection({ hasRoles: false })

    expect(screen.getByText("该用户没有任何角色，因此没有权限。")).toBeInTheDocument()
  })

  it("已分配角色但角色没配权限时给出另一种空态", () => {
    renderSection({ hasRoles: true })

    expect(screen.getByText("已分配的角色都没有配置权限。")).toBeInTheDocument()
  })

  it("加载失败时提供重试", async () => {
    const user = userEvent.setup()
    const props = renderSection({ failed: true })

    await user.click(screen.getByRole("button", { name: "重试" }))

    expect(props.onRetry).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run（工作目录 `app`）：`npx vitest run src/features/users/user-permissions-section.test.tsx`

Expected: FAIL，`Failed to resolve import "./user-permissions-section"`。

- [ ] **Step 3: 写最小实现**

创建 `app/src/features/users/user-permissions-section.tsx`：

```tsx
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
```

- [ ] **Step 4: 运行测试，确认通过**

Run：`npx vitest run src/features/users/user-permissions-section.test.tsx`

Expected: PASS，4 个用例全绿。

- [ ] **Step 5: 提交**

```bash
git add app/src/features/users/user-permissions-section.tsx app/src/features/users/user-permissions-section.test.tsx
git commit -m "feat(users): 新增只读有效权限区" -- app/src/features/users/user-permissions-section.tsx app/src/features/users/user-permissions-section.test.tsx
```

---

### Task 4: 可编辑的角色勾选区

**Files:**
- Create: `app/src/features/users/user-roles-section.tsx`
- Test: `app/src/features/users/user-roles-section.test.tsx`

**Interfaces:**
- Consumes: `useRoleOptions`、`useAssignUserRoles`（`./queries`，已存在）；`ROLE_OPTIONS_PAGE_SIZE`（`@/features/roles/types`）
- Produces: `UserRolesSection`，props 为 `{ userId: number | null; currentRoleIds: number[]; rolesPending: boolean; rolesFailed: boolean; onRetry: () => void }`，供 Task 5 使用

- [ ] **Step 1: 先写失败的测试**

创建 `app/src/features/users/user-roles-section.test.tsx`：

```tsx
import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http } from "msw"
import { AppProviders } from "@/app/providers"
import { ok } from "@/test/handlers"
import { createTestQueryClient } from "@/test/render"
import { server } from "@/test/server"
import { UserRolesSection } from "./user-roles-section"

const roleOptions = [
  { id: 1, code: "admin", name: "管理员", description: null, permissions: [] },
  { id: 2, code: "editor", name: "编辑", description: null, permissions: [] },
  { id: 3, code: "viewer", name: "只读", description: null, permissions: [] },
]

function renderSection(overrides: Partial<ComponentProps<typeof UserRolesSection>> = {}) {
  const queryClient = createTestQueryClient()
  const props: ComponentProps<typeof UserRolesSection> = {
    userId: 1,
    currentRoleIds: [1],
    rolesPending: false,
    rolesFailed: false,
    onRetry: vi.fn(),
    ...overrides,
  }

  render(
    <AppProviders queryClient={queryClient}>
      <UserRolesSection {...props} />
    </AppProviders>,
  )

  return props
}

describe("UserRolesSection", () => {
  it("回显已分配角色并以裸数组提交角色 ID", async () => {
    const puts: unknown[] = []
    server.use(
      http.get("/api/v1/roles/roles", () =>
        ok({ items: roleOptions, total: roleOptions.length, page: 1, page_size: 100 }),
      ),
      http.put("/api/v1/users/:id/roles", async ({ request }) => {
        puts.push(await request.json())
        return ok({ id: 1, username: "alice", email: "alice@example.com", is_active: true })
      }),
    )

    renderSection()
    const user = userEvent.setup()

    expect(await screen.findByRole("checkbox", { name: "管理员" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "编辑" })).not.toBeChecked()

    await user.click(screen.getByRole("checkbox", { name: "只读" }))
    await user.click(screen.getByRole("button", { name: "保存" }))

    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0]).toEqual([1, 3])
  })

  it("角色总数超过上限时提示并禁用保存", async () => {
    server.use(
      http.get("/api/v1/roles/roles", () => ok({ items: roleOptions, total: 120, page: 1, page_size: 100 })),
    )

    renderSection()

    expect(await screen.findByRole("alert")).toHaveTextContent("超过一次可加载的 100 条")
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled()
  })

  it("失败时重试同时覆盖用户角色与角色选项", async () => {
    server.use(
      http.get("/api/v1/roles/roles", () =>
        ok({ items: roleOptions, total: roleOptions.length, page: 1, page_size: 100 }),
      ),
    )
    const user = userEvent.setup()
    const props = renderSection({ rolesFailed: true })

    await user.click(await screen.findByRole("button", { name: "重试" }))

    expect(props.onRetry).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run（工作目录 `app`）：`npx vitest run src/features/users/user-roles-section.test.tsx`

Expected: FAIL，`Failed to resolve import "./user-roles-section"`。

- [ ] **Step 3: 写最小实现**

创建 `app/src/features/users/user-roles-section.tsx`：

```tsx
import { useState } from "react"
import { toast } from "sonner"
import { QueryState } from "@/components/query-state"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { ROLE_OPTIONS_PAGE_SIZE } from "@/features/roles/types"
import { useAssignUserRoles, useRoleOptions } from "./queries"

type UserRolesSectionProps = {
  userId: number | null
  /** 服务端返回的当前角色，用于回显勾选态 */
  currentRoleIds: number[]
  rolesPending: boolean
  rolesFailed: boolean
  onRetry: () => void
}

/** 内联在用户详情里的角色勾选区，保存后整体替换该用户的角色。 */
export function UserRolesSection({
  userId,
  currentRoleIds,
  rolesPending,
  rolesFailed,
  onRetry,
}: UserRolesSectionProps) {
  // null 表示还没动过勾选，此时直接采用服务端的当前角色，避免多一次渲染才对齐
  const [selected, setSelected] = useState<number[] | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const rolesQuery = useRoleOptions()
  const assignMutation = useAssignUserRoles()

  const selectedIds = selected ?? currentRoleIds
  const options = rolesQuery.data?.items ?? []
  const truncated = rolesQuery.data?.truncated ?? false
  const loading = rolesPending || rolesQuery.isPending
  const failed = rolesFailed || rolesQuery.isError

  function toggle(roleId: number, checked: boolean) {
    setSelected(checked ? [...new Set([...selectedIds, roleId])] : selectedIds.filter((id) => id !== roleId))
  }

  function handleRetry() {
    onRetry()
    void rolesQuery.refetch()
  }

  function handleSave() {
    if (userId === null) return

    setFormError(null)
    assignMutation.mutate(
      { id: userId, roleIds: selectedIds },
      {
        // 保存成功后留在详情里，靠 users/roles/{id} 缓存失效刷新有效权限
        onSuccess: () => {
          toast.success("角色已更新")
        },
        onError: (error: unknown) => {
          setFormError(error instanceof Error ? error.message : "保存失败，请稍后重试。")
        },
      },
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">角色</h3>
      <p className="text-xs text-muted-foreground">保存后整体替换该用户的角色。</p>

      {loading ? (
        <QueryState status="loading" />
      ) : failed ? (
        <QueryState status="error" message="角色数据加载失败。" onRetry={handleRetry} />
      ) : truncated ? (
        <p role="alert" className="text-sm text-destructive">
          角色总数（{rolesQuery.data?.total ?? 0}）超过一次可加载的 {ROLE_OPTIONS_PAGE_SIZE} 条，请先在角色管理中精简后再分配。
        </p>
      ) : options.length === 0 ? (
        <QueryState status="empty" message="还没有可分配的角色。" />
      ) : (
        <ul className="flex flex-col gap-2">
          {options.map((role) => (
            <li key={role.id} className="flex items-center gap-2">
              <Checkbox
                id={`role-option-${role.id}`}
                checked={selectedIds.includes(role.id)}
                onCheckedChange={(checked) => toggle(role.id, checked === true)}
              />
              <Label htmlFor={`role-option-${role.id}`} className="flex-1">
                {role.name}
              </Label>
              <span className="text-xs text-muted-foreground">{role.code}</span>
            </li>
          ))}
        </ul>
      )}

      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <Button
        onClick={handleSave}
        disabled={assignMutation.isPending || loading || failed || truncated}
        className="self-start"
      >
        {assignMutation.isPending ? (
          <>
            <Spinner data-icon="inline-start" aria-hidden="true" />
            正在保存
          </>
        ) : (
          "保存"
        )}
      </Button>
    </section>
  )
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run：`npx vitest run src/features/users/user-roles-section.test.tsx`

Expected: PASS，3 个用例全绿。

- [ ] **Step 5: 提交**

```bash
git add app/src/features/users/user-roles-section.tsx app/src/features/users/user-roles-section.test.tsx
git commit -m "feat(users): 新增内联角色勾选区" -- app/src/features/users/user-roles-section.tsx app/src/features/users/user-roles-section.test.tsx
```

---

### Task 5: 组合层组装用户详情抽屉

**Files:**
- Modify: `app/src/features/users/user-detail-sheet.tsx`
- Modify: `app/src/test/handlers.ts`
- Test: `app/src/features/users/user-detail-sheet.test.tsx`

**Interfaces:**
- Consumes: `collectEffectivePermissions`（Task 1）、`UserPermissionsSection`（Task 3）、`UserRolesSection`（Task 4）、`useUserDetail` 与 `useUserRoles`（`./queries`）
- Produces: `UserDetailSheet`，props 保持 `{ userId: number | null; onOpenChange: (open: boolean) => void }`（对 `users-page.tsx` 的签名不变）

- [ ] **Step 1: 先给默认处理器补两个接口**

修改 `app/src/test/handlers.ts`，在 `http.get("/api/v1/users", ...)` 之后插入这两个处理器：

```ts
  // 后端该接口返回单元素数组，因此包一层数组
  http.get("/api/v1/users/:id/roles", ({ params }) =>
    ok([{ id: Number(params.id), username: "admin", email: "admin@example.com", is_active: true, roles: [] }]),
  ),
  http.get("/api/v1/users/:id", ({ params }) =>
    ok({ id: Number(params.id), username: "admin", email: "admin@example.com", is_active: true }),
  ),
```

`http.get("/api/v1/users/me", ...)` 已注册在这两行之前，MSW 按注册顺序取首个匹配，因此 `/me` 仍然命中原来那个处理器。

- [ ] **Step 2: 先写失败的测试**

创建 `app/src/features/users/user-detail-sheet.test.tsx`：

```tsx
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http } from "msw"
import { AppProviders } from "@/app/providers"
import { ok } from "@/test/handlers"
import { createTestQueryClient } from "@/test/render"
import { server } from "@/test/server"
import { UserDetailSheet } from "./user-detail-sheet"

const alice = { id: 1, username: "alice", email: "alice@example.com", is_active: true }

const roleOptions = [
  { id: 1, code: "admin", name: "管理员", description: null, permissions: [] },
  { id: 2, code: "editor", name: "编辑", description: null, permissions: [] },
]

const userListPermission = { id: 10, code: "user:list", name: "获取用户列表", description: null }
const userDeletePermission = { id: 20, code: "user:delete", name: "删除用户", description: null }

function renderSheet() {
  const queryClient = createTestQueryClient()
  render(
    <AppProviders queryClient={queryClient}>
      <UserDetailSheet userId={1} onOpenChange={() => {}} />
    </AppProviders>,
  )
}

describe("UserDetailSheet", () => {
  it("同时展示账号信息、角色勾选态与带来源的有效权限", async () => {
    server.use(
      http.get("/api/v1/users/:id", () => ok(alice)),
      http.get("/api/v1/users/:id/roles", () =>
        ok([
          {
            ...alice,
            roles: [
              {
                id: 1,
                code: "admin",
                name: "管理员",
                description: null,
                permissions: [userListPermission, userDeletePermission],
              },
              {
                id: 2,
                code: "editor",
                name: "编辑",
                description: null,
                permissions: [userListPermission],
              },
            ],
          },
        ]),
      ),
      http.get("/api/v1/roles/roles", () =>
        ok({ items: roleOptions, total: roleOptions.length, page: 1, page_size: 100 }),
      ),
    )

    renderSheet()

    // 账号信息
    expect(await screen.findByText("alice@example.com")).toBeInTheDocument()
    expect(screen.getByText("已启用")).toBeInTheDocument()
    // 角色勾选态
    expect(await screen.findByRole("checkbox", { name: "管理员" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "编辑" })).toBeChecked()
    // 有效权限去重并标注来源
    expect(screen.getByText("获取用户列表")).toBeInTheDocument()
    expect(screen.getByText("来源：管理员、编辑")).toBeInTheDocument()
    expect(screen.getByText("删除用户")).toBeInTheDocument()
    expect(screen.getByText("来源：管理员")).toBeInTheDocument()
  })

  it("可以在详情里改角色勾选", async () => {
    server.use(
      http.get("/api/v1/users/:id", () => ok(alice)),
      http.get("/api/v1/users/:id/roles", () =>
        ok([{ ...alice, roles: [{ id: 1, code: "admin", name: "管理员", description: null, permissions: [] }] }]),
      ),
      http.get("/api/v1/roles/roles", () =>
        ok({ items: roleOptions, total: roleOptions.length, page: 1, page_size: 100 }),
      ),
    )

    renderSheet()
    const user = userEvent.setup()

    const editor = await screen.findByRole("checkbox", { name: "编辑" })
    expect(editor).not.toBeChecked()

    await user.click(editor)

    expect(screen.getByRole("checkbox", { name: "编辑" })).toBeChecked()
  })

  it("用户没有角色时给出对应空态", async () => {
    server.use(
      http.get("/api/v1/users/:id", () => ok(alice)),
      http.get("/api/v1/users/:id/roles", () => ok([{ ...alice, roles: [] }])),
      http.get("/api/v1/roles/roles", () =>
        ok({ items: roleOptions, total: roleOptions.length, page: 1, page_size: 100 }),
      ),
    )

    renderSheet()

    expect(await screen.findByText("该用户没有任何角色，因此没有权限。")).toBeInTheDocument()
  })

  it("角色存在但都没配权限时给出另一种空态", async () => {
    server.use(
      http.get("/api/v1/users/:id", () => ok(alice)),
      http.get("/api/v1/users/:id/roles", () =>
        ok([{ ...alice, roles: [{ id: 1, code: "admin", name: "管理员", description: null, permissions: [] }] }]),
      ),
      http.get("/api/v1/roles/roles", () =>
        ok({ items: roleOptions, total: roleOptions.length, page: 1, page_size: 100 }),
      ),
    )

    renderSheet()

    expect(await screen.findByText("已分配的角色都没有配置权限。")).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: 运行测试，确认失败**

Run（工作目录 `app`）：`npx vitest run src/features/users/user-detail-sheet.test.tsx`

Expected: FAIL。当前 `UserDetailSheet` 只有账号信息，`findByRole("checkbox", { name: "管理员" })` 超时。

- [ ] **Step 4: 改写详情抽屉**

把 `app/src/features/users/user-detail-sheet.tsx` 整体替换为：

```tsx
import { QueryState } from "@/components/query-state"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { collectEffectivePermissions } from "./effective-permissions"
import { UserPermissionsSection } from "./user-permissions-section"
import { UserRolesSection } from "./user-roles-section"
import { useUserDetail, useUserRoles } from "./queries"

type UserDetailSheetProps = {
  userId: number | null
  onOpenChange: (open: boolean) => void
}

/** 用户域的唯一入口：账号信息、可编辑的角色、由角色决定的有效权限。 */
export function UserDetailSheet({ userId, onOpenChange }: UserDetailSheetProps) {
  const detailQuery = useUserDetail(userId)
  // 角色查询在这里发出一次，同时喂给角色区与权限区，避免重复请求
  const rolesQuery = useUserRoles(userId)
  const user = detailQuery.data
  const roles = rolesQuery.data?.roles ?? []
  const effectivePermissions = collectEffectivePermissions(roles)

  return (
    <Sheet open={userId !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>用户详情</SheetTitle>
          <SheetDescription>账号基础信息、角色与由角色决定的有效权限。</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4">
          {detailQuery.isPending ? (
            <QueryState status="loading" />
          ) : detailQuery.isError ? (
            <QueryState
              status="error"
              message={detailQuery.error instanceof Error ? detailQuery.error.message : undefined}
              onRetry={() => void detailQuery.refetch()}
            />
          ) : user ? (
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">账号信息</h3>
              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">用户名</dt>
                  <dd className="font-medium">{user.username}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">邮箱</dt>
                  <dd className="font-medium">{user.email}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">状态</dt>
                  <dd>
                    <Badge variant={user.is_active ? "secondary" : "outline"}>
                      {user.is_active ? "已启用" : "已禁用"}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </section>
          ) : (
            <QueryState status="empty" message="没有查询到该用户。" />
          )}

          <UserRolesSection
            userId={userId}
            currentRoleIds={roles.map((role) => role.id)}
            rolesPending={rolesQuery.isPending}
            rolesFailed={rolesQuery.isError}
            onRetry={() => void rolesQuery.refetch()}
          />

          <UserPermissionsSection
            permissions={effectivePermissions}
            hasRoles={roles.length > 0}
            pending={rolesQuery.isPending}
            failed={rolesQuery.isError}
            onRetry={() => void rolesQuery.refetch()}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 5: 运行新测试与全量测试**

Run：`npx vitest run src/features/users/user-detail-sheet.test.tsx`
Expected: PASS，4 个用例全绿。

Run：`npm test`
Expected: PASS 全量绿。此时 `users-page.tsx` 仍输出「分配角色」按钮，其页面测试依赖 Step 1 补的默认处理器，不应再因未处理请求报错。

- [ ] **Step 6: 提交**

```bash
git add app/src/features/users/user-detail-sheet.tsx app/src/features/users/user-detail-sheet.test.tsx app/src/test/handlers.ts
git commit -m "feat(users): 用户详情内联角色与有效权限" -- app/src/features/users/user-detail-sheet.tsx app/src/features/users/user-detail-sheet.test.tsx app/src/test/handlers.ts
```

---

### Task 6: 移除旧入口并改造页面测试

**Files:**
- Modify: `app/src/features/users/users-page.tsx`
- Modify: `app/src/features/users/user-create-sheet.tsx`
- Modify: `app/src/features/users/users-page.test.tsx`
- Delete: `app/src/features/users/user-role-sheet.tsx`

**Interfaces:**
- Consumes: `UserDetailSheet`（Task 5，签名未变）
- Produces: 无下游依赖；用户域入口收敛为「详情」

- [ ] **Step 1: 改造 users-page.tsx**

在 `app/src/features/users/users-page.tsx` 做四处改动：

1) 删除第 15 行的 import：

```tsx
import { UserRoleSheet } from "./user-role-sheet"
```

2) 删除 state（原第 25 行）：

```tsx
  const [roleUserId, setRoleUserId] = useState<number | null>(null)
```

3) 操作列只留「详情」，把 `cell` 里的按钮组替换为：

```tsx
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => setDetailUserId(row.original.id)}>
              详情
            </Button>
          </div>
        ),
```

4) 删除文件末尾的 `<UserRoleSheet ... />` 整块，保留 `UserDetailSheet`（含其 `key` 重挂载）：

```tsx
      <UserDetailSheet
        key={`user-detail-${detailUserId ?? "none"}`}
        userId={detailUserId}
        onOpenChange={(open) => {
          if (!open) setDetailUserId(null)
        }}
      />
```

- [ ] **Step 2: 更新创建用户抽屉的引导文案**

把 `app/src/features/users/user-create-sheet.tsx` 第 61 行改为：

```tsx
          <SheetDescription>创建后可在用户详情里为该用户分配角色。</SheetDescription>
```

- [ ] **Step 3: 删除旧抽屉**

```bash
git rm app/src/features/users/user-role-sheet.tsx
```

- [ ] **Step 4: 改造页面测试**

在 `app/src/features/users/users-page.test.tsx` 里：

1) 把 `it("loads the selected user's roles and submits a raw role id array", ...)` 整个用例替换为：

```tsx
  it("submits a raw role id array from the user detail sheet", async () => {
    const puts: { url: URL; body: unknown }[] = []
    server.use(
      http.get("/api/v1/users", () => ok({ items: users, total: 2, page: 1, page_size: 10 })),
      http.get("/api/v1/users/:id", () => ok(users[0])),
      http.get("/api/v1/users/:id/roles", ({ params }) =>
        ok([
          {
            ...users[0],
            id: Number(params.id),
            roles: [{ id: 1, code: "admin", name: "管理员", description: null, permissions: [] }],
          },
        ]),
      ),
      http.get("/api/v1/roles/roles", () =>
        ok({ items: roleOptions, total: roleOptions.length, page: 1, page_size: 100 }),
      ),
      http.put("/api/v1/users/:id/roles", async ({ request }) => {
        puts.push({ url: new URL(request.url), body: await request.json() })
        return ok(users[0])
      }),
    )

    renderUsers()
    const user = userEvent.setup()
    await screen.findByText("alice")

    await user.click(screen.getAllByRole("button", { name: "详情" })[0])

    expect(await screen.findByRole("checkbox", { name: "管理员" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "编辑" })).not.toBeChecked()

    await user.click(screen.getByRole("checkbox", { name: "只读" }))
    await user.click(screen.getByRole("button", { name: "保存" }))

    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0].url.pathname).toBe("/api/v1/users/1/roles")
    expect(puts[0].body).toEqual([1, 3])
  })
```

2) 把 `it("blocks role assignment when the role list is truncated", ...)` 整个用例替换为：

```tsx
  it("blocks role assignment when the role list is truncated", async () => {
    server.use(
      http.get("/api/v1/users", () => ok({ items: users, total: 2, page: 1, page_size: 10 })),
      http.get("/api/v1/users/:id", () => ok(users[0])),
      http.get("/api/v1/users/:id/roles", () => ok([{ ...users[0], roles: [] }])),
      http.get("/api/v1/roles/roles", () =>
        ok({ items: roleOptions, total: 120, page: 1, page_size: 100 }),
      ),
    )

    renderUsers()
    const user = userEvent.setup()
    await screen.findByText("alice")

    await user.click(screen.getAllByRole("button", { name: "详情" })[0])

    expect(await screen.findByRole("alert")).toHaveTextContent("超过一次可加载的 100 条")
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled()
  })
```

3) 新增一个断言：行末不再有「分配角色」入口。追加用例：

```tsx
  it("keeps 详情 as the only row action", async () => {
    server.use(
      http.get("/api/v1/users", () => ok({ items: users, total: 2, page: 1, page_size: 10 })),
    )

    renderUsers()
    await screen.findByText("alice")

    expect(screen.queryByRole("button", { name: "分配角色" })).not.toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "详情" })).toHaveLength(2)
  })
```

4) 确认 `it("shows the user detail sheet with the selected account", ...)` 保持原样即可通过（Task 5 Step 1 已补默认处理器）。

- [ ] **Step 5: 运行测试，确认通过**

Run（工作目录 `app`）：`npx vitest run src/features/users/users-page.test.tsx`
Expected: PASS，全部用例绿。

Run：`npm test`
Expected: PASS 全量绿。

- [ ] **Step 6: 提交**

```bash
git add app/src/features/users/users-page.tsx app/src/features/users/user-create-sheet.tsx app/src/features/users/users-page.test.tsx
git commit -m "feat(users): 用户域收敛为详情单入口" -- app/src/features/users/users-page.tsx app/src/features/users/user-create-sheet.tsx app/src/features/users/users-page.test.tsx app/src/features/users/user-role-sheet.tsx
```

---

### Task 7: 文档更新与真实后端冒烟

**Files:**
- Modify: `app/README.md`

**Interfaces:**
- Consumes: 前六个任务的成果
- Produces: 无

- [ ] **Step 1: 在契约表里补一行**

在 `app/README.md` 的「与后端的接口契约」表格中，紧跟 `GET /api/v1/users/{id}/roles` 返回单元素数组那一行之后插入：

```markdown
| `GET /api/v1/users/{id}/roles` 返回的每个角色带 `permissions` | 用户详情用它去重聚合「有效权限」，并标注每项权限来自哪个角色 |
```

- [ ] **Step 2: 更新目录说明**

把 `app/README.md` 中「每个业务域内部固定四件套：`types.ts`、`api.ts`、`queries.ts`、页面与表单组件。页面只消费 `queries.ts`，不直接调用 `api.ts`。」这一段替换为：

```markdown
每个业务域内部固定四件套：`types.ts`、`api.ts`、`queries.ts`、页面与表单组件。页面只消费 `queries.ts`，不直接调用 `api.ts`。用户域的角色管理与有效权限只读展示都内联在「用户详情」抽屉里，操作列不再单设「分配角色」入口；权限由角色决定，详情内不提供单独的授权动作。
```

- [ ] **Step 3: 跑完整验证**

Run（工作目录 `app`）：`npm test`
Expected: PASS 全量绿。

Run（工作目录 `app`）：`npm run lint`
Expected: 0 error（允许出现 README 已记录的 3 条 `react-hooks/incompatible-library` 提示，来自 TanStack Table）。

Run（工作目录 `app`）：`npm run build`
Expected: `tsc -b` 无类型错误，`vite build` 产出 `app/dist/`。

- [ ] **Step 4: 真实后端冒烟**

前置：后端已在 `127.0.0.1:8000` 运行，前端 dev server 已在 `localhost:5173` 运行。先记录目标用户（zhangsan，id=2）的原始角色，确认是空数组：

```powershell
(Invoke-RestMethod "http://127.0.0.1:8000/api/v1/users/2/roles" -TimeoutSec 15).data[0].roles.Count
```
Expected: `0`

写冒烟脚本到 `C:\Users\cb_lo\AppData\Local\Temp\cg-smoke-inline.py`：

```python
import io
from playwright.sync_api import sync_playwright

OUT = r"C:\Users\cb_lo\AppData\Local\Temp\cg-smoke-inline.txt"
BUF = io.StringIO()
def log(*a): print(*a, file=BUF)

INIT = "localStorage.setItem('chenguang.auth.v1', JSON.stringify({version:1, token:'smoke-token'}))"
CHROME = r"C:\Users\cb_lo\AppData\Local\ms-playwright\chromium-1208\chrome-win64\chrome.exe"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=CHROME)
    ctx = browser.new_context(viewport={"width": 1440, "height": 950})
    ctx.add_init_script(INIT)
    page = ctx.new_page()
    calls = []
    page.on("response", lambda r: calls.append(f"{r.request.method} {r.url.split('5173')[-1]} -> {r.status}") if "/api/" in r.url else None)

    page.goto("http://localhost:5173/users", wait_until="networkidle", timeout=20000)
    page.wait_for_timeout(1200)

    row = page.locator("tbody tr").nth(1)   # 第二行 = zhangsan(id=2)
    log("目标行:", row.inner_text().replace("\n", " | "))
    log("该行按钮:", row.locator("button").all_inner_texts())

    row.get_by_role("button", name="详情").click()
    page.wait_for_timeout(1500)

    dialog = page.locator("[role=dialog]")
    log("---- 详情抽屉初始内容 ----")
    log(dialog.first.inner_text())
    page.screenshot(path=r"C:\Users\cb_lo\AppData\Local\Temp\cg-detail-initial.png", full_page=True)

    calls.clear()
    dialog.get_by_role("checkbox", name="管理员").click()
    page.wait_for_timeout(300)
    dialog.get_by_role("button", name="保存").click()
    page.wait_for_timeout(2500)

    log("---- 保存时的请求 ----")
    for c in calls: log(c)
    log("提示:", page.locator("[data-sonner-toast]").all_inner_texts())
    log("抽屉是否仍打开:", page.locator("[role=dialog]").count() > 0)
    log("---- 保存后详情抽屉内容 ----")
    log(page.locator("[role=dialog]").first.inner_text())
    page.screenshot(path=r"C:\Users\cb_lo\AppData\Local\Temp\cg-detail-after-save.png", full_page=True)

    browser.close()

with open(OUT, "w", encoding="utf-8") as f: f.write(BUF.getvalue())
print("done")
```

运行：

```powershell
$env:PYTHONIOENCODING="utf-8"
& "D:\software\tool\conda\envs\intranet-mailer-py313\python.exe" "C:\Users\cb_lo\AppData\Local\Temp\cg-smoke-inline.py"
Get-Content "C:\Users\cb_lo\AppData\Local\Temp\cg-smoke-inline.txt" -Encoding UTF8
```

Expected:
- `该行按钮` 只有 `详情`，不再有 `分配角色`；
- 保存时出现 `PUT /api/v1/users/2/roles -> 200`，抽屉仍打开；
- 保存后的抽屉内容里出现 `有效权限`、`获取用户列表`、`删除用户` 与 `来源：管理员`；
- 截图 `cg-detail-after-save.png` 上权限区已刷新。

若 `有效权限` 区块为空，说明后端 `/users/{id}/roles` 没有返回 `permissions`，需回到 `features/users/types.ts` 与 `effective-permissions.ts` 检查字段名。

- [ ] **Step 5: 还原测试数据**

```powershell
$h = @{ 'Content-Type' = 'application/json' }
$r = Invoke-RestMethod "http://127.0.0.1:8000/api/v1/users/2/roles" -Method Put -Body '[]' -Headers $h -TimeoutSec 15
"还原 -> code=$($r.code)"
((Invoke-RestMethod "http://127.0.0.1:8000/api/v1/users/2/roles" -TimeoutSec 15).data[0].roles.Count)
```
Expected: `还原 -> code=200`，随后角色数为 `0`。

- [ ] **Step 6: 提交**

```bash
git add app/README.md
git commit -m "docs(frontend): 补充用户详情内联角色与权限说明" -- app/README.md
```

---

## 自审记录

**Spec 覆盖核对**

| Spec 章节 | 落地任务 |
| --- | --- |
| 4 组件与职责（6 个文件） | Task 1、3、4、5、6 |
| 5 数据流（详情 + 角色 + 选项三个查询，PUT 裸数组，失效两个缓存键） | Task 4、5 |
| 6 交互与状态（loading/error/retry 合并、100 条守卫、两种权限空态、保存不关闭、行内错误、切换用户重挂载） | Task 4（loading/error/retry/守卫/不关闭/行内错误）、Task 5（`key` 重挂载沿用）、Task 3（两种空态） |
| 7 类型与契约（`EffectivePermission`、`UserWithRolesRead.roles: RoleRead[]`、`permissions` 可选按空数组处理） | Task 1、2 |
| 8 测试与验收 | Task 1、3、4、5、6 的用例 + Task 7 的 `npm test` / `lint` / `build` / 真实后端冒烟 |
| 9 影响文件清单 | 全部任务的文件列表一致；`queries.ts` 与 `api.ts` 未改动，符合 spec |
| 10 范围外 | 计划未涉及 `CLAUDE.md`、后端鉴权、`user_permissions` |

**类型一致性核对**：`EffectivePermission` 与 `EffectivePermissionSource` 在 Task 1 定义，Task 3 复用；`UserRolesSection` 的 props 在 Task 4 定义，Task 5 按同一组名字传参（`userId` / `currentRoleIds` / `rolesPending` / `rolesFailed` / `onRetry`）；`UserPermissionsSection` 的 props 在 Task 3 定义，Task 5 按 `permissions` / `hasRoles` / `pending` / `failed` / `onRetry` 传参，两边一致。

**占位符扫描**：无 TBD、TODO 或"稍后补充"；每个改代码的步骤都给出了完整代码与确切命令。
