# 抽取的公共依赖

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import BizException
from src.infra.database import get_async_session
from src.modules.user.model import User
from src.utils.jwt_utils import oauth2_scheme, verify_jwt


async def get_current_user(token: str = Depends(oauth2_scheme),
                           db:AsyncSession = Depends(get_async_session)) -> User:
    """从 JWT token 中解析当前登录用户，用于保护接口"""
    # 1、解析JWT token
    try:
        payload = verify_jwt(token)
        user_id = int(payload["sub"])
    except Exception:
        raise BizException(code=401, message="未登录或 token 已过期")
    # 2、查询用户信息
    user = await db.get(User,user_id)
    if not user:
        raise BizException(code=401, message="用户不存在")

    if not user.is_active:
        raise BizException(code=401, message="账号已被禁用")

    return user