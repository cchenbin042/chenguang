from fastapi import FastAPI
from loguru import logger
from src.middlewares.logging import LoggingMiddleware
from src.core.config import get_settings
from src.core.exceptions import register_exception_handlers
from contextlib import asynccontextmanager
from src.core.logger import setup_logger
from src.infra.database import async_engine
from src.modules.user.api import router as user_router


# 定义上下文生命周期感知器
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 应用启动时执行
    setup_logger() # 设置日志组件
    settings = get_settings()
    logger.info("应用启动时执行")
    logger.info(f"数据库连接: {settings.DATABASE_URL}")
    logger.info(f"日志级别: {settings.LOG_LEVEL}")
    logger.info(f"日志目录: {settings.LOG_DIR}")
    yield
    # 应用关闭时执行
    # 关闭数据库连接
    await async_engine.dispose()
    logger.info("应用关闭时执行")


def create_app() -> FastAPI:
    settings = get_settings()
    # 创建 FastAPI 应用实例
    app = FastAPI(title=settings.APP_NAME, 
                  version=settings.APP_VERSION,
                  debug=settings.APP_DEBUG)
    # 注册中间件
    app.add_middleware(LoggingMiddleware)

    # 注册异常处理函数
    register_exception_handlers(app)
    
    # 注册路由
    app.include_router(user_router, prefix="/api/v1")
    return app

app = create_app()

# 健康检查端点
@app.get("/health")
async def root():
    return {"status": "ok"}
