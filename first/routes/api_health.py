"""健康检查。"""
from __future__ import annotations

import os

from flask import Blueprint, current_app, jsonify

from core.auth import current_user, has_permission, require_auth
from routes.spa import spa_built

health_bp = Blueprint("health", __name__)


@health_bp.route("/api/health", methods=["GET"])
@require_auth(optional=True)
def api_health():
    user = current_user()
    basic = {
        "ok": True,
        "spa_built": spa_built(),
        "workspace_loaded": current_app.config.get("WORKSPACE_STORE") is not None,
        "assignment_multipart": True,
    }
    if not user or not has_permission(str(user.get("role", "")), "health.detail"):
        return jsonify(basic)

    from routes.api_feedback import feedback_bp

    read_fn = getattr(feedback_bp, "read_feedback_records", None)
    feedback_n = len(read_fn(1000)) if read_fn else 0
    store = current_app.config.get("DISPUTES_STORE")
    dispute_n = 0
    pending = 0
    if store:
        rows = store.list_items(limit=1000)
        dispute_n = len(rows)
        pending = store.count_pending()

    return jsonify(
        {
            **basic,
            "feedback_records": feedback_n,
            "dispute_records": dispute_n,
            "dispute_pending": pending,
            "dashscope_configured": bool(os.getenv("DASHSCOPE_API_KEY", "").strip()),
        }
    )
