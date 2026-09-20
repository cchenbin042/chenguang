# 定义查询数据库的dao层
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_repository import BaseRepository
from src.modules.permission.model import Permission


class PermissionRepository(BaseRepository[Permission]):
    def __init__(self, db:AsyncSession): # 获取数据库的连接
        super().__init__(Permission,db)


    async def get_by_code(self,code:str) -> Permission:
        """
        根据权限编码获取权限
        """
        statement = select(Permission).where(Permission.code == code)
        result = await self.db.execute(statement)
        return result.scalars().first()