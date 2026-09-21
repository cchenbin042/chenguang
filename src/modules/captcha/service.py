from redis.asyncio import Redis
import string
import random
import uuid
import base64
from captcha.image import ImageCaptcha
from src.modules.captcha.schema import CaptchaResponse,CaptchaVerifyRequest
from src.core.exceptions import BizException
from src.core.logger import logger

class CaptchaService:

    # 验证码的过期时间
    CAPTCHA_EXPIRE = 60 * 5  # 5分钟过期
   # 验证码的key前缀
    CAPTCHA_KEY_PREFIX = "captcha:"

    def __init__(self,redis:Redis):
        self.redis = redis
    # 生成4位的随机验证码
    def _random_code(self, length: int = 4) -> str:
        """生成随机字母+数字验证码"""
        chars = string.ascii_uppercase + string.digits
        # 去掉容易混淆的字符
        chars = chars.replace("O", "").replace("0", "").replace("I", "").replace("1", "")
        return "".join(random.choices(chars, k=length))


    async def create_captcha(self) -> CaptchaResponse:
        """
        创建验证码
        """
        # 1、获取随机验证码
        code = self._random_code()

        # 2、生成验证码的唯一id
        captcha_id = str(uuid.uuid4())

        # 3、生成验证码的key
        key: str = f"{self.CAPTCHA_KEY_PREFIX}{captcha_id}"

        # 4、将验证码存储到redis中
        await self.redis.set(key,code,ex=self.CAPTCHA_EXPIRE)
        
        # 5、生成验证码的图片
         # 生成图片
        image_captcha = ImageCaptcha(width=108, height=36)
        image_data = image_captcha.generate(code)
        b64 = base64.b64encode(image_data.read()).decode()
        return CaptchaResponse(key=key,image=f"data:image/png;base64,{b64}")

    def _build_key(self, raw_key: str) -> str:
        """
        拼出 Redis 里的真实 key。
        create_captcha 返回的 key 已经带前缀，调用方大概率原样回传，
        所以先剥掉可能已存在的前缀再拼一次，避免出现 captcha:captcha:xxx
        """
        captcha_id = raw_key.removeprefix(self.CAPTCHA_KEY_PREFIX)
        return f"{self.CAPTCHA_KEY_PREFIX}{captcha_id}"

    async def verify_captcha(self,captcha: CaptchaVerifyRequest) -> bool:
        """
        校验验证码
        """
        # 1、从验证码的key中获取验证码
        key: str = self._build_key(captcha.key)
        code: str = await self.redis.get(key)
        logger.info(f"验证码key: {key}")

        if code is None:
            raise BizException(code=1001,message="验证码不存在或已过期")

        # 2、验证码是一次性的：校验前就删掉，避免输错后同一个key还能被反复试
        await self.redis.delete(key)

        # 3、校验验证码是否正确
        if code.lower() != captcha.code.lower():
            raise BizException(code=1002,message="验证码错误")
        return True
