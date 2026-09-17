from pydantic_settings import BaseSettings
from functools import lru_cache
from urllib.parse import quote_plus

class Settings(BaseSettings):
    APP_NAME: str = "MyApp"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    APP_VERSION: str = "1.0.0"

    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "myapp"

    LOG_LEVEL: str = "DEBUG"
    LOG_DIR: str = "logs"

    @property
    def DATABASE_URL(self) -> str:
        # 密码可能含 @ 等特殊字符，必须 URL 编码，否则会破坏连接串解析
        password = quote_plus(self.DB_PASSWORD)
        return (
            f"mysql+asyncmy://{self.DB_USER}:{password}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset=utf8mb4"
        )

    # 指定环境变量文件
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

# 保存到内存缓存中。以后直接获取。这是一种单例的实现
@lru_cache 
def get_settings() -> Settings:
    return Settings()