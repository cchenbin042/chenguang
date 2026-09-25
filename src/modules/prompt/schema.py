# 定义API接口的输入输出数据结构
# Create 用于创建请求
# Update 用于更新请求（字段可选）
# Read 用于响应输出。
from datetime import datetime

from pydantic import BaseModel

class PromptVariableSchema(BaseModel):
    """Prompt 变量定义"""
    name: str
    type: str = "string"       # string / number / boolean / text
    description: str = ""
    default_value: str | None = None
    required: bool = True


class PromptCreate(BaseModel):
    name: str
    description: str | None = None
    category: str = "general"
    tags: list[str] = []
    content: str
    variables: list[PromptVariableSchema] = []


class PromptUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    content: str | None = None
    variables: list[PromptVariableSchema] | None = None


class PromptRead(BaseModel):
    id: int
    name: str
    description: str | None
    category: str
    tags: list[str]
    content: str
    variables: list[PromptVariableSchema]
    version: str
    status: str
    created_by: str | None

    model_config = {"from_attributes": True}


class PromptVersionRead(BaseModel):
    id: int
    prompt_id: int
    version: str
    content: str
    changelog: str | None
    is_current: bool
    published_by: str | None
    published_at: datetime | None

    model_config = {"from_attributes": True}


class PublishRequest(BaseModel):
    """发布请求"""
    changelog: str = ""


class RollbackRequest(BaseModel):
    """回滚请求"""
    version_id: int    # 要回滚到的版本 ID