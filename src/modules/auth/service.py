from datetime import datetime

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import BizException
from src.modules.auth.schema import AuthLoginRequest, AuthLoginResponse
from src.modules.captcha.schema import CaptchaVerifyRequest
from src.modules.captcha.service import CaptchaService
from src.modules.user.model import User
from src.modules.user.repository import UserRepository
from src.utils.jwt_utils import encode_jwt
from src.utils.password_utils import verify_password
from loguru import logger

class AuthService:
    def __init__(self, db: AsyncSession,redis:Redis):
        self.db =db
        self.captcha_svc = CaptchaService(redis)
        self.user_repo = UserRepository(db)
    
    async def login(self, data: AuthLoginRequest) -> AuthLoginResponse:
        # 1 检验验证码
        # 只记 key，不记验证码明文
        logger.info(f"校验验证码, key: {data.captcha_key}")
        captcha_verify_request = CaptchaVerifyRequest(
            key= data.captcha_key,
            code = data.captcha_code
        )

        verify_result =  await self.captcha_svc.verify_captcha(captcha_verify_request)
        # 2、走到这里说明校验通过。查询用户信息
        user:User = await self.user_repo.get_by_username(data.username)

        if not user:
            raise BizException(code=1002,message="用户不存在！")

        if not user.is_active:
            raise BizException(code=1004, message="用户被禁用了")

        # 3、检验密码
        if not verify_password(data.password,user.hashed_password):
            raise BizException(code=1003,message="密码错误！")


        # 生成JWT token
        payload:dict[str| int] = {"sub":str(user.id),"username":user.username,"email":user.email}
        jwt_token:str = encode_jwt(payload)

        # 修改用户的最后登录时间
        last_login = datetime.now()
        user.last_login = last_login
        await self.user_repo.update(user)

        return AuthLoginResponse(
            access_token = jwt_token,
        )
