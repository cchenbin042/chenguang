# 辰光 Agent 平台管理前端 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `app/` 中交付 React + Vite + TypeScript + shadcn/ui 管理后台，覆盖当前 OpenAPI 的登录、概览、用户、角色和权限功能。

**Architecture:** React Router 管理页面，TanStack Query 管理服务端状态，React Hook Form + Zod 管理表单。统一 API 客户端处理 Bearer Token、统一响应、业务错误和 FastAPI 422 错误；各业务域独立维护类型、API、Query Hook、页面和测试。

**Tech Stack:** React、Vite、TypeScript、shadcn/ui、Tailwind CSS、React Router、TanStack Query、TanStack Table、React Hook Form、Zod、Phosphor Icons、Vitest、React Testing Library、MSW。

## Global Constraints

- 所有前端代码必须位于 `app/`。
- 只实现 `swagger-openapi.json` 已有接口，不创建 Agent、模型、知识库或工作流页面。
- 以桌面 B/S 场景为主，窄屏保证基础操作。
- 视觉克制、紧凑、信息优先：无渐变光晕、玻璃拟态、装饰插画、虚假图表和巨型数字。
- 使用 `design-taste-frontend` 的反模板化规则与 Pre-Flight Check；该技能不负责后台数据模式，表格由 TanStack Table 实现。
- Design Read 固定为：面向内部运营人员的 B/S 管理产品，严肃、克制、高信息密度，采用定制 shadcn/ui、深灰中性色和单一琥珀强调色。
- 设计参数固定为 `DESIGN_VARIANCE: 4`、`MOTION_INTENSITY: 2`、`VISUAL_DENSITY: 7`。
- 固定浅色主题；只使用 Phosphor 图标；用户可见文案不得包含 em dash 或 en dash。
- 普通内容圆角 6–8px，无悬浮阴影；暖金色只用于主操作、焦点和当前导航。
- 角色 CRUD 使用 `/api/v1/roles/roles`，权限分配使用 `/api/v1/roles/{role_id}/permissions`。
- 用户角色分配请求体是裸 ID 数组；角色权限分配请求体是 `{ "permission_ids": number[] }`。
- 业务失败可能使用 HTTP 200，客户端必须检查响应体 `code`。
- 每项功能先写测试并确认失败，再实现最小代码并运行相关测试。
- 不修改后端代码及用户当前未提交的后端改动。

## File Map

- `app/src/app/*`：Provider、路由和应用入口。
- `app/src/lib/*`：API 客户端、令牌存储、QueryClient 和通用类型。
- `app/src/components/layout/*`：AppShell 和受保护路由。
- `app/src/components/*`：页面标题、工具栏、分页、查询状态和确认弹窗。
- `app/src/components/ui/*`：由 shadcn CLI 生成并检查的官方组件。
- `app/src/features/auth/*`：验证码、登录和当前用户。
- `app/src/features/overview/*`：健康状态与真实统计。
- `app/src/features/users/*`：用户列表、创建、详情和角色分配。
- `app/src/features/roles/*`：角色 CRUD、详情和权限分配。
- `app/src/features/permissions/*`：权限 CRUD 和详情。
- `app/src/test/*`：MSW、测试 Provider 和全局设置。

---

### Task 1: 初始化 Vite、shadcn/ui 和测试基线

**Files:**
- Create: `app/package.json`
- Create: `app/index.html`
- Create: `app/tsconfig.json`
- Create: `app/tsconfig.app.json`
- Create: `app/tsconfig.node.json`
- Create: `app/vite.config.ts`
- Create: `app/src/main.tsx`
- Create: `app/src/app/providers.tsx`
- Create: `app/src/index.css`
- Create: `app/src/test/setup.ts`
- Create: `app/src/test/render.tsx`
- Create: `app/src/app/providers.test.tsx`
- Regenerate: `app/package-lock.json`
- Generate: `app/components.json`
- Generate: `app/src/components/ui/*`

