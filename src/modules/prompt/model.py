# 提示词的数据库模型
from datetime import datetime

from sqlalchemy import JSON, String, Text, BigInteger, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.base_model import BaseModel


class Prompt(BaseModel):
    """提示词的数据库模型"""
    __tablename__ = "prompts"

    name: Mapped[str] = mapped_column(String(200),comment="提示词名称")
    description:Mapped[str | None] = mapped_column(String(500),nullable=True,comment="提示词描述")
    category:Mapped[str] = mapped_column(String(100),default="general", comment="提示词分类")
    tags:Mapped[dict | None] = mapped_column(JSON,nullable=True,comment="标签列表，JSON 数组")
    content:Mapped[str] = mapped_column(Text,comment="提示词内容")
    variables:Mapped[dict | None] = mapped_column(JSON,nullable=True,comment="变量定义，JSON 数组")
    version:Mapped[str] = mapped_column(String(50),default="1.0.0",comment="版本号")
    status:Mapped[str] = mapped_column(String(50),default="draft",comment="状态: draft/published")
    created_by:Mapped[str|None] = mapped_column(String(100), nullable=True, comment="创建者")

    # 关联版本列表
    versions:Mapped[list["PromptVersion"]] = relationship(
        "PromptVersion",back_populates="prompt",
        order_by="PromptVersion.id.desc()",
        lazy="selectin")




class PromptVersion(BaseModel):
    """提示词版本的数据库模型"""
    __tablename__ = "prompt_versions"

    prompt_id:Mapped[int] = mapped_column(BigInteger,ForeignKey("prompts.id",ondelete="CASCADE"),comment="所属提示词 ID")
    version:Mapped[str] = mapped_column(String(50),comment="版本号")
    content: Mapped[str] = mapped_column(Text, comment="该版本的内容快照")
    changelog: Mapped[str | None] = mapped_column(
        String(500), nullable=True, comment="变更说明"
    )
    is_current: Mapped[bool] = mapped_column(
        Boolean, default=False, comment="是否为当前版本"
    )
    published_by: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="发布者"
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, comment="发布时间"
    )

    # 反向关联
    prompt:Mapped[Prompt] = relationship("Prompt",back_populates="versions")

