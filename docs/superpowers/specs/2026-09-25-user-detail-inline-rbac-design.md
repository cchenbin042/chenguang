# 用户详情内联角色与权限设计

## 1. 目标

用户反馈在管理前端登录后找不到「给用户绑定角色和授权」的入口。实测确认该能力已存在（用户页行末「分配角色」+ 角色页「权限」），真正的可用性缺口在于：**用户「详情」抽屉只显示用户名、邮箱和状态，既不展示也不管理该用户的角色与权限**。

本次改动把角色管理和有效权限展示内联进「用户详情」抽屉，使「打开某个用户，看清他有什么角色和权限，并当场调整」成为一条完整路径。

## 2. 背景与现状

| 事实 | 来源 |
| --- | --- |
| 用户页每行操作列为「详情」「分配角色」 | `app/src/features/users/users-page.tsx` |
| 「分配角色」抽屉已实现勾选、保存、100 条上限守卫、loading/error/empty | `app/src/features/users/user-role-sheet.tsx` |
| 「用户详情」抽屉只渲染 `username` / `email` / `is_active` | `app/src/features/users/user-detail-sheet.tsx` |
| `GET /api/v1/users/{id}/roles` 返回单元素数组，每个角色已含 `permissions` | 后端 `UserWithRolesRead.roles: list[RoleRead]`，`RoleRead.permissions` 默认 `[]`，已在运行实例上实测 |
| 前端 `UserRoleRead` 未声明 `permissions`，运行时字段被类型丢弃 | `app/src/features/users/types.ts` |
| 保存语义是整体替换，请求体为裸角色 ID 数组 | `PUT /api/v1/users/{user_id}/roles` |
| 勾选项一次最多加载 100 条角色 | `ROLE_OPTIONS_PAGE_SIZE`，`app/src/features/roles/types.ts` |

后端已具备本次改动所需的全部接口，**不需要新增表、接口或迁移**。

## 3. 方案

### 3.1 选定方案

**方案 A：全部内联进详情，移除行末「分配角色」。**

- 操作列只保留「详情」，成为用户域的唯一入口；
- 详情抽屉承载三块内容：账号信息、可编辑的角色勾选、只读的有效权限；
- 删除 `user-role-sheet.tsx`，其逻辑迁移进详情抽屉的角色区。

选择理由：改动集中在用户域内部，复用既有交互与守卫逻辑，不新增后端依赖；单一入口直接消除本次反馈的「找不到功能」问题。

### 3.2 被否方案

- **方案 B：内联进详情，同时保留行末「分配角色」快捷按钮。** 两个入口指向同一界面，测试需覆盖两条路径，冗余。
- **方案 C：详情只只读展示，改角色仍用原抽屉。** 只补信息不解决「在详情里直接管理」，未满足诉求。

### 3.3 明确不做

- 不新增用户与权限的直接关联。权限仍由角色决定，用户域只做聚合展示。
- 不在详情抽屉内编辑角色自身的权限。该操作仍属角色页「权限」抽屉，本次不提供跳转。

## 4. 组件与职责

| 文件 | 类型 | 职责 |
| --- | --- | --- |
| `app/src/features/users/effective-permissions.ts` | 新增 | 纯函数 `collectEffectivePermissions(roles: RoleRead[]): EffectivePermission[]`。按 `permission.id` 去重，保留首次出现顺序，聚合 `sources`（授予该权限的角色 `{ id, name }`，按角色在入参中的顺序）。无 React 依赖。 |
| `app/src/features/users/user-roles-section.tsx` | 新增 | 内联角色勾选区。持有 `useRoleOptions()` 与 `useAssignUserRoles()`；入参 `userId`、`currentRoleIds`、`rolesPending`、`rolesFailed`、`onRetry`。承载勾选、保存、100 条上限守卫与 loading/error/empty。 |
| `app/src/features/users/user-permissions-section.tsx` | 新增 | 只读有效权限展示。入参 `permissions: EffectivePermission[]`、`pending`、`failed`。不发起请求。 |
| `app/src/features/users/user-detail-sheet.tsx` | 修改 | 组合层。持有 `useUserDetail(id)` 与 `useUserRoles(id)`，把角色数据同时喂给两个子区，避免重复请求。 |
| `app/src/features/users/user-role-sheet.tsx` | 删除 | 职责并入详情抽屉。 |
| `app/src/features/users/users-page.tsx` | 修改 | 操作列删除「分配角色」按钮，删除 `roleUserId` state 与 `<UserRoleSheet>` 渲染。 |
| `app/src/features/users/types.ts` | 修改 | 删除与 `roles/types.ts` 重复且缺 `permissions` 的 `UserRoleRead`，改为 `UserWithRolesRead.roles: RoleRead[]`。 |

依赖方向：`user-detail-sheet` → `user-roles-section` / `user-permissions-section` → `effective-permissions`。子区不反向依赖父区，聚合函数不依赖任何组件。

## 5. 数据流

```text
打开详情
  GET /api/v1/users/{id}                      → 账号信息
  GET /api/v1/users/{id}/roles                → 当前角色（含每个角色的 permissions）
                                              → collectEffectivePermissions() → 有效权限
  GET /api/v1/roles/roles?page=1&page_size=100 → 角色勾选项

保存
  PUT /api/v1/users/{id}/roles  裸数组 [1,3]
  成功 → invalidate ["users","roles",id] 与 ["users","list"]
       → 角色与有效权限自动刷新
```