**Interfaces:**
- Produces: `AppProviders({ children })`；`@/*` 指向 `app/src/*`。
- Consumes: 无。

- [ ] **Step 1: 创建工程配置**

`package.json` 定义 `dev`、`build`、`lint`、`test`、`test:watch`。`vite.config.ts` 的关键配置：

```ts
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
})
```

- [ ] **Step 2: 安装依赖**

```powershell
cd app
npm install react react-dom react-router-dom @tanstack/react-query @tanstack/react-table react-hook-form @hookform/resolvers zod @phosphor-icons/react
npm install -D typescript vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw eslint typescript-eslint @eslint/js eslint-plugin-react-hooks eslint-plugin-react-refresh @types/react @types/react-dom @types/node
```

Expected: `package-lock.json` 重新生成，命令退出码为 0。

- [ ] **Step 3: 初始化并检查官方 shadcn/ui**

```powershell
npx shadcn@latest init --preset radix-nova
npx shadcn@latest docs button field input table sheet dialog alert-dialog badge skeleton empty pagination dropdown-menu sidebar sonner tooltip checkbox textarea separator spinner
npx shadcn@latest add button field input table sheet dialog alert-dialog badge skeleton empty pagination dropdown-menu sidebar sonner tooltip checkbox textarea separator spinner
npx shadcn@latest info
```

Expected: `components.json` 存在；组件位于 `info` 返回的 `resolvedPaths.ui`。逐个检查生成文件的 Title、Group、图标库和别名。业务组件只使用 Phosphor；若生成组件引用其他图标库，按 shadcn 组件契约替换为 Phosphor，确保全项目只有一个图标家族。

- [ ] **Step 4: 写 Provider 失败测试**

```tsx
describe("AppProviders", () => {
  it("renders application children", () => {
    render(<p>辰光管理后台</p>)
    expect(screen.getByText("辰光管理后台")).toBeInTheDocument()
  })
})
```

Run: `npm test -- src/app/providers.test.tsx`
Expected: FAIL，因为测试渲染器和 Provider 尚未实现。

- [ ] **Step 5: 实现最小 Provider 和入口**

`AppProviders` 组合 `QueryClientProvider`、`TooltipProvider` 和 `Toaster`。测试每次创建独立 QueryClient：

```ts
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}
```

临时路由仅渲染“辰光管理后台”，后续 Task 3 替换。

- [ ] **Step 6: 验证并提交**

```powershell
npm test -- src/app/providers.test.tsx
npm run build
git add app
git commit -m "feat(frontend): 初始化 React 管理后台"
```

Expected: 测试和构建通过。

---

### Task 2: 实现类型化 API 客户端和令牌存储

**Files:**
- Create: `app/src/lib/api-types.ts`
- Create: `app/src/lib/api-client.ts`
- Create: `app/src/lib/auth-storage.ts`
- Create: `app/src/lib/api-client.test.ts`
- Create: `app/src/lib/auth-storage.test.ts`

**Interfaces:**
- Produces: `apiRequest<T>(path, options?): Promise<T>`；`ApiError`；`authStorage.getToken/setToken/clear`。
- Consumes: `fetch`、`localStorage`、`VITE_API_BASE_URL`。

- [ ] **Step 1: 写令牌存储失败测试**

```ts
it("round-trips a versioned token", () => {
  authStorage.setToken("jwt-token")
  expect(authStorage.getToken()).toBe("jwt-token")
  authStorage.clear()
  expect(authStorage.getToken()).toBeNull()
})
```

Run: `npm test -- src/lib/auth-storage.test.ts`
Expected: FAIL，因为模块不存在。

- [ ] **Step 2: 实现令牌存储并转绿**

键固定为 `chenguang.auth.v1`，值为 `{"version":1,"token":"..."}`。解析异常或版本不匹配时删除旧值并返回 `null`。

Run: `npm test -- src/lib/auth-storage.test.ts`
Expected: PASS。

- [ ] **Step 3: 写 API 客户端失败测试**

