# 辰光 Agent 平台说明书

> 文档依据：提交 `5009e9f` 及其 2026-09-24 本地工作区  
> 当前阶段：后端基础设施、认证与 RBAC 基础能力开发中；管理前端已交付并合入 `app/`。

> [!WARNING]
> 全新克隆**仍不能开箱启动**：`src/modules/role`、`src/modules/permission` 中还有 6 处 `from core...` 裸导入，其修复只存在于本地工作区、尚未提交；`requirements.txt` 依赖清单仍不完整；工作区另有一份未跟踪的重复 RBAC 迁移。测试现状为后端 13 个、前端 61 个，但都不覆盖后端应用启动。请先处理[已知问题](#13-已知问题与交付前检查)，再执行迁移或开展真实联调。

本文以提交 `5009e9f` 为代码基线，并单独标注本地工作区中尚未提交的内容。标记为“未跟踪”的文件不会出现在全新克隆中。

## 1. 项目简介

辰光 Agent 平台是一个正在建设中的 Agent 应用管理平台。本仓库目前主要实现平台后端，已具备用户、验证码登录、JWT 身份认证、角色和权限管理等基础模块，为后续 Agent 管理、模型接入、知识库、工作流及前端管理控制台提供底座。

当前代码的重点是通用后台能力，尚未出现 Agent、模型、会话、知识库或工作流等领域模块。因此，本说明书把这些能力视为后续规划，不将其描述成已经完成的功能。

### 1.1 当前实现范围

- FastAPI 异步 Web 服务；
- SQLAlchemy 2.0 异步 ORM 与 MySQL 数据持久化；
- Alembic 数据库版本迁移；
- Redis 验证码存储；
- 图片验证码生成、校验与一次性消费；
- 用户注册、查询、分页和关键词搜索；
- 用户名密码登录与 JWT 签发；
- 当前登录用户查询；
- 角色、权限及用户—角色—权限关联；
- 统一响应结构、业务异常处理、请求日志；
- 基础单元测试；
- 管理后台前端（React + Vite + TypeScript + shadcn/ui），覆盖验证码登录、概览、用户、角色和权限页面。

### 1.2 尚未实现

- Agent 创建、配置、运行与版本管理；
- 大模型供应商及模型配置；
- 会话、消息、知识库、工具和工作流；
- MinIO 文件业务接入；
- 完整的路由保护与权限校验；
- 生产部署、CI/CD、监控和告警。

## 2. 技术栈

| 分类 | 技术 | 用途 |
| --- | --- | --- |
| Web 框架 | FastAPI | HTTP API、依赖注入、OpenAPI 文档 |
| ORM | SQLAlchemy 2.0 Async | 异步数据库访问 |
| 数据库驱动 | asyncmy | MySQL 异步连接 |
| 数据迁移 | Alembic | 数据库表结构版本管理 |
| 数据校验 | Pydantic 2 / pydantic-settings | 请求响应模型及环境配置 |
| 缓存 | Redis Async | 验证码的限时存储 |
| 身份认证 | JWT（HS256） | 登录令牌签发与校验 |
| 密码安全 | bcrypt | 密码哈希与校验 |
| 日志 | Loguru | 控制台与按日文件日志 |
| 本地依赖 | Docker Compose | MySQL、Redis、MinIO |
| 测试 | pytest / AnyIO | 同步与异步单元测试 |

仓库绑定的开发解释器目前是 Python 3.13 环境。项目未声明正式的最低 Python 版本，团队应在后续补充统一版本约束。

## 3. 目录结构

```text
chenguang/
├─ app/                         # 管理后台前端（React + Vite + TypeScript + shadcn/ui）
├─ alembic/
│  ├─ versions/                # 数据库迁移脚本
│  └─ env.py                   # 异步迁移环境及模型注册
├─ docs/superpowers/            # 前端的设计方案与实施计划
├─ src/
│  ├─ core/                    # 配置、基础模型、仓储、响应、依赖和异常
│  ├─ infra/                   # MySQL 与 Redis 基础设施
│  ├─ middlewares/             # HTTP 中间件
│  ├─ modules/                 # 业务模块
│  │  ├─ auth/                 # 登录认证
│  │  ├─ captcha/              # 图片验证码
│  │  ├─ permission/           # 权限管理
│  │  ├─ provider/             # 模型供应商（未完成，仅 model 与 schema）
│  │  ├─ role/                 # 角色管理与权限分配
│  │  └─ user/                 # 用户管理与角色分配
│  ├─ test/                    # 测试用例
│  ├─ utils/                   # JWT、密码工具
│  └─ main.py                  # FastAPI 应用入口
├─ .env.example                # 环境变量模板
├─ alembic.ini                 # Alembic 配置
├─ docker-compose.yaml         # 本地基础服务
├─ pyrefly.toml                # Python 静态分析配置
├─ requirements.txt            # Python 依赖清单（不完整，见 8.4）
└─ swagger-openapi.json        # 后端 OpenAPI 快照（未跟踪）
```

### 3.1 管理前端

`app/` 是独立的管理后台前端工程，不是后端 Python 包。技术栈为 React 19 + Vite + TypeScript + Tailwind CSS 4 + shadcn/ui，路由、服务端状态和表格分别交给 React Router、TanStack Query 与 TanStack Table。它只调用本仓库已有的后端接口，不含 Agent、模型、知识库或工作流页面。

实际目录结构：

```text
app/
├─ public/favicon.svg
├─ src/
│  ├─ app/                     # Provider、路由、可访问性用例
│  ├─ components/              # 布局、列表通用件、shadcn/ui 生成组件
│  ├─ features/                # auth / overview / users / roles / permissions
│  ├─ hooks/                   # 窄屏判定
│  ├─ lib/                     # API 客户端、令牌存储、通用类型
│  └─ test/                    # MSW 服务端、默认处理器、测试渲染器
├─ .env.example                # 前端环境变量示例
├─ package.json
├─ package-lock.json
└─ README.md                   # 前端独立开发说明
```

常用命令（需要 Node.js 20 及以上）：

```powershell
cd app
npm install
npm run dev        # 默认 http://127.0.0.1:5173，/api 与 /health 代理到 127.0.0.1:8000
npm test
npm run build
```

前端的接口契约兼容项、令牌存储、视觉规范和 taste Pre-Flight Check 结果见 `app/README.md`。跨端口联调前仍需后端补充 CORS。

## 4. 系统架构

后端按模块组织，并在每个模块内部采用四层结构：

```text
HTTP 请求
   │
   ▼
api（路由、参数注入、响应转换）
   │
   ▼
service（业务规则、跨仓储协调）
   │
   ▼
repository（查询与持久化）
   │
   ▼
model（SQLAlchemy ORM）── MySQL

service ── captcha service ── Redis
```

### 4.1 各层职责

- `api.py`：定义路由、请求参数、依赖注入和响应模型，不直接编写数据库查询；
- `service.py`：实现业务校验和流程编排，业务失败抛出 `BizException`；
- `repository.py`：封装数据库查询，通用 CRUD 继承 `BaseRepository`；
- `model.py`：定义表、字段和关联关系；
- `schema.py`：定义 Pydantic 请求和响应 DTO。

所有项目内导入必须以 `src` 为根，例如：

```python
from src.core.base_schema import ResponseSchema
```

不要使用 `from core...` 或 `from modules...`。从仓库根目录启动时，这类裸导入无法解析；混用两种导入方式还可能导致同一模型被加载两次。

### 4.2 事务约定

`get_async_session()` 为每个请求提供一个异步数据库会话：

- 请求正常结束时统一 `commit`；
- 请求抛出异常时统一 `rollback`；
- repository 只执行 `flush` / `refresh`，不自行提交事务；
- service 不应绕过会话依赖创建额外事务。

### 4.3 统一响应

业务接口统一返回：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

分页数据放在 `data` 中：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [],
    "total": 0,
    "page": 1,
    "page_size": 10
  }
}
```

当前业务异常仍返回 HTTP 200，通过响应体中的 `code` 表示失败；未处理异常返回 HTTP 500。前端在现阶段必须同时判断 HTTP 状态和业务 `code`。

## 5. 核心业务模块

### 5.1 验证码

验证码由四位大写字母和数字组成，排除了 `O/0/I/1` 等易混淆字符。图片以 Data URL 返回，答案存入 Redis：

- Redis key：`captcha:<uuid>`；
- 有效期：5 分钟；
- 大小写不敏感；
- 无论校验成功还是失败，key 都会被删除，以防重复尝试；
- 客户端可原样回传带 `captcha:` 前缀的 key。

### 5.2 登录与 JWT

登录流程如下：

1. 校验并消费验证码；
2. 按用户名查询用户；
3. 检查账号是否启用；
4. 使用 bcrypt 校验密码；
5. 签发有效期 30 分钟的 HS256 JWT；
6. 更新用户最后登录时间。

JWT payload 当前包含 `sub`、`username`、`email`、`iat` 和 `exp`。访问受保护接口时使用：

```http
Authorization: Bearer <access_token>
```

### 5.3 RBAC 权限模型

```text
User ──< user_roles >── Role ──< role_permissions >── Permission
```

- 一个用户可拥有多个角色；
- 一个角色可分配多个权限；
- 用户角色和角色权限均为多对多关系；
- 分配接口采用“整体替换”语义，而非增量追加；
- 关联数据删除时配置了 `CASCADE`。

目前三个层次的完成度不同：

- **认证凭据**：可以登录并签发、解析 JWT；
- **路由保护**：仅 `/api/v1/users/me` 明确要求 Bearer Token；
- **授权控制**：尚未根据角色或权限编码决定用户能否访问接口。

RBAC 目前只完成数据模型和管理接口。用户创建、用户查询和 RBAC 管理接口在当前代码中均可匿名调用，只适合开发阶段，禁止按现状直接暴露到公网。

## 6. 数据模型

所有实体表默认包含 `id`、`created_at` 和 `updated_at`。

| 表 | 主要字段 | 说明 |
| --- | --- | --- |
| `users` | `username`、`email`、`hashed_password`、`is_active`、`is_superuser`、`last_login` | 用户账号 |
| `roles` | `code`、`name`、`description` | 角色 |
| `permissions` | `code`、`name`、`description` | 权限 |
| `user_roles` | `user_id`、`role_id` | 用户—角色中间表 |
| `role_permissions` | `role_id`、`permission_id` | 角色—权限中间表 |

`username`、`email`、角色 `code`、权限 `code` 均要求唯一。

## 7. API 概览

基础前缀为 `/api/v1`，健康检查不使用该前缀。应用成功启动后，完整模型和在线调试入口为：

- Swagger UI：`http://127.0.0.1:8000/docs`
- ReDoc：`http://127.0.0.1:8000/redoc`
- OpenAPI JSON：`http://127.0.0.1:8000/openapi.json`

