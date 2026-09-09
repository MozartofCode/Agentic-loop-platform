from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    groq_api_key: str
    groq_model: str = "openai/gpt-oss-120b"
    max_iterations: int = 10
    agent_workspace: str = "./workspace"
    github_token: Optional[str] = None

    class Config:
        env_file = ".env"


settings = Settings()
