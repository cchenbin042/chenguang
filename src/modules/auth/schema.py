# 用户登录模块请求参数
from pydantic import BaseModel, Field

class AuthLoginRequest(BaseModel):
    username: str = Field(description="用户名")
    password: str = Field(description="密码")
    captcha_code: str = Field(description="验证码")
    captcha_key: str = Field(description="验证码key")


# 用户登录模块响应参数

class AuthLoginResponse(BaseModel):
    access_token: str = Field(description="登录token")
    token_type: str = "bearer"