### 7.1 健康检查与认证

| 方法 | 当前路径 | 请求要点 | 说明 |
| --- | --- | --- | --- |
| GET | `/health` | 无 | 健康检查 |
| GET | `/api/v1/captcha` | 无 | 获取验证码 key 与 Base64 图片 |
| POST | `/api/v1/captcha` | `key`、`code` | 单独校验验证码 |
| POST | `/api/v1/auth/login` | `username`、`password`、`captcha_code`、`captcha_key` | 登录并返回 JWT |

### 7.2 用户

| 方法 | 当前路径 | 请求要点 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/v1/users` | `username`、`email`、`password` | 创建用户 |
| GET | `/api/v1/users` | `page`、`page_size`、`keyword` | 分页查询用户 |
| GET | `/api/v1/users/me` | Bearer Token | 当前登录用户 |
| GET | `/api/v1/users/{user_id}` | 路径 ID | 用户详情 |
| PUT | `/api/v1/users/{user_id}/roles` | 请求体为角色 ID 数组 | 整体替换用户角色 |
| GET | `/api/v1/users/{user_id}/roles` | 路径 ID | 查询用户及角色；当前响应为单元素数组 |

### 7.3 权限

| 方法 | 当前路径 | 说明 |
| --- | --- | --- |
| POST | `/api/v1/permissions` | 创建权限 |
| GET | `/api/v1/permissions/` | 分页查询权限，支持 `page`、`page_size`、`keyword` |
| GET | `/api/v1/permissions/{permission_id}` | 权限详情 |
| PUT | `/api/v1/permissions/{permission_id}` | 更新名称和描述，编码不可修改 |
| DELETE | `/api/v1/permissions/{permission_id}` | 删除权限 |

### 7.4 角色

角色模块当前存在路由前缀重复。以下列出的是代码实际生成的路径，而不是预期路径：

| 方法 | 当前实际路径 | 预期规范路径 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/v1/roles/roles` | `/api/v1/roles` | 创建角色 |
| GET | `/api/v1/roles/roles` | `/api/v1/roles` | 分页查询角色 |
| GET | `/api/v1/roles/roles/{role_id}` | `/api/v1/roles/{role_id}` | 角色详情 |
| PUT | `/api/v1/roles/roles/{role_id}` | `/api/v1/roles/{role_id}` | 更新角色 |
| DELETE | `/api/v1/roles/roles/{role_id}` | `/api/v1/roles/{role_id}` | 删除角色 |
| PUT | `/api/v1/roles/{role_id}/permissions` | 同当前路径 | 整体替换角色权限 |

