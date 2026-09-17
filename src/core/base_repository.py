# 基础的通用数据库操作
from typing import TypeVar, Generic, Type, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.base_model import BaseModel

# 定义类型变量，用于表示任意继承自 BaseModel 的类
T = TypeVar("T", bound=BaseModel)


class BaseRepository(Generic[T]):
    def __init__(self, model: Type[T], db: AsyncSession):
        self.model = model
        self.db = db

    # 根据 ID 获取对象
    async def get_by_id(self, id: int) -> T | None:
        return await self.db.get(self.model, id)

    # 获取所有对象
    async def get_all(self, offset: int = 0, limit: int = 100) -> Sequence[T]:
        stmt = select(self.model).offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    # 创建对象
    async def create(self, obj: T) -> T:
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj
    
    # 更新对象
    async def update(self, obj: T) -> T:
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    # 删除对象
    async def delete(self, obj: T) -> None:
        await self.db.delete(obj)
        await self.db.flush()