```ts
it("returns data for code 200")
it("throws ApiError for HTTP 200 business failure")
it("formats FastAPI 422 details")
it("adds bearer token when available")
it("does not send content-type for a GET without body")
```

用 `vi.stubGlobal("fetch", vi.fn())` 返回明确的 `Response`。业务失败样例：

```ts
new Response(JSON.stringify({ code: 1001, message: "验证码已过期", data: null }), {
  status: 200,
  headers: { "Content-Type": "application/json" },
})
```

Run: `npm test -- src/lib/api-client.test.ts`
Expected: FAIL。

- [ ] **Step 4: 实现统一类型和请求函数**

```ts
export interface ApiResponse<T> { code: number; message: string; data: T | null }
export interface PageResult<T> { items: T[]; total: number; page: number; page_size: number }
export interface ValidationIssue { loc: Array<string | number>; msg: string; type: string }
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly status: number,
    public readonly issues: ValidationIssue[] = [],
  ) { super(message) }
}
```

`apiRequest<T>` 拼接 Base URL、附加 Token、解析 JSON；HTTP 非 2xx、422 或 `code !== 200` 时抛 `ApiError`。不得记录令牌、密码或完整响应。

- [ ] **Step 5: 验证并提交**

```powershell
npm test -- src/lib
git add app/src/lib
git commit -m "feat(frontend): 添加统一 API 客户端"
```

Expected: 全部 PASS。

---

### Task 3: 实现路由保护和管理后台框架

**Files:**
- Create: `app/src/app/router.tsx`
- Create: `app/src/components/layout/protected-route.tsx`
- Create: `app/src/components/layout/app-shell.tsx`
- Create: `app/src/components/layout/protected-route.test.tsx`
- Create: `app/src/components/page-header.tsx`
- Create: `app/src/components/data-toolbar.tsx`
- Create: `app/src/components/data-pagination.tsx`
- Create: `app/src/components/query-state.tsx`
- Create: `app/src/components/confirm-delete-dialog.tsx`
- Modify: `app/src/main.tsx`
- Modify: `app/src/index.css`

**Interfaces:**
- Produces: `/login`、`/overview`、`/users`、`/roles`、`/permissions`；`AppShell`；共享列表组件。
- Consumes: `authStorage`、React Router、shadcn Sidebar/Sheet。

- [ ] **Step 1: 写受保护路由失败测试**

```tsx
it("redirects anonymous visitors to login", async () => {
  renderAtRoute("/users")
  expect(await screen.findByRole("heading", { name: "登录" })).toBeInTheDocument()
})

it("renders protected content when a token exists", async () => {
  authStorage.setToken("token")
  renderAtRoute("/users")
  expect(await screen.findByText("受保护内容")).toBeInTheDocument()
})
```

Run: `npm test -- src/components/layout/protected-route.test.tsx`
Expected: FAIL。

- [ ] **Step 2: 实现保护与路由**

无令牌时：

```tsx
return <Navigate to="/login" replace state={{ from: location.pathname }} />
```

根路径重定向 `/overview`，未知路径重定向 `/overview`。业务页面用 `lazy(() => import(...))` 拆包。Task 3 先提供只含标题的临时 LoginPage 与业务页占位组件，使路由测试可运行；Task 4-8 分别用真实懒加载页面替换，不保留重复实现。

- [ ] **Step 3: 实现 AppShell 和主题**

导航仅含概览、用户、角色、权限。桌面 224px 固定侧栏，窄屏使用 Sheet；顶部栏显示产品名、面包屑和退出按钮。退出清除令牌、Query 缓存并跳转登录。

```css
:root {
  --radius: 0.4375rem;
  --primary: oklch(0.55 0.12 75);
  --sidebar: oklch(0.20 0.015 255);
  --sidebar-foreground: oklch(0.92 0.01 255);
}
```

不得添加渐变、背景光斑或全局 Card 阴影。

- [ ] **Step 4: 验证并提交**

