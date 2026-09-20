# 定义验证码相关的请求和响应模型 这个主要是给前端返回的模型
from pydantic import BaseModel

class CaptchaResponse(BaseModel):
    """
    验证码请求模型
    """
    key: str
    image: str


# 检验验证码的请求model
class CaptchaVerifyRequest(BaseModel):
    """
    验证码检验请求模型
    """
    key: str
    code: str
    
    