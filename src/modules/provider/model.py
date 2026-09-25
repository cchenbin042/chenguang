
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from src.core.base_model import BaseModel


# 模型提供商
class ModelProvider(BaseModel):
    """模型提供商"""
    __tablename__ = "model_providers"

    name: Mapped[str] = mapped_column(String(255), nullable=False, comment="模型提供商名称")
    type: Mapped[str] = mapped_column(String(100), comment="模型供应商：openai/anthropic/aliyun/azure/local/custom")
    status: Mapped[str] = mapped_column(String(50),default="disconnected", comment="连接状态: connected/disconnected/error")
    endpoint: Mapped[str] = mapped_column(String(500), comment="API端点地址")
    api_key: Mapped[str | None] = mapped_column(Text, nullable=True, comment="API密钥（加密存储）")
    description: Mapped[str | None] = mapped_column(
        String(500), nullable=True, comment="供应商描述"
    )