建议在前端正式联调前先统一角色路由，避免前端依赖临时的重复路径。

### 7.5 当前鉴权矩阵

| 接口范围 | 当前访问要求 | 目标建议 |
| --- | --- | --- |
| `/health`、获取验证码、登录 | 公开 | 保持公开，并增加频率限制 |
| 创建用户 | 公开 | 根据产品设计改为受控注册或管理员创建 |
| `/api/v1/users/me` | Bearer Token | 保持登录可访问 |
| 用户列表、详情、角色分配 | 当前公开 | 要求登录，并校验用户管理权限 |
| 角色、权限 CRUD 和分配 | 当前公开 | 要求登录，并校验 RBAC 管理权限 |

`is_superuser` 字段已存在，但当前没有创建首个超级管理员的初始化脚本或公开接口，也没有基于该字段实施授权。管理员初始化方案需要另行设计。

### 7.6 登录联调示例

先获取验证码：

```http
GET /api/v1/captcha
```

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "key": "captcha:550e8400-e29b-41d4-a716-446655440000",
    "image": "data:image/png;base64,..."
  }
}
```

用户识别图片后登录：

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "demo",
  "password": "your_password",
  "captcha_code": "A2BC",
  "captcha_key": "captcha:550e8400-e29b-41d4-a716-446655440000"
}
```

