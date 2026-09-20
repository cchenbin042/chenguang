import pytest
from src.utils.password_utils import hash_password, verify_password
from src.core.logger import logger


def test_hash_password():
    """测试密码的哈希"""
    password = "123456"
    hashed_password = hash_password(password)
    logger.info(f"密码的哈希值: {hashed_password}")

    # 哈希结果不能等于明文
    assert hashed_password != password
    # bcrypt 哈希以 $2b$ 开头
    assert hashed_password.startswith("$2b$")
    # 加盐是随机的，同一明文两次哈希结果应该不同
    assert hash_password(password) != hashed_password


def test_verify_password():
    """测试密码的校验"""
    password = "123456"
    hashed_password = hash_password(password)

    # 正确密码校验通过
    assert verify_password(password, hashed_password) is True
    # 错误密码校验失败
    assert verify_password("wrong_password", hashed_password) is False
