from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import BizException
from src.modules.permission.model import Permission
from src.modules.permission.schema import PermissionCreate,PermissionUpdate
from src.modules.permission.repository import PermissionRepository


class PermissionService:
    # 构造方法
    def __init__(self, db:AsyncSession):
        self.repo = PermissionRepository(db)

    async def create_permission(self,permission:PermissionCreate) -> Permission:
        # 1、检查权限编码是否存在
        if await self.repo.get_by_code(permission.code):
            raise BizException(code=4001,message="权限编码已存在")

        # 2、创建权限
        permission = Permission(
            code = permission.code,
            name = permission.name,
            description = permission.description
        )
        return await self.repo.create(permission)

    async def get_permission(self,permission_id:int) -> Permission:
        """通过权限ID获取权限"""
        permission = await self.repo.get_by_id(permission_id)
        if not permission:
            raise BizException(code=4002,message="权限不存在")
        return permission

    async def list_permissions(self,offset:int = 0,limit:int = 100) -> list[Permission]:
        """获取权限列表"""
        return await self.repo.get_all(offset=offset,limit=limit)

    async def update_permission(self,permission_id:int,permission:PermissionUpdate) -> Permission:
        """更新权限"""
        # 1、检查权限是否存在
        permission_db = await self.repo.get_by_id(permission_id)
        if not permission_db:
            raise BizException(code=4003,message="权限不存在")

        if permission.name:
            permission_db.name = permission.name
        if permission.description:
            permission_db.description = permission.description

        return await self.repo.update(permission_db)

    async def delete_permission(self,permission_id:int) -> Permission:
        """删除权限，返回被删除的权限对象"""
        permission = await self.repo.get_by_id(permission_id)
        if not permission:
            raise BizException(code=4004,message="权限不存在")
        await self.repo.delete(permission)
        return permission
