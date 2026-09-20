# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

晨光 Agent 平台后端：FastAPI + SQLAlchemy 2.0（全异步）+ MySQL 8.4 + Redis + Alembic。
分层架构：`api`（路由）→ `service`（业务）→ `repository`（数据访问）→ `model`（ORM）。
代码注释、日志、提交信息统一用中文。

项目处于早期搭建阶段：目前只有 user / role / permission / auth / captcha 模块，没有 README、没有 lint / typecheck 配置。

## 常用命令

所有命令都在**仓库根目录**执行 —— `.env`（`env_file=".env"`）和 `logs/` 都是相对当前工作目录解析的，换目录会导致配置读不到。

```bash
# 依赖（conda 环境 chenguang，解释器路径见 pyrefly.toml）
pip install -r requirements.txt

# 启动开发服务器（预期命令，目前被阻塞，见下方「已知阻塞」）
uvicorn src.main:app --reload

# 测试：全量 / 单文件 / 单用例
python -m pytest
python -m pytest src/test/test_jwt.py
python -m pytest src/test/test_jwt.py::test_encode_jwt

# 数据库迁移
alembic revision --autogenerate -m "add xxx 表"   # 生成后必须人工检查
alembic upgrade head
alembic history --verbose
alembic downgrade -1

# 本地依赖服务：MySQL(3306) / Redis(6379) / MinIO(9000, 9001)
docker compose up -d
```

测试没有 `pytest.ini` / `pyproject.toml`：靠 `src/test/__init__.py` 让 pytest 把仓库根加进 `sys.path`，所以测试里能直接写 `from src.xxx import ...`。现有测试只覆盖 jwt / password / 存储层无关的工具函数，没有 API 级测试。

## 架构

### 目录

```
src/
  main.py                  create_app() 组装 app、注册异常处理与路由、lifespan 管理引擎释放
  core/                    跨模块共享：config(设置) base_model(ORM 基类) base_repository base_schema
                           deps(公共依赖) exceptions logger
  infra/                   database.py(异步引擎/会话) redis_cache.py(连接池单例)
  middlewares/logging.py   请求耗时日志中间件
  modules/<feature>/       model.py schema.py repository.py service.py api.py
  utils/                   jwt_utils.py password_utils.py
```

### 请求生命周期与响应约定

- 每个模块的 `api.py` 导出 `router = APIRouter(prefix="/xxx", tags=[...])`，在 `src/main.py` 的 `create_app()` 里用 `app.include_router(router, prefix="/api/v1")` 挂载。
- 所有接口返回统一包装 `ResponseSchema[T]` = `{code, message, data}`（`src/core/base_schema.py`），HTTP 状态码恒为 200。
- 业务错误 `raise BizException(code=..., message=...)` → 返回 HTTP 200 + body 里的 `code`；其他异常 → HTTP 500 + 通用文案，细节只写日志（`src/core/exceptions.py`）。
- 出参用 `XxxRead` + `model_validate(obj)`；`UserRead` 需要 `from_attributes=True`。

### 依赖注入

- `get_async_session` 是 async generator 依赖：业务代码 `yield` 完之后自动 `commit`，抛异常自动 `rollback`（`src/infra/database.py`）。**service / repository 不要自己 commit。**
- 依赖必须传函数对象本身：`Depends(get_async_session)`。加括号会传进一个 async generator 对象，FastAPI 直接报 `TypeError: <async_generator object ...> is not a callable object`。
- Redis 客户端是模块级单例（`src/infra/redis_cache.py`），通过 `get_redis_client` 注入。
- service 用工厂函数提供，例如 `def get_user_service(db = Depends(get_async_session)) -> UserService`，路由签名写 `svc: UserService = Depends(get_user_service)`。

### 数据层

- 所有 model 继承 `src/core/base_model.BaseModel`，自带 `BigInteger id` + `created_at` / `updated_at`（由数据库 `server_default` / `onupdate` 维护）。多对多用 `Table(... , Base.metadata)` 定义中间表，关系用 `lazy="selectin"` 预加载。
- `BaseRepository[T]` 提供 `get_by_id` / `get_all` / `create` / `update` / `delete`，只 `flush` 不 `commit`；模块自己的 repository 继承它再补查询方法。
- 新增模块后**必须**在 `alembic/env.py` 里显式 `import` 该 model，否则 `--autogenerate` 看不到表。当前导入的是 user / permission / role 三个。
- `alembic/env.py` 的 URL 取自 `Settings.DATABASE_URL`（不是 `alembic.ini`），并且做了 `replace("%", "%%")` —— configparser 会把 `%` 当插值语法，删掉这行会让 URL 编码过的密码报错。
- 迁移是线性链，head 为 `c0b10f179f6c`。

### 认证

- JWT HS256，30 分钟过期，payload 含 `sub`（user_id 的字符串）/ `username` / `email`（`src/utils/jwt_utils.py`）。
- `core/deps.py` 的 `get_current_user` 解析 token → 查库 → 校验 `is_active`，失败统一抛 `BizException(401)`。
- 登录流程（`src/modules/auth/service.py`）：校验验证码 → 查用户 → `verify_password` → 签发 token → 更新 `last_login`。
- 验证码存 Redis，5 分钟过期，key 前缀 `captcha:`（`src/modules/captcha/service.py`）。

### 导入约定（重要）

统一使用 `from src.xxx import ...` 绝对导入，**导入根是仓库根目录**（`pyrefly.toml` 里 `search-path = ["."]` 就是为此）。
不要写 `from core.xxx` / `from modules.xxx` / `from utils.xxx` 这类裸导入：从仓库根导入时找不到 `core`，只把 `src/` 放进 `sys.path` 又会把 `src.modules.user.model` 和 `modules.user.model` 加载成两个模块，导致 `Table 'users' is already defined for this MetaData instance`。

## 已知阻塞 / 待修

启动链路目前是断的，改动相关文件时值得顺手修掉：

1. **裸导入**（会导致 `ModuleNotFoundError: No module named 'core'`）：`src/core/deps.py`、`src/modules/user/api.py`、`src/modules/auth/api.py`、`src/modules/auth/service.py` —— 改成 `src.` 前缀即可。
2. **`Depends` 误加括号**：`src/core/deps.py`（`Depends(get_async_session())`）、`src/modules/auth/api.py`（`Depends(get_redis_client())`）。
3. **路由前缀重复**：`src/main.py` 把 captcha / auth 两个 router 都挂在 `/api/v1/captcha` 下，实际路径是 `/api/v1/captcha/captcha` 和 `/api/v1/captcha/auth/login`，与 `jwt_utils.py` 里 `OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")` 不一致。
4. **验证码 key 双前缀**：`create_captcha` 返回的 `key` 已含 `captcha:`，`verify_captcha` 又拼一次前缀去查 Redis，除非前端自己剥掉前缀，否则校验永远失败（`src/modules/captcha/service.py`）。

安全：JWT `SECRET_KEY` 硬编码在 `src/utils/jwt_utils.py` 顶部，`.env` / `.env.example` 里都没有这一项。改动认证相关代码时应把它挪到 `Settings`，并同步 `.env.example`（`.env` 已被 gitignore）。
