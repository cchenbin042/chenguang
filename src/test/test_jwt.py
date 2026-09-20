import pytest
from src.utils.jwt_utils import encode_jwt, verify_jwt


def test_encode_jwt():
    payload = {"user_id": 1, "username": "Aubin", "is_superuser": True,}
    token = encode_jwt(payload)
    print(f"token: {token}")
    assert token is not None
    # JWT 是裸 token，由 header.payload.signature 三段组成
    assert token.count(".") == 2

    # 解码后应能取回原始 payload，且 exp/iat 由 encode_jwt 自动补全
    decoded = verify_jwt(token)
    assert decoded["user_id"] == 1
    assert decoded["username"] == "Aubin"
    assert decoded["is_superuser"] is True
    assert "exp" in decoded
    assert "iat" in decoded

def test_verify_jwt():
    # 动态生成 token，避免硬编码的 token 过期后测试失效
    payload = {"user_id": 1, "username": "Aubin", "is_superuser": True}
    token = encode_jwt(payload)

    decoded = verify_jwt(token)
    # encode_jwt 会额外补上 exp / iat，所以只比对传入的原始字段
    assert decoded["user_id"] == payload["user_id"]
    assert decoded["username"] == payload["username"]
    assert decoded["is_superuser"] == payload["is_superuser"]
    assert "exp" in decoded
    assert "iat" in decoded