# 接口层
from fastapi import APIRouter
from src.core.base_schema import ResponseSchema
from src.modules.captcha.schema import CaptchaResponse,CaptchaVerifyRequest
from src.modules.captcha.service import CaptchaService
from src.infra.redis_cache import get_redis_client
from redis.asyncio import Redis
from fastapi import Depends

router = APIRouter(prefix="/captcha",tags=["验证码"])

def get_captcha_service(redis:Redis = Depends(get_redis_client)) -> CaptchaService:
    return CaptchaService(redis)



# 获取验证码
@router.get("",response_model=ResponseSchema[CaptchaResponse],summary="获取验证码")
async def get_captcha(
    svc: CaptchaService = Depends(get_captcha_service)
) -> ResponseSchema[CaptchaResponse]:
    captcha = await svc.create_captcha()

    return ResponseSchema[CaptchaResponse](data=captcha)

# 校验验证码
@router.post("",response_model=ResponseSchema[bool],summary="校验验证码")
async def verify_captcha(
    captcha: CaptchaVerifyRequest,
    svc: CaptchaService = Depends(get_captcha_service) # 依赖注入验证码service
   ) -> ResponseSchema[bool]:
    is_valid = await svc.verify_captcha(captcha)
    return ResponseSchema(data=is_valid)
