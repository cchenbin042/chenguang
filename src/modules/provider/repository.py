# Repository 封装所有数据库操作。继承 BaseRepository[T]
# 自动获得 get_by_id、get_all、create、update、delete、delete_by_id 六个基础方法。只需要编写本模块特有的查询
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.base_repository import BaseRepository
from modules.provider.model import ModelProvider
from loguru import logger

class ProviderRepository(BaseRepository[ModelProvider]):
    """搜索字段：按名称或类型搜索"""
    SEARCH_FIELDS = ["name", "type"]

    def __init__(self, db: AsyncSession):
        """实例化方法"""
        super().__init__(ModelProvider, db)

    async def get_by_name(self, name: str) -> ModelProvider | None:
        """按名称获取模型提供商"""
        logger.info(f"get_by_name: {name}")
        stmt = select(ModelProvider).where(ModelProvider.name == name)
        result = await self.db.execute(stmt)
        logger.info(f"get_by_name: {result}")

        return result.scalar_one_or_none() # 返回单个对象，如果不存在则返回 None

    async def search_page(self,offset:int,
                          limit:int,
                          keyword:str|None) -> tuple[list[ModelProvider],int]:
         """分页 + 搜索（调用 BaseRepository.get_page）"""
         return await self.get_page(offset = offset,
                                    limit=limit,
                                    keyword=keyword,
                                    search_fields=self.SEARCH_FIELDS)

