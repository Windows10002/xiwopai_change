"""应用配置：从环境变量 / .env 加载。"""
from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv

    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass

UPLOAD_FOLDER = BASE_DIR / "uploads"
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
GRADING_FEEDBACK_LOG = BASE_DIR / "grading_feedback.jsonl"
PRODUCT_FEEDBACK_LOG = BASE_DIR / "product_feedback.jsonl"
GRADING_DISPUTES_DB = BASE_DIR / "grading_disputes.db"
WORKSPACE_DB = BASE_DIR / "workspace.db"

ALLOWED_UPLOAD_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(15 * 1024 * 1024)))
GRADE_SUBJECTS = frozenset({"math", "english", "chinese"})

SECRET_KEY = os.getenv("SECRET_KEY", "dev-change-me-in-production")
TOKEN_MAX_AGE_SECONDS = int(os.getenv("TOKEN_MAX_AGE_SECONDS", str(7 * 24 * 3600)))

DEMO_ACCOUNT = os.getenv("DEMO_ACCOUNT", "13800138000")
DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "123456")
GUARDIAN_DEMO_PASSPHRASE = os.getenv("GUARDIAN_DEMO_PASSPHRASE", "HW-ALLOW")
GRADING_MIN_GRADE = int(os.getenv("GRADING_MIN_GRADE", "7"))

FLASK_DEBUG = os.getenv("FLASK_DEBUG", "0").strip().lower() in {"1", "true", "yes"}
FLASK_PORT = int(os.getenv("FLASK_PORT", "50003"))

BATCH_GRADE_CONCURRENCY = max(1, min(4, int(os.getenv("BATCH_GRADE_CONCURRENCY", "2"))))

# 批改 / 学情 LLM（Moonshot Kimi，OpenAI 兼容）
MOONSHOT_API_BASE = os.getenv("MOONSHOT_API_BASE", "https://api.moonshot.cn/v1").rstrip("/")
MOONSHOT_API_KEY = os.getenv("MOONSHOT_API_KEY", "").strip()
MOONSHOT_VISION_MODEL = os.getenv("MOONSHOT_VISION_MODEL", "kimi-k2.6")
MOONSHOT_TEXT_MODEL = os.getenv("MOONSHOT_TEXT_MODEL", "kimi-k2.6")

# π 助手 LLM（Agnes OpenAI 兼容 API，与批改分离）
AGNES_API_BASE = os.getenv("AGNES_API_BASE", "https://apihub.agnes-ai.com/v1").rstrip("/")
AGNES_ASSISTANT_MODEL = os.getenv("AGNES_ASSISTANT_MODEL", "agnes-2.0-flash")
AGNES_API_KEY = os.getenv("AGNES_API_KEY", "").strip()

ASSISTANT_LLM_MAX_ROUNDS_DEFAULT = max(5, min(30, int(os.getenv("ASSISTANT_LLM_MAX_ROUNDS", "20"))))
ASSISTANT_LLM_MAX_ROUNDS_TEACHER = max(
    ASSISTANT_LLM_MAX_ROUNDS_DEFAULT,
    min(40, int(os.getenv("ASSISTANT_LLM_MAX_ROUNDS_TEACHER", "25"))),
)
ASSISTANT_LLM_MAX_ROUNDS_ADMIN = max(
    ASSISTANT_LLM_MAX_ROUNDS_DEFAULT,
    min(40, int(os.getenv("ASSISTANT_LLM_MAX_ROUNDS_ADMIN", str(ASSISTANT_LLM_MAX_ROUNDS_TEACHER)))),
)