```powershell
npm test -- src/components/layout
npm run build
git add app/src
git commit -m "feat(frontend): 添加管理后台框架与路由保护"
```

Expected: 测试和构建通过。

---

### Task 4: 实现验证码登录与当前用户

**Files:**
- Create: `app/src/features/auth/types.ts`
- Create: `app/src/features/auth/schemas.ts`
- Create: `app/src/features/auth/api.ts`
- Create: `app/src/features/auth/queries.ts`
- Create: `app/src/features/auth/login-page.tsx`
- Create: `app/src/features/auth/login-page.test.tsx`
- Modify: `app/src/app/router.tsx`

**Interfaces:**
- Produces: `getCaptcha()`、`login(input)`、`getCurrentUser()`、`useCurrentUser()`、`LoginPage`。
- Consumes: `apiRequest`、`authStorage`、`CaptchaResponse`、`AuthLoginResponse`、`CurrentUser`。

- [ ] **Step 1: 定义类型和校验**

```ts
export interface CaptchaResponse { key: string; image: string }
export interface LoginInput {
  username: string
  password: string
  captcha_code: string
  captcha_key: string
}
export interface AuthLoginResponse { access_token: string; token_type: string }
export interface CurrentUser { id: number; username: string; email: string; is_active: boolean }
export const loginSchema = z.object({
  username: z.string().trim().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
  captcha_code: z.string().trim().min(1, "请输入验证码"),
})
```

- [ ] **Step 2: 写登录失败测试**

```tsx
it("loads and refreshes captcha")
it("submits the captcha key returned by the server")
it("stores the token and redirects after success")
it("clears password and refreshes captcha after business failure")
```

成功测试断言请求体同时包含输入值和服务端验证码 key。

Run: `npm test -- src/features/auth/login-page.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 实现认证 API 和 Query Hook**

```ts
getCaptcha: () => apiRequest<CaptchaResponse>("/api/v1/captcha")
login: (input) => apiRequest<AuthLoginResponse>("/api/v1/auth/login", {
  method: "POST",
  body: JSON.stringify(input),
})
getCurrentUser: () => apiRequest<CurrentUser>("/api/v1/users/me")
```

验证码查询不自动重试；登录成功先存令牌，再验证当前用户，最后跳转到原始目标或 `/overview`。

- [ ] **Step 4: 实现登录页**

使用宽度不超过 400px 的单列布局；Field/FieldLabel/Input 组合；验证码图片旁提供有可访问名称的刷新按钮。提交中禁用按钮并显示 Spinner。页面只显示产品名和“管理后台登录”，无营销插画、渐变和装饰文案。

- [ ] **Step 5: 验证并提交**

```powershell
npm test -- src/features/auth
npm run build
git add app/src/features/auth app/src/app/router.tsx
git commit -m "feat(frontend): 实现验证码登录"
```

Expected: 测试和构建通过。

---

### Task 5: 实现概览页和并行真实统计

**Files:**
- Create: `app/src/features/overview/api.ts`
- Create: `app/src/features/overview/overview-page.tsx`
- Create: `app/src/features/overview/overview-page.test.tsx`
- Modify: `app/src/app/router.tsx`

**Interfaces:**
- Produces: `OverviewPage`。
- Consumes: `/health`、用户/角色/权限分页接口的 `total`。

- [ ] **Step 1: 写概览失败测试**

```tsx
it("shows backend health and three real totals")
it("keeps successful totals visible when one request fails")
it("links each summary to its management page")
```

MSW 分别返回用户 12、角色 4、权限 18，并让单项失败场景中的权限请求返回 500。

Run: `npm test -- src/features/overview`
Expected: FAIL。

- [ ] **Step 2: 实现并行查询**

使用 `useQueries` 同时请求：

```text
GET /health
GET /api/v1/users?page=1&page_size=1
GET /api/v1/roles/roles?page=1&page_size=1
GET /api/v1/permissions/?page=1&page_size=1
```

每项独立显示加载、数值或“暂不可用”，一个请求失败不能隐藏其他结果。

- [ ] **Step 3: 实现概览布局**

使用一条服务状态区和三个紧凑摘要。数字使用表格数字特性，字号不超过 30px；不用三张等宽悬浮 Card，可使用一块连续区域配合列分隔。只允许服务器状态使用一个语义状态点。

- [ ] **Step 4: 验证并提交**

```powershell
npm test -- src/features/overview
npm run build
git add app/src/features/overview app/src/app/router.tsx
git commit -m "feat(frontend): 添加管理概览"
```

Expected: 测试和构建通过。

---

### Task 6: 实现用户管理

**Files:**
- Create: `app/src/features/users/types.ts`
- Create: `app/src/features/users/schemas.ts`
- Create: `app/src/features/users/api.ts`
- Create: `app/src/features/users/queries.ts`
- Create: `app/src/features/users/users-page.tsx`
- Create: `app/src/features/users/user-create-sheet.tsx`
- Create: `app/src/features/users/user-detail-sheet.tsx`
- Create: `app/src/features/users/user-role-sheet.tsx`
- Create: `app/src/features/users/users-page.test.tsx`
- Modify: `app/src/app/router.tsx`

**Interfaces:**
- Produces: 用户列表、创建、详情、角色查看与整体替换。
- Consumes: `UserCreate`、`UserRead`、`UserWithRolesRead`、角色分页接口。

- [ ] **Step 1: 定义类型和校验**

```ts
export interface UserRead { id: number; username: string; email: string; is_active: boolean }
export interface UserRoleRead { id: number; code: string; name: string; description: string | null }
export interface UserWithRolesRead extends UserRead { roles: UserRoleRead[] }
export const userCreateSchema = z.object({
  username: z.string().trim().min(2, "用户名至少 2 个字符").max(50),
  email: z.string().trim().email("请输入有效邮箱"),
  password: z.string().min(6, "密码至少 6 个字符"),
})
```

- [ ] **Step 2: 写用户页失败测试**

```tsx
it("loads users with page, page_size and keyword")
it("debounces search and resets to page one")
it("creates a user and refreshes the list")
it("loads the selected user's roles")
it("submits a raw role id array when assigning roles")
```

角色分配测试必须断言 body 等于 `[1, 3]`，不能是 `{ role_ids: [1, 3] }`。

Run: `npm test -- src/features/users`
Expected: FAIL。

- [ ] **Step 3: 实现 API 与 Query Hook**

```ts
listUsers(params): GET /api/v1/users?page=&page_size=&keyword=
createUser(input): POST /api/v1/users
getUser(id): GET /api/v1/users/{id}
getUserRoles(id): GET /api/v1/users/{id}/roles
assignUserRoles(id, roleIds): PUT /api/v1/users/{id}/roles
```

`getUserRoles()` 将后端单元素数组规范化为 `UserWithRolesRead | null`。

- [ ] **Step 4: 实现表格和 Sheet**

用 TanStack Table 定义用户名、邮箱、状态和操作列。工具栏提供搜索、刷新和新建。行操作提供详情和分配角色。角色列表按 `page_size=100` 加载；总数超过 100 时显示明确错误，不能静默遗漏。

- [ ] **Step 5: 验证并提交**

```powershell
npm test -- src/features/users
npm run build
git add app/src/features/users app/src/app/router.tsx
git commit -m "feat(frontend): 实现用户管理"
```

Expected: 测试和构建通过。

---

### Task 7: 实现角色管理和权限分配

**Files:**
- Create: `app/src/features/roles/types.ts`
- Create: `app/src/features/roles/schemas.ts`
- Create: `app/src/features/roles/api.ts`
- Create: `app/src/features/roles/queries.ts`
- Create: `app/src/features/roles/roles-page.tsx`
- Create: `app/src/features/roles/role-form-sheet.tsx`
- Create: `app/src/features/roles/role-detail-sheet.tsx`
- Create: `app/src/features/roles/role-permission-sheet.tsx`
- Create: `app/src/features/roles/roles-page.test.tsx`
- Modify: `app/src/app/router.tsx`

**Interfaces:**
- Produces: 角色 CRUD、详情和权限整体替换。
- Consumes: `RoleCreate`、`RoleUpdate`、`RoleRead`、权限分页接口。

- [ ] **Step 1: 定义类型和校验**

```ts
export interface RoleRead {
  id: number
  code: string
  name: string
  description: string | null
  permissions: RolePermissionRead[]
}
export interface RolePermissionRead {
  id: number
  code: string
  name: string
  description: string | null
}
export const roleCreateSchema = z.object({
  code: z.string().trim().min(1, "请输入角色编码").max(100),
  name: z.string().trim().min(1, "请输入角色名称").max(100),
  description: z.string().trim().max(200).optional(),
})
```

- [ ] **Step 2: 写角色页失败测试**

```tsx
it("uses the duplicated roles path from OpenAPI")
it("creates, edits and deletes a role")
it("shows the role's current permissions")
it("submits permission_ids when replacing permissions")
```

CRUD 测试断言请求路径以 `/api/v1/roles/roles` 开头；权限分配断言路径为 `/api/v1/roles/{id}/permissions`。

Run: `npm test -- src/features/roles`
Expected: FAIL。

- [ ] **Step 3: 实现 API 与 Query Hook**

```ts
listRoles(params): GET /api/v1/roles/roles
createRole(input): POST /api/v1/roles/roles
getRole(id): GET /api/v1/roles/roles/{id}
updateRole(id, input): PUT /api/v1/roles/roles/{id}
deleteRole(id): DELETE /api/v1/roles/roles/{id}
assignRolePermissions(id, ids): PUT /api/v1/roles/{id}/permissions
```

- [ ] **Step 4: 实现角色页面**

TanStack Table 列为编码、名称、描述、权限数量、操作。创建时允许填写编码，编辑时编码只读且不进入请求。删除确认显示角色名称。权限分配用 Checkbox 列表并提交 `{ permission_ids: ids }`。

- [ ] **Step 5: 验证并提交**

```powershell
npm test -- src/features/roles
npm run build
git add app/src/features/roles app/src/app/router.tsx
git commit -m "feat(frontend): 实现角色管理"
```

Expected: 测试和构建通过。

---

### Task 8: 实现权限管理

**Files:**
- Create: `app/src/features/permissions/types.ts`
- Create: `app/src/features/permissions/schemas.ts`
- Create: `app/src/features/permissions/api.ts`
- Create: `app/src/features/permissions/queries.ts`
- Create: `app/src/features/permissions/permissions-page.tsx`
- Create: `app/src/features/permissions/permission-form-sheet.tsx`
- Create: `app/src/features/permissions/permission-detail-sheet.tsx`
- Create: `app/src/features/permissions/permissions-page.test.tsx`
- Modify: `app/src/app/router.tsx`

**Interfaces:**
- Produces: 权限 CRUD 和详情。
- Consumes: `PermissionCreate`、`PermissionUpdate`、`PermissionRead`。

- [ ] **Step 1: 定义类型和校验**

```ts
export interface PermissionRead {
  id: number
  code: string
  name: string
  description: string | null
}
export const permissionCreateSchema = z.object({
  code: z.string().trim().min(1, "请输入权限编码").max(100),
  name: z.string().trim().min(1, "请输入权限名称").max(100),
  description: z.string().trim().max(200).optional(),
})
```

- [ ] **Step 2: 写权限页失败测试**

```tsx
it("loads, searches and paginates permissions")
it("creates a permission")
it("keeps code read-only while editing")
it("deletes only after confirmation")
```

删除测试先取消并断言没有 DELETE，再确认并断言调用正确 ID。

Run: `npm test -- src/features/permissions`
Expected: FAIL。

- [ ] **Step 3: 实现 API、Query Hook 和页面**

```ts
listPermissions(params): GET /api/v1/permissions/
createPermission(input): POST /api/v1/permissions
getPermission(id): GET /api/v1/permissions/{id}
updatePermission(id, input): PUT /api/v1/permissions/{id}
deletePermission(id): DELETE /api/v1/permissions/{id}
```

TanStack Table 列为编码、名称、描述、操作。编辑请求仅包含 `name` 和 `description`。

- [ ] **Step 4: 验证并提交**

```powershell
npm test -- src/features/permissions
npm run build
git add app/src/features/permissions app/src/app/router.tsx
git commit -m "feat(frontend): 实现权限管理"
```

Expected: 测试和构建通过。

---

### Task 9: 完成 taste-skill 检查、可访问性和文档

**Files:**
- Create: `app/.env.example`
- Create: `app/README.md`
- Create: `app/src/app/accessibility.test.tsx`
- Modify: `app/src/index.css`
- Modify: `app/src/components/layout/app-shell.tsx`
- Modify: `app/src/features/*/*.tsx`

**Interfaces:**
- Produces: 可交付的前端说明和一致的桌面/窄屏体验。
- Consumes: 前八个任务的完整应用。

- [ ] **Step 1: 写可访问性失败测试**

```tsx
it("provides accessible names for navigation and icon buttons")
it("all dialogs and sheets expose a title")
it("opens mobile navigation from the menu button")
```

Run: `npm test -- src/app/accessibility.test.tsx`
Expected: FAIL，直到缺失名称和标题补齐。

- [ ] **Step 2: 修复响应式和可访问性细节**

- 图标按钮含 `aria-label`；
- Dialog、Sheet、AlertDialog 均有 Title；
- 表单错误关联 `aria-invalid` 和描述；
- 键盘可到达所有操作；
- 1024px 以上固定侧栏，以下使用 Sheet；
- 窄屏表格可横向滚动；
- 颜色对比满足 WCAG AA；
- 动效只使用 transform/opacity，并尊重 reduced motion。

- [ ] **Step 3: 运行 taste-skill Pre-Flight Check**

逐项审计与本管理后台相关的检查：Design Read、三个参数、单一设计系统、固定浅色主题、单一强调色、统一 7px 圆角、按钮/表单对比度、按钮不换行、Phosphor 单一图标家族、无手绘 SVG、无 em dash/en dash、无 AI 紫、无渐变光晕、无玻璃拟态、无营销文案、无装饰状态点、无虚假数据、完整 loading/empty/error 状态、`min-h-[100dvh]`、移动端收敛、Core Web Vitals 合理。Hero、logo wall、图片和营销区块等检查标记为“不适用：本项目是管理后台且没有这些区块”。

- [ ] **Step 4: 编写运行文档**

`app/.env.example`：

```dotenv
VITE_API_BASE_URL=
```

`app/README.md` 说明 `npm install`、`npm run dev`、`npm test`、`npm run lint`、`npm run build`，并说明空 Base URL 使用 Vite 代理。

- [ ] **Step 5: 全量验证和浏览器冒烟**

```powershell
npm test
npm run lint
npm run build
npm run dev -- --host 127.0.0.1
```

在 1440x900 与 390x844 验证登录、验证码、受保护路由、概览、列表、搜索、分页和抽屉；控制台不得出现 React key、可访问性或未处理 Promise 警告。后端无法启动时，以 MSW 自动化测试为证据，并明确真实联调阻断。

- [ ] **Step 6: 提交**

```powershell
git add app
git commit -m "docs(frontend): 完善前端交付说明与体验"
```

---

## Final Verification

- [ ] `npm test` 全部通过。
- [ ] `npm run lint` 无错误。
- [ ] `npm run build` 通过并生成 `app/dist/`。
- [ ] `git status --short` 只包含用户原有改动或明确说明的生成文件。
- [ ] 对照 `swagger-openapi.json` 确认所有管理操作都有调用路径。
- [ ] 没有 Agent、模型、知识库、工作流占位页面。
- [ ] taste-skill 适用的 Pre-Flight Check 全部通过，不适用项都有原因。
