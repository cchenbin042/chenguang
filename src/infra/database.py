from src.core.config import get_settings
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

settings = get_settings()

# 创建异步数据库引擎
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo = settings.APP_DEBUG, # 打印SQL语句
    pool_size=10, # 连接池大小
    max_overflow=20, # 连接池最大溢出连接数
    pool_recycle=3600, # 连接池连接回收时间
    pool_pre_ping=True, # 连接池连接预检查
    
)

# 创建异步会话工厂
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    expire_on_commit=False, # 会话提交后，不自动过期
    class_=AsyncSession,
)

# 定义异步获取数据库的连接
async def get_async_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session # 返回会话供供别人调用使用
            await session.commit()  # 用完后自动提交事务
        except Exception as e:
            await session.rollback()  # 发生异常时，回滚事务
            raise e  # 抛出异常，让调用者处理
