# Service:
# 是业务逻辑的核心。它负责参数校验、业务规则、调用 Repository、组装返回数据。API 层不应包含业务逻辑，
# 只做"接收请求 → 调用 Service → 封装响应"。
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_schema import PageResult
from src.core.deps import PageParams
from src.core.exceptions import BizException
from src.modules.provider.model import ModelProvider
from src.modules.provider.repository import ProviderRepository
from src.modules.provider.schema import ProviderCreate, ProviderRead, ProviderUpdate


class ProviderService:

    def __init__(self,db:AsyncSession):
        """实例化方法"""

        self.provider_repo = ProviderRepository(db)

    async def create_provider(self,provider:ProviderCreate) -> ModelProvider:
        """创建模型提供商"""
        # 1、查询当前提供商是否存在
        provider_exist = await self.provider_repo.get_by_name(provider.name)
        if provider_exist:
            raise BizException(code=4001,message=f"模型{provider.name}已存在")
        # 2、创建ORM对象
        provider_model = ModelProvider(
            name=provider.name,
            type=provider.type,
            endpoint=provider.endpoint,
            api_key=provider.api_key,
            description=provider.description
        )
        # 3、保存到数据库
        return await self.provider_repo.create(provider_model)

    async def get_provider(self,provider_id:int) -> ModelProvider:
        """获取模型提供商详情"""
        provider = await self.provider_repo.get_by_id(provider_id)
        if not provider:
            raise BizException(code=4002,message=f"模型提供商不存在")

        return provider

    async def update_provider(self,provider_id:int,data:ProviderUpdate) -> ModelProvider:
        """更新模型提供商"""
        provider_db = await self.provider_repo.get_by_id(provider_id)
        # 只更新非 None 的字段
        if data.name is not None:
            provider_db.name = data.name
        if data.type is not None:
            provider_db.type = data.type
        if data.endpoint is not None:
            provider_db.endpoint = data.endpoint
        if data.api_key is not None:
            provider_db.api_key = data.api_key
        if data.description is not None:
            provider_db.description = data.description

        return await self.provider_repo.update(provider_db)

    async def delete_provider(self,provider_id:int) -> ModelProvider:
        """删除模型提供商"""
        provider = await self.provider_repo.get_by_id(provider_id)
        if not provider:
            raise BizException(code=4003,message=f"模型提供商不存在")
        await self.provider_repo.delete(provider)
        return provider


    async def list_providers(self,params:PageParams) -> PageResult:
        """获取模型提供商列表"""
        items,total = await self.provider_repo.search_page(offset=params.offset,
                                                    limit=params.page_size,
                                                    keyword=params.keyword)

        return PageResult(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size
        )

    async def test_connection(self, provider_id: int) -> dict:
        """测试供应商连接"""
        provider = await self.get_provider(provider_id)

        # TODO: 实际实现时，根据 provider.type 调用对应的 SDK 测试连接
        # 这里先返回模拟结果，后续可替换为真实逻辑
        try:
            # 示例：检查 endpoint 是否可达
            # async with httpx.AsyncClient() as client:
            #     resp = await client.get(provider.endpoint, timeout=10)
            provider.status = "connected"
            await self.provider_repo.update(provider)
            return {"success": True, "message": "连接成功", "latency_ms": 128}
        except Exception as e:
            provider.status = "error"
            await self.provider_repo.update(provider)
            return {"success": False, "message": f"连接失败: {str(e)}"}