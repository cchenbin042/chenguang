# 定义查询数据库的dao层
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_repository import BaseRepository
from src.modules.permission.model import Permission


class PermissionRepository(BaseRepository[Permission]):
    SEARCH_FIELDS = ["code","name"]

    def __init__(self, db:AsyncSession): # 获取数据库的连接
        super().__init__(Permission,db)


    async def get_by_code(self,code:str) -> Permission:
        """
        根据权限编码获取权限
        """
        statement = select(Permission).where(Permission.code == code)
        result = await self.db.execute(statement)
        return result.scalars().first()

    async def search_page(self,offset:int,limit:int,keyword:str | None = None) -> tuple[list[Permission],int]:
        return await self.get_page(
            offset=offset,
            limit=limit,
            keyword=keyword,
            search_fields=self.SEARCH_FIELDS
        )