# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

晨光 Agent 平台后端：FastAPI + SQLAlchemy 2.0（全异步）+ MySQL + Redis + Alembic。
分层架构：`api`（路由）→ `service`（业务）→ `repository`（数据访问）→ `model`（ORM）。
代码注释、日志、提交信息统一用中文。项目处于早期搭建阶段。

## 常用命令

所有命令都在**仓库根目录**执行 —— `.env`（`env_file=".env"`）和 `logs/` 都按当前工作目录解析，换目录会导致配置读不到。

```bash
pip install -r requirements.txt        # conda 环境 chenguang，解释器路径见 pyrefly.toml
uvicorn src.main:app --reload          # 启动开发服务器

python -m pytest                                        # 全量
python -m pytest src/test/test_jwt.py                   # 单文件
python -m pytest src/test/test_jwt.py::test_encode_jwt  # 单用例

alembic revision --autogenerate -m "add xxx 表"   # 生成后必须人工检查
alembic upgrade head
alembic current
alembic check      # 比对模型与库结构，输出 No new upgrade operations detected 即一致
alembic downgrade -1

docker compose up -d                   # 本地依赖服务 MySQL(3306) / Redis(6379) / MinIO(9000,9001)
```

测试没有 `pytest.ini` / `pyproject.toml`：靠 `src/test/__init__.py` 让 pytest 把仓库根加进 `sys.path`，所以测试里能直接 `from src.xxx import ...`。现有测试只覆盖 jwt / password 等工具函数，没有 API 级测试。

## 模块现状

| 模块 | 状态 |
|---|---|
| `user` | 已接线：`POST /api/v1/users`、`GET /api/v1/users`、`GET /api/v1/users/{user_id}` |
| `captcha` | **孤儿**：`api/schema/service` 都在，但 `main.py` 未注册、无人引用 |
| `auth` | **孤儿**：只剩 `schema/service`，`api.py` 已删除，登录没有 HTTP 入口 |
| `role` / `permission` | 只有 `model.py`，表已由 alembic 建立 |

`/api/v1/auth/login` 当前不存在，而 `jwt_utils.py` 里的 `OAuth2PasswordBearer(tokenUrl=...)` 仍指向它（只影响 Swagger 的 Authorize 按钮）。原本的 `core/deps.py`（`get_current_user` 依赖）也已删除，且从未进入提交历史。

## 架构

```
src/
  main.py                  create_app()：注册中间件 / 异常处理 / 路由；lifespan 负责释放引擎
  core/                    config base_model base_repository base_schema exceptions logger
  infra/                   database.py(异步引擎与会话) redis_cache.py(连接池单例)
  middlewares/logging.py   请求耗时日志（已在 create_app 里注册）
  modules/<feature>/       model.py schema.py repository.py service.py api.py
  utils/                   jwt_utils.py password_utils.py
```

### 请求与响应约定

- 每个模块的 `api.py` 导出 `router = APIRouter(prefix="/xxx", tags=[...])`，在 `create_app()` 里用 `app.include_router(router, prefix="/api/v1")` 挂载。**两处 prefix 会叠加**：router 自己写 `/captcha`、挂载时又写 `/api/v1/captcha`，最终路径就是 `/api/v1/captcha/captcha`。
- 统一响应 `ResponseSchema[T]` = `{code, message, data}`；出参用 `XxxRead` + `model_validate()`（需要 `from_attributes=True`）。
- 业务错误 `raise BizException(code=..., message=...)` → HTTP 200 + body 里的 `code`；其他异常 → HTTP 500 + 通用文案，细节只写日志（`src/core/exceptions.py`）。

### 依赖注入

- `get_async_session` 是 async generator 依赖：退出时自动 `commit`，抛异常自动 `rollback`（`src/infra/database.py`）。**service / repository 不要自己 commit。**
- 必须传函数对象本身：`Depends(get_async_session)`。加括号会传进 async generator 对象，FastAPI 直接报 `TypeError: <async_generator object ...> is not a callable object`。
- Redis 客户端是模块级单例（`src/infra/redis_cache.py`），通过 `get_redis_client` 注入。
- service 用工厂函数提供：`def get_user_service(db = Depends(get_async_session)) -> UserService`，路由签名写 `svc: UserService = Depends(get_user_service)`。