成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "access_token": "<jwt>",
    "token_type": "bearer"
  }
}
```

当前没有刷新令牌，也不会在登录响应中返回用户资料。验证码或账号校验失败时，HTTP 状态目前仍可能为 200，例如：

```json
{
  "code": 1001,
  "message": "验证码不存在或已过期",
  "data": null
}
```

## 8. 本地开发

本节记录修复启动阻断后的目标流程，不代表当前快照可以逐条执行成功。当前应先完成第 13 节的导入、迁移和依赖修复；特别是在重复迁移未处理前，不要直接执行 `alembic upgrade head`。

### 8.1 前置条件

- Python 开发环境；
- Docker 与 Docker Compose；
- 可用的 MySQL 8 和 Redis；
- Windows PowerShell、Linux shell 或等价终端。

### 8.2 配置环境变量

所有命令应从仓库根目录执行，因为 `.env` 和日志目录均按当前工作目录解析。

PowerShell：

```powershell
Copy-Item .env.example .env
```

然后编辑 `.env`。本地 Docker Compose 的默认值是：

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=chenguang

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=123456
REDIS_DB=0
```

`.env.example` 中的 `DB_NAME=chenguang_db` 与 Compose 创建的 `chenguang` 不一致，使用本地容器时必须修改。JWT 密钥可用以下命令生成：

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

不要提交 `.env`，也不要在日志、文档或截图中泄露真实连接串和密钥。

### 8.3 启动基础服务

```powershell
docker compose up -d
docker compose ps
```

默认端口：

| 服务 | 端口 | 当前用途 |
| --- | --- | --- |
| MySQL | `3306` | 业务数据库 |
| Redis | `6379` | 验证码 |
| MinIO API | `9000` | 已启动但尚无业务代码接入 |
| MinIO Console | `9001` | MinIO 管理控制台 |

### 8.4 安装依赖

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

当前 `requirements.txt` 未完整声明代码直接使用的若干包，包括 `redis`、`PyJWT`、`bcrypt`、`captcha` 和 `pytest`。全新环境无法保证仅凭该文件启动。当前已验证开发环境安装的是 `redis 8.1.0`、`PyJWT 2.14.0`、`bcrypt 5.0.0`、`captcha 0.7.1` 和 `pytest 9.1.1`；这些版本只是环境快照，正式交付前应将确认后的兼容版本写入依赖清单，并在全新环境重新验证。

前端依赖与 Python 环境相互独立，需单独安装：

```powershell
cd app
npm install
```

`app/package-lock.json` 已修复过一处缺 `version` 的 rolldown 可选依赖条目（提交 `02b9b09`），`npm install` 与 `npm ci` 都能正常完成。

### 8.5 执行数据库迁移

```powershell
alembic current
alembic upgrade head
alembic check
```

新增或修改 ORM 模型后：

```powershell
alembic revision --autogenerate -m "变更说明"
alembic upgrade head
```

生成迁移后必须人工检查。新增业务模型还必须在 `alembic/env.py` 中显式导入，否则自动迁移无法发现对应表。

### 8.6 启动后端

```powershell
uvicorn src.main:app --reload
```

