import os
from dotenv import load_dotenv

# Load .env file from backend directory
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(base_dir, ".env")
load_dotenv(env_path)

class Settings:
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DB_NAME: str = "warehouse_db"
    SESSION_SECRET: str = os.getenv("SESSION_SECRET", "default-secret-change-me")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    SESSION_EXPIRE_SECONDS: int = 86400  # 24 hours

settings = Settings()
