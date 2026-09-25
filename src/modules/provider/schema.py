# 封装前端请求数据格式以及给前端返回的数据类型
# Schema 定义了 API 的输入输出数据结构。Create 用于创建请求，Update 用于更新请求（字段可选），Read 用于响应输出。
from pydantic import BaseModel


class ProviderCreate(BaseModel):
    """模型提供商创建"""
    name:str
    type:str  # openai / anthropic / aliyun / azure / local / custom
    endpoint:str
    api_key:str
    description:str | None = None

class ProviderUpdate(BaseModel):
    """模型提供商更新"""
    name:str | None = None
    type:str |None = None # openai / anthropic / aliyun / azure / local / custom
    endpoint:str
    api_key:str
    description:str | None = None

class ProviderRead(BaseModel):
    """供应商响应"""
    id: int
    name: str
    type: str
    status: str
    endpoint: str
    description: str | None
    model_count: int = 0       # 关联模型数量，Service 层计算后填入

    model_config = {"from_attributes": True}



