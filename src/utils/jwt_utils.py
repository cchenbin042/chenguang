from datetime import datetime, timedelta, timezone
import jwt

from src.core.config import get_settings

ALGORITHM = "HS256"

# 配置OAuth2 Bearer 模式
from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def _get_secret_key() -> str:
    """从配置读取 JWT 签名密钥；缺失时直接报错，避免用空密钥签发 token"""
    secret_key = get_settings().JWT_SECRET_KEY
    if not secret_key:
        raise RuntimeError("JWT_SECRET_KEY 未配置，请在 .env 中设置")
    return secret_key


# 创建JWT token
def encode_jwt(payload: dict) -> str:
    payload_copy = payload.copy()
    # 更新过期时间为30分钟后。注意使用 utc 时间
    payload_copy["exp"] = datetime.now(timezone.utc) + timedelta(minutes=30)
    payload_copy["iat"] = datetime.now(timezone.utc)

    token = jwt.encode(payload_copy, key=_get_secret_key(), algorithm=ALGORITHM)
    return token
# 校验JWT token，也就是解码token，获取payload中的信息
def verify_jwt(token: str) -> dict:
    try:
        payload = jwt.decode(token, key=_get_secret_key(), algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception("token已经过期")
    except jwt.InvalidTokenError:
        raise Exception("非法token")
    except Exception as e:
        raise Exception(f"token校验失败: {str(e)}")