### 配置

- `Settings`（`src/core/config.py`）用 `lru_cache` 做单例；`DATABASE_URL` 是拼出来的 property，密码做过 `quote_plus` 转义。
- **pydantic-settings 默认 `extra="forbid"`：`.env` 里只要出现 `Settings` 未声明的键，`get_settings()` 就抛 `ValidationError`，应用直接起不来。** 增删配置字段时必须同步 `.env` 与 `.env.example`。
- `.env` 里的 `DB_HOST` / `REDIS_HOST` 指向**远程服务器**，不是 `docker-compose.yaml` 那套本地容器（端口相同，只有 host 不同）。执行任何 DDL 之前先确认目标机器。

### 数据层与迁移

- model 继承 `src/core/base_model.BaseModel`，自带 `BigInteger id` + `created_at` / `updated_at`（由数据库 `server_default` / `onupdate` 维护）。多对多用 `Table(..., Base.metadata)` 定义中间表，关系用 `lazy="selectin"` 预加载。
- `BaseRepository[T]` 提供 `get_by_id` / `get_all` / `create` / `update` / `delete`，只 `flush` 不 `commit`；模块自己的 repository 继承它再补查询方法。
- **新增模块后必须在 `alembic/env.py` 里显式 import 该 model**，否则 `--autogenerate` 看不到表。当前导入的是 user / permission / role。
- `alembic/env.py` 的 URL 取自 `Settings.DATABASE_URL`（不是 `alembic.ini`），并且做了 `replace("%", "%%")` —— configparser 会把 `%` 当插值语法，删掉这行会让 URL 编码过的密码报错。
- 迁移是线性链，head 为 `c0b10f179f6c`。
- **给已有数据的表加 `NOT NULL` 列时，autogenerate 的产物会失败（错误码 1292）**：MySQL 要用隐式默认值回填存量行，datetime 的隐式默认 `'0000-00-00'` 被 `NO_ZERO_DATE` 拒绝（整型的隐式默认是 `0`，能侥幸通过）。修法：先 `server_default=sa.text('now()')` 回填，再 `alter_column(..., server_default=None)` 去掉库级默认值。
- **MySQL 的 DDL 不支持事务**（alembic 日志里的 `Will assume non-transactional DDL`）：迁移中途失败会留下"前面几条 DDL 已生效、版本号没推进"的半迁移状态，重跑会撞 `1050 Table already exists`。修法是清掉已建对象后重跑，或 `alembic stamp`。

### 认证

- JWT HS256，30 分钟过期，payload 含 `sub`（user_id 字符串）/ `username` / `email`；签名密钥从 `Settings.JWT_SECRET_KEY` 读取，缺失时明确抛错（`src/utils/jwt_utils.py`）。
- 密码用 bcrypt 哈希与校验（`src/utils/password_utils.py`）。
- 验证码存 Redis，5 分钟过期，key 前缀 `captcha:`。**已知 bug：`create_captcha` 返回的 `key` 已经带前缀，`verify_captcha` 又拼了一次前缀**，除非前端自己剥掉前缀，否则校验永远失败（`src/modules/captcha/service.py`）。

### 导入约定（重要）

统一使用 `from src.xxx import ...` 绝对导入，**导入根是仓库根目录**（`pyrefly.toml` 里 `search-path = ["."]` 就是为此）。
不要写 `from core.xxx` / `from modules.xxx` 这类裸导入：从仓库根导入时找不到 `core`；只把 `src/` 放进 `sys.path` 又会把同一模块加载成两份（`src.modules.user.model` 与 `modules.user.model`）并共用同一个 `Base.metadata`，触发 `Table 'users' is already defined for this MetaData instance`。

## 安全

远程仓库是**公开仓库**。提交前确认 `.env` 未被跟踪，并用 `git grep --cached -nE "(PASSWORD|SECRET|TOKEN|KEY)="` 扫一遍暂存内容 —— 只应命中 `.env.example` 里的占位符。密钥一律走 `Settings` + `.env`，`.env.example` 只放占位符。
