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
