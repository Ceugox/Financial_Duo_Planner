from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "change-me-in-production-at-least-32-chars-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    DATABASE_URL: str = "sqlite:///./organizador.db"

    @property
    def database_url_fix(self) -> str:
        """Fix for databases that use 'postgres://' which SQLAlchemy doesn't support."""
        if self.DATABASE_URL.startswith("postgres://"):
            return self.DATABASE_URL.replace("postgres://", "postgresql://", 1)
        return self.DATABASE_URL

    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    ADMIN_EMAIL_1: str = ""
    ADMIN_PASSWORD_1: str = ""
    ADMIN_NAME_1: str = "Usuário 1"

    ADMIN_EMAIL_2: str = ""
    ADMIN_PASSWORD_2: str = ""
    ADMIN_NAME_2: str = "Usuário 2"

    # Open Finance via Pluggy (crie a aplicação em dashboard.pluggy.ai)
    PLUGGY_CLIENT_ID: str = ""
    PLUGGY_CLIENT_SECRET: str = ""

    # Token opcional do brapi.dev para cotações da B3 (grátis no plano free)
    BRAPI_TOKEN: str = ""

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @model_validator(mode="after")
    def validate_production_secrets(self):
        if (
            self.ENVIRONMENT.lower() == "production"
            and self.SECRET_KEY == "change-me-in-production-at-least-32-chars-long"
        ):
            raise ValueError("SECRET_KEY must be configured in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
