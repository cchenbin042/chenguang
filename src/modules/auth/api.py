# 用户登录接口
from fastapi import APIRouter
from fastapi.params import Depends
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_schema import ResponseSchema
from src.infra.database import get_async_session
from src.infra.redis_cache import get_redis_client
from src.modules.auth.schema import AuthLoginResponse, AuthLoginRequest

router = APIRouter(prefix="/auth",tags=["用户认证"])
from src.modules.auth.service import AuthService

def get_auth_service(db: AsyncSession = Depends(get_async_session),
                     redis:Redis = Depends(get_redis_client)) -> AuthService:
    return AuthService(db, redis)

@router.post("/login",response_model=ResponseSchema[AuthLoginResponse], summary="用户登录")
async def login(data: AuthLoginRequest,
                svc:AuthService = Depends(get_auth_service)):
    token = await svc.login(data)
    return ResponseSchema(data=token)


