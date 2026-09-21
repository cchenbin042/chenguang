# 接口层
from fastapi import APIRouter
from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import defer

from src.infra.database import get_async_session
from src.modules.permission.service import PermissionService
from src.core.base_schema import ResponseSchema
from src.modules.permission.schema import PermissionRead, PermissionCreate, PermissionUpdate

router = APIRouter(prefix="/permissions", tags=["权限管理"])

# 定义依赖注入函数
def get_permission_service(db:AsyncSession = Depends(get_async_session)) -> PermissionService:
    return PermissionService(db=db)

@router.get("/{permission_id}",response_model=ResponseSchema[PermissionRead], summary="获取权限")
async def get_permission(permission_id:int,
                         svc:PermissionService = Depends(get_permission_service)):
    """获取权限"""
    permission = await svc.get_permission(permission_id)
    data = PermissionRead.model_validate(permission)
    return ResponseSchema[PermissionRead](data=data)


@router.get("/",response_model=ResponseSchema[list[PermissionRead]],summary="获取权限列表")
async def get_permissions(svc:PermissionService = Depends(get_permission_service)):
    """获取权限列表"""
    permissions = await svc.list_permissions()
    data = [PermissionRead.model_validate(permission) for permission in permissions]  # 行内写法，列表推导式
    return ResponseSchema[list[PermissionRead]](data=data)


@router.post("",response_model=ResponseSchema[PermissionRead],summary="创建权限")
async def create_permission(data:PermissionCreate,
                            svc:PermissionService = Depends(get_permission_service)):
    """创建权限"""
    permission = await svc.create_permission(data)
    data = PermissionRead.model_validate(permission)
    return ResponseSchema[PermissionRead](data=data)
@router.put("/{permission_id}",response_model=ResponseSchema[PermissionRead],summary="更新权限")
async def update_permission(permission_id:int,  permission:PermissionUpdate,
                           svc:PermissionService = Depends(get_permission_service)):
    """更新权限"""
    permission = await svc.update_permission(permission_id, permission)
    data = PermissionRead.model_validate(permission)
    return ResponseSchema[PermissionRead](data=data)

@router.delete("/{permission_id}",response_model=ResponseSchema[PermissionRead],summary="删除权限")
async def delete_permission(permission_id:int,
                           svc:PermissionService = Depends(get_permission_service)):
    """删除权限"""
    permission = await svc.delete_permission(permission_id)
    data = PermissionRead.model_validate(permission)
    return ResponseSchema[PermissionRead](data=data)