`userId` 为 `null` 时三个查询都不启用（沿用 `enabled: id !== null`）。

## 6. 交互与状态

- **加载中**：详情与角色数据任一未就绪时，抽屉内显示 `QueryState status="loading"`。
- **失败**：显示 `QueryState status="error"`。角色区的 `failed` 取 `rolesFailed || useRoleOptions().isError`，重试同时重取用户角色与角色选项；权限区沿用 `useUserRoles` 的 `pending` / `failed`。
- **切换用户**：`users-page.tsx` 保留现有 `key={`user-detail-${detailUserId ?? "none"}`}` 的重挂载方式，确保本地勾选状态不会串到另一个用户。
- **角色总数超过 100**：显示 `role="alert"` 文案「角色总数（N）超过一次可加载的 100 条，请先在角色管理中精简后再分配。」并禁用保存；不静默遗漏。
- **没有可分配角色**：空态「还没有可分配的角色。」
- **有效权限渲染**：每行显示权限名称，右侧以弱化样式显示 `code`，下方一行「来源：管理员、开发」（角色名以顿号连接）。不引入新的颜色、图标或组件。
- **有效权限为空**，按原因分两种文案：
  - 未分配任何角色：「该用户没有任何角色，因此没有权限。」
  - 有角色但都没配权限：「已分配的角色都没有配置权限。」
- **保存成功**：toast「角色已更新」；**抽屉保持打开**，权限区随缓存失效刷新。
  - 这是相对旧抽屉的行为变化：旧实现在成功后调用 `onOpenChange(false)` 关闭抽屉，本设计改为留在详情里，使「改完立刻看到有效权限」成立。
- **保存失败**：抽屉内行内 `role="alert"` 显示错误信息，抽屉不关闭。
- **保存按钮**：沿用旧实现，除 pending / loading / failed / truncated 外始终可用。

## 7. 类型与契约

```ts
// effective-permissions.ts
export interface EffectivePermission {
  id: number
  code: string
  name: string
  description: string | null
  sources: { id: number; name: string }[]
}
```

```ts
// types.ts，改为复用 roles 域的类型
import type { RoleRead } from "@/features/roles/types"

export interface UserWithRolesRead extends UserRead {
  roles: RoleRead[]
}
```

`RoleRead.permissions?: RolePermissionRead[]` 保持可选，因为角色列表接口的 `response_model` 会裁掉该字段；只有 `/users/{id}/roles` 与角色详情会返回它。聚合函数对 `undefined` 按空数组处理。

## 8. 测试策略与验收标准

### 8.1 新增单元测试

`app/src/features/users/effective-permissions.test.ts`：

- 同一权限被多个角色授予时只出现一次，`sources` 按角色入参顺序聚合；
- 多个角色的权限按首次出现顺序合并；
- `roles` 为空数组时返回空数组；
- 角色的 `permissions` 为 `undefined` 时不抛错。

### 8.2 页面测试改造

`app/src/features/users/users-page.test.tsx`：

- 原「分配角色」用例改为先点击「详情」再操作，仍断言 `PUT /api/v1/users/1/roles` 的请求体是裸数组 `[1, 3]`；
- 新增：详情抽屉内同时可见账号信息、已分配角色处于勾选态、有效权限列出且标注来源角色；
- 新增：两种有效权限空态文案；
- 保留：角色总数超过 100 时提示并禁用保存。

MSW 处理器需要为 `/api/v1/users/:id/roles` 提供带 `permissions` 的角色数据。

### 8.3 验收标准

| 项 | 通过标准 |
| --- | --- |
| `cd app; npm test` | 全部用例通过，无未处理请求报错 |
| `cd app; npm run lint` | 0 error |
| `cd app; npm run build` | 类型检查与构建成功 |
| 真实后端冒烟 | Playwright 打开详情 → 勾选角色 → 保存 → `PUT` 返回 200 → 权限区出现该角色带来的权限；测试数据在验证后还原 |

冒烟必须操作真实后端一次，因为本次改动依赖 `/users/{id}/roles` 真实返回的 `permissions` 字段。

## 9. 影响文件清单

```text
app/src/features/users/
├─ effective-permissions.ts           新增
├─ effective-permissions.test.ts      新增
├─ user-roles-section.tsx             新增
├─ user-permissions-section.tsx       新增
├─ user-detail-sheet.tsx              修改
├─ users-page.tsx                     修改
├─ users-page.test.tsx                修改
├─ types.ts                           修改
└─ user-role-sheet.tsx                删除
app/README.md                         修改（目录结构与交互说明）
```

`features/users/queries.ts` 与 `features/users/api.ts` 无需改动，现有 `useUserDetail`、`useUserRoles`、`useRoleOptions`、`useAssignUserRoles` 已覆盖全部数据需求。

## 10. 范围外

- 修复根 `CLAUDE.md` 的过期描述（称 role / permission 只有 `model.py`、auth 为孤儿、`core/deps.py` 已删除），单独处理。
- 后端 RBAC 的管理接口鉴权与权限码校验，属后端里程碑。
- 用户与权限的直接关联（`user_permissions`）。
