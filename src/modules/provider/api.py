from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.base_schema import ResponseSchema, PageResult
from core.deps import PageParams
from infra.database import get_async_session
from loguru import logger

from modules.provider.schema import ProviderRead, ProviderCreate, ProviderUpdate
from modules.provider.servcie import ProviderService

router = APIRouter(prefix="/provider",tags=["模型提供商管理"])

# 依赖导入
def get_provider_service(db:AsyncSession = Depends(get_async_session)):

    return ProviderService(db)



@router.post("",response_model=ResponseSchema[ProviderRead],summary="创建模型提供商")
async def create_provider(data:ProviderCreate,
                          svc:ProviderService = Depends(get_provider_service)
):
    """创建模型提供商"""

    data = await svc.create_provider(data)
    return ResponseSchema(data=ProviderRead.model_validate(data))

@router.get("",response_model=ResponseSchema[PageResult[ProviderRead]],summary="获取模型提供商列表")
async def list_providers(params:PageParams = Depends(),
                          svc:ProviderService = Depends(get_provider_service)
):
    """获取模型提供商列表"""
    page_result = await svc.list_providers(params)
    page_result.items = [ProviderRead.model_validate(u) for u in page_result.items]
    return ResponseSchema(data=page_result)

@router.get("/{provider_id}",response_model=ResponseSchema[ProviderRead],summary="获取模型提供商详情")
async def get_provider(provider_id:int,
                        svc:ProviderService = Depends(get_provider_service)
):
    """获取模型提供商详情"""
    provider = await svc.get_provider(provider_id)
    return ResponseSchema(data=ProviderRead.model_validate(provider))

@router.put("/{provider_id}",response_model=ResponseSchema[ProviderRead],summary="更新模型提供商")
async def update_provider(provider_id:int,
                          data:ProviderUpdate,
                          svc:ProviderService = Depends(get_provider_service)
):
    """更新模型提供商"""
    provider = await svc.update_provider(provider_id,data)
    return ResponseSchema(data=ProviderRead.model_validate(provider))

@router.delete("/{provider_id}",response_model=ResponseSchema,summary="删除模型提供商")
async def delete_provider(provider_id:int,
                          svc:ProviderService = Depends(get_provider_service)
):
    """删除模型提供商"""
    await svc.delete_provider(provider_id)
    return ResponseSchema(message="删除成功")

@router.post("/{provider_id}/test", response_model=ResponseSchema[dict], summary="测试连接")
async def test_connection(
    provider_id: int,
    svc: ProviderService = Depends(get_provider_service),
):
    result = await svc.test_connection(provider_id)
    return ResponseSchema(data=result)