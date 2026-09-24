# 辰光 Agent 平台管理前端

面向内部运营人员的桌面 B/S 管理后台，对接仓库根目录的 FastAPI 后端，覆盖登录、概览、用户、角色和权限管理。不包含 Agent、模型、知识库或工作流页面，因为后端目前没有对应接口。

## 技术栈

React 19 + Vite + TypeScript，shadcn/ui + Tailwind CSS 4，React Router，TanStack Query / Table，React Hook Form + Zod，Phosphor Icons，Vitest + React Testing Library + MSW。

## 环境要求

- Node.js 20 及以上（本仓库验证版本为 Node 24.13.1、npm 11.8.0）
- 后端可选。仅运行前端和使用测试不依赖后端。

## 快速开始

```powershell
cd app
npm install
npm run dev
```

默认地址 `http://127.0.0.1:5173`。开发代理把 `/api` 与 `/health` 转发到 `http://127.0.0.1:8000`，因此联调时请先启动后端：

```powershell
# 仓库根目录
uvicorn src.main:app --reload
```

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `VITE_API_BASE_URL` | 后端地址前缀。留空时使用相对路径并依赖 Vite 代理；部署时配置为网关地址，例如 `https://api.example.com` |

复制 `app/.env.example` 为 `app/.env.local` 后填写。变量在构建期注入，修改后需重启开发服务器。

## 可用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 运行 `tsc -b` 类型检查并产出 `app/dist/` |
| `npm run lint` | ESLint 检查 |
| `npm test` | 运行全部 Vitest 用例 |
| `npm run test:watch` | 监听模式运行测试 |

## 目录结构

```text
app/src/
├─ app/             Provider、路由、可访问性用例
├─ components/      布局、列表通用件、shadcn/ui 生成组件
├─ features/        按业务域拆分：auth / overview / users / roles / permissions
├─ hooks/           窄屏判定
├─ lib/             API 客户端、令牌存储、通用类型
└─ test/            MSW 服务端、默认处理器、测试渲染器
```

每个业务域内部固定四件套：`types.ts`、`api.ts`、`queries.ts`、页面与表单组件。页面只消费 `queries.ts`，不直接调用 `api.ts`。

## 与后端的接口契约

后端当前有几处与常规约定不同的行为，前端已按现状兼容，等后端调整后只需改动 `features/*/api.ts`：

| 现象 | 前端处理 |
| --- | --- |
| 业务失败返回 HTTP 200，错误码在响应体 `code` 里 | `apiRequest` 同时校验 HTTP 状态与 `code`，统一抛 `ApiError` |
| `/health` 不套 `{code,message,data}` 包装 | 单独用 `fetch` 读取，见 `features/overview/api.ts` |
| `POST /api/v1/captcha` 可单独校验验证码 | 未接入前端：登录已在服务端消费并校验验证码，单独校验没有对应的产品入口 |
| 角色 CRUD 的真实路径是 `/api/v1/roles/roles`（router 前缀与装饰器重复） | 按现状对接，仅「分配权限」用 `/api/v1/roles/{id}/permissions` |
| 用户角色分配请求体是裸数组 `[1,3]` | 直接提交数组，不包 `role_ids` |
| 角色权限分配请求体是 `{ permission_ids: [...] }` | 提交该结构 |
| `GET /api/v1/users/{id}/roles` 返回单元素数组 | `getUserRoles()` 规范化为单个对象或 `null` |
| 权限列表路径带尾斜杠 `/api/v1/permissions/` | 按现状对接 |
| 角色列表的 `response_model` 是 `PageResult[PermissionRead]`，会裁掉 `permissions` | 列表的「权限数量」列显示「未提供」，真实权限只在详情页展示 |
| 角色 / 权限勾选项一次最多加载 100 条 | 总数超过 100 时禁用保存并明确提示，不静默遗漏 |

## 令牌与登录态

