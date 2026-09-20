# 接口层
from fastapi import APIRouter
from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.infra.database import get_async_session
from src.modules.permission.service import PermissionService
from src.core.base_schema import ResponseSchema
from src.modules.permission.schema import PermissionRead

router = APIRouter(prefix="/permissions", tags=["权限管理"])

# 定义依赖注入函数
def get_permission_service(db:AsyncSession = Depends(get_async_session)) -> PermissionService:
    return PermissionService(db=db)

@router.get("/{permission_id}",response_model=ResponseSchema[PermissionRead],)
async def get_permission(permission_id:int,
                         svc:PermissionService = Depends(get_permission_service)):
    """获取权限"""
    permission = await svc.get_permission(permission_id)
    data = PermissionRead.model_validate(permission)
    return ResponseSchema[PermissionRead](data=data)