当前提交存在已知的启动阻断：角色和权限模块中的部分文件使用了 `from core...` 裸导入，执行上述命令会触发 `ModuleNotFoundError: No module named 'core'`。需先统一为 `from src.core...` 才能正常加载应用。

## 9. 测试与质量检查

执行全部测试：

```powershell
python -m pytest -q
```

截至 2026-09-24，后端本地验证结果为 `13 passed`，覆盖：

- JWT 编码和解码；
- bcrypt 密码哈希与校验；
- 验证码创建、大小写校验、前缀兼容和一次性消费；
- 简单同步示例。

前端测试在 `app/` 下单独执行，截至同日为 `61 passed / 10 个测试文件`：

```powershell
cd app
npm test        # Vitest + React Testing Library + MSW
npm run lint    # 0 error（3 条 react-hooks/incompatible-library 提示来自 TanStack Table）
npm run build
```

前端用例覆盖 API 客户端、令牌存储、路由保护、登录与验证码、概览统计、用户／角色／权限管理和可访问性（导航命名、图标按钮命名、抽屉与弹窗标题）。另用本地模拟后端做过 1440×900 与 390×844 的浏览器冒烟，但**尚未与真实后端联调**。

后端目前仍没有 API、repository、service 集成或端到端测试。测试通过不代表应用入口能够启动；应把“测试通过”和“应用导入/启动通过”作为两项独立检查。

建议每次提交前至少执行：

```powershell
python -m pytest -q
python -c "import src.main; print('app import ok')"
alembic check
cd app; npm test; npm run lint; npm run build
```

其中 `alembic check` 会连接 `.env` 指向的数据库，执行前必须确认目标环境，避免误操作远程数据库。

## 10. 数据库迁移注意事项

- 已提交的迁移链从 `6a1c4040d829` 开始，经用户表和用户字段迁移到 `c0b10f179f6c`；
- 工作区内另有**未跟踪**的两个迁移：`e4a0b9bbcffb_定义rbac.py` 在 `c0b10f179f6c` 之后再次创建同样的 RBAC 表，与上一迁移重复，全新数据库执行到它会撞 `1050 Table already exists`；`3436c1c5cf23_创建model_providers表.py` 又依赖它，因此这条链目前只对版本号已被手工推进过的库有效；
- `.env` 指向的远程库当前版本已是 `3436c1c5cf23`，`alembic check` 输出 `No new upgrade operations detected`，即现存库结构与模型一致；
- MySQL DDL 通常不可事务回滚，迁移中途失败可能产生“结构已改、版本号未推进”的半迁移状态；
- 向已有数据的表添加非空列时，应先提供临时 `server_default` 回填存量数据，再移除默认值；
- `alembic/env.py` 使用 `Settings.DATABASE_URL`，而不是 `alembic.ini` 中的固定地址；
- 数据库密码经过 URL 编码后可能包含 `%`，写入 Alembic 配置前必须保留现有的 `%` 转义处理。

## 11. 日志与配置

配置由 `src/core/config.py` 中的 `Settings` 从根目录 `.env` 读取，并通过缓存保持单例。主要配置项如下：

| 配置 | 说明 |
| --- | --- |
| `APP_NAME` | 应用名称 |
| `APP_ENV` | 运行环境标识 |
| `APP_DEBUG` | 调试开关；当前也控制 SQLAlchemy SQL 输出 |
| `APP_VERSION` | API 版本，代码默认 `1.0.0` |
| `DB_*` | MySQL 连接配置 |
| `REDIS_*` | Redis 连接配置 |
| `JWT_SECRET_KEY` | JWT 签名密钥，必须配置 |
| `LOG_LEVEL` | 日志级别 |
| `LOG_DIR` | 日志目录 |

日志设计为同时输出到控制台和 `logs/YYYY-MM-DD.log`，文件保留 30 天并压缩归档。请求中间件记录方法、路径、状态码和耗时。

当前 `lifespan()` 虽已定义，但没有传给 `FastAPI(lifespan=...)`，因此其中的日志初始化和关闭数据库引擎逻辑不会执行。此外，该函数记录了完整 `DATABASE_URL`，一旦启用会把数据库密码写入日志，必须先改为脱敏输出。

## 12. 前后端联调约定

在接口进一步规范化前，`app/` 前端已按以下临时约定实现：

1. API 基础地址通过前端环境变量配置，不在代码中硬编码；
2. 获取验证码后，直接保存并回传服务端返回的完整 `key`；
3. 登录成功后，将 `access_token` 作为 Bearer Token；
4. 响应拦截器同时检查 HTTP 状态码和响应体 `code`；
5. 分页参数使用 `page`、`page_size`、`keyword`；
6. 用户角色分配当前直接提交 JSON 数组，例如 `[1, 2]`；
7. 角色权限分配提交 `{ "permission_ids": [1, 2] }`；
8. 角色页面已按后端现状实现：CRUD 使用重复路径 `/api/v1/roles/roles`，权限分配使用 `/api/v1/roles/{role_id}/permissions`，后端统一路径后需同步修改前端；
9. 后端尚未配置 CORS，前后端分端口开发前需补充允许来源；
10. 不应只依靠前端隐藏菜单实现权限控制，最终授权必须由后端执行。

## 13. 已知问题与交付前检查

按优先级建议处理：

1. **提交应用启动修复**：`from core...` 裸导入的修复目前只存在于本机工作区，未提交前全新克隆依旧无法启动；
2. **修复重复迁移**：移除或重写未跟踪的 RBAC 重复迁移，并让 `3436c1c5cf23` 不再依赖它；
3. **规范角色路由**：移除装饰器中重复的 `/roles`；前端 `app/src/features/roles/api.ts` 目前硬编码兼容该路径，后端改完需同步修改；
4. **启用并修正生命周期**：注册 `lifespan`，停止输出含密码的数据库 URL，并在关闭时释放数据库和 Redis 资源；
5. **补齐依赖清单**：`requirements-full.txt` 目前是空文件，`requirements.txt` 缺 `redis`、`PyJWT`、`bcrypt`、`captcha` 和 `pytest`；
6. **完善鉴权授权**：保护用户和 RBAC 管理接口，实现权限码校验；前端所有管理接口当前都可以不带令牌调用；
7. **修正角色业务异常**：部分 `BizException` 使用位置参数，当前会把错误文本传入 `code`；
8. **修正响应模型**：角色列表声明成了权限分页模型，会把 `permissions` 裁掉（前端因此只能显示「未提供」），用户角色详情返回单元素数组；
9. **增加 CORS**：为 `app/` 前端跨端口开发和部署配置明确来源；
10. **补充集成测试**：后端补应用启动、登录、分页、角色权限分配和事务回滚；前端补一次真实后端联调；
11. **同步内部文档**：现有 `CLAUDE.md` 对已注册模块、迁移 head 和验证码 bug 的描述已经过期；
12. **补充产品能力**：当前仓库尚无 Agent 平台核心领域模型；`provider` 模块只有 model 与 schema，且 `schema.py` 导入了不存在的 `core.base_model`，一旦被引用就会报 `ModuleNotFoundError`。

## 14. 开发规范

- 在仓库根目录执行命令；
- 项目内部统一使用 `from src...` 绝对导入；
- 新模块遵循 `api → service → repository → model` 分层；
- API 出参使用 `ResponseSchema`，ORM 转 DTO 时使用 `model_validate()`；
- repository 只 `flush`，事务提交由请求会话统一管理；
- 新模型要在 `alembic/env.py` 中注册；
- 自动生成的迁移必须人工审阅；
- 密码只保存 bcrypt 哈希，密钥只从环境变量读取；
- `.env`、日志、本地数据库卷和对象存储数据不得提交；
- 提交前执行测试、应用导入和迁移一致性检查；
- 代码、注释、日志和提交信息延续仓库现有中文风格。

## 15. 推荐的近期里程碑

### 里程碑一：后端基线可运行

- 清理导入、路由、迁移和依赖问题；
- 确保新环境可以完成安装、迁移、启动和测试；
- 为现有接口补充 API 集成测试。

### 里程碑二：管理端前后端闭环（前端已交付，后端待补）

已完成：前端工程位于 `app/`，登录、概览、用户、角色和权限页面全部交付，配套 61 个测试、lint、生产构建与双视口浏览器冒烟；请求拦截、令牌存储与登录态已就位。

仍待完成：

- 后端配置 CORS，并完成一次指向开发库的真实联调；
- 后端实现管理接口鉴权和权限码校验。

### 里程碑三：Agent 平台核心能力

- 明确 Agent、模型、工具、知识库、工作流和会话的领域边界；
- 设计数据模型与 API；
- 接入对象存储和模型供应商；
- 增加运行审计、用量统计、监控与安全策略。

---

本说明书描述的是当前代码事实。接口、数据结构或前端技术方案变更后，应在同一提交中同步更新本文档。