- JWT 以 `{"version":1,"token":"..."}` 结构存放在 `localStorage`，键为 `chenguang.auth.v1`；解析失败或版本不匹配时自动清除。
- 所有请求自动附带 `Authorization: Bearer <token>`。
- 退出登录清除令牌并清空 Query 缓存。
- 服务端返回鉴权失败时代码为业务 `code`（当前后端尚未启用该分支），前端拦截器按 `ApiError` 统一提示。

## 视觉与交互约定

- 固定浅色主题；深灰中性色加单一琥珀强调色（`--primary: #795000`）。
- 圆角统一 6 到 8px（`--radius: 0.4375rem`）。
- 普通内容不使用渐变、光晕、玻璃拟态和装饰插画；阴影仅出现在弹窗、抽屉和下拉菜单。
- 只使用 Phosphor 一个图标家族。
- 1024px 及以上固定 224px 侧栏，以下切换为 Sheet 抽屉。
- 数字使用 `tabular-nums`，统计数字不超过 24px。
- 仅服务器连接状态使用一个语义状态点，不使用装饰性状态点。

## 测试策略

`src/test/server.ts` 用 MSW 建立测试服务端，`src/test/handlers.ts` 提供一组默认处理器，保证页面挂载时的请求都有稳定响应；未注册的请求会直接报错，避免静默通过。用例通过 `server.use(...)` 覆盖所需接口。

覆盖范围：API 客户端（业务错误、422、令牌注入、Base URL 拼接）、令牌存储、路由保护、登录与验证码、概览统计、用户管理、角色管理、权限管理、可访问性。

## 联调现状

自动化测试全部通过，但**尚未完成与真实后端的端到端联调**：本地可用的数据库与 Redis 指向远程服务器，为避免向共享环境写入数据，本阶段未执行真实登录与写操作。已通过本地模拟后端在浏览器中验证页面流程，真实联调需要一份指向开发库的 `.env` 后执行。

## taste Pre-Flight Check 结果

对照设计规范逐项审计（`DESIGN_VARIANCE: 4`、`MOTION_INTENSITY: 2`、`VISUAL_DENSITY: 7`）：

| 检查项 | 结果 |
| --- | --- |
| Design Read 与三个设计参数 | 通过，见「视觉与交互约定」 |
| 单一设计系统、固定浅色主题、单一强调色 | 通过 |
| 统一 6 到 8px 圆角 | 通过，`--radius` 为 7px |
| 按钮与表单控件 WCAG AA 对比度 | 通过，主色对底色约 7.1:1，次要文字约 6.7:1 |
| 按钮文本不换行 | 通过，Button 内置 `whitespace-nowrap` |
| 单一图标家族、无手绘 SVG | 通过，仅使用 `@phosphor-icons/react` |
| 无 em dash / en dash 用户文案 | 通过，表格空值使用「无」「未提供」 |
| 无 AI 紫、无渐变光晕、无玻璃拟态 | 通过；仅弹窗与抽屉遮罩使用 `backdrop-blur-xs`，属于浮层而非普通内容 |
| 无营销文案、无虚假数据、无装饰状态点 | 通过，未接入的领域不建占位页 |
| loading / empty / error 状态完整 | 通过，统一由 `QueryState` 与 ErrorBoundary 之外的 `QueryState` 承载 |
| `min-h-[100dvh]`、窄屏收敛 | 通过，窄屏侧栏改抽屉、表格横向滚动 |
| 图标按钮含可访问名称、弹窗有标题、表单错误关联描述 | 通过，由 `src/app/accessibility.test.tsx` 守护 |
| 尊重 reduced motion | 通过，`index.css` 内含 `prefers-reduced-motion` 收敛规则 |
| Hero、logo wall、图片区块、营销版式检查 | 不适用：本项目是内部管理后台，没有这些区块 |
| 巨型数字与虚假图表检查 | 不适用：统计值来自接口 `total`，不使用图表 |

## 已知限制

- 后端用户与 RBAC 接口当前无需鉴权，前端不隐藏入口，授权最终必须由后端执行。
- 后端未配置 CORS，跨端口联调依赖 Vite 代理。
- 后端角色路由前缀重复、角色列表响应模型错配等问题仍未修复，前端按现状兼容。
