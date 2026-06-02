"""上传文件访问（需登录）。"""
from __future__ import annotations

from flask import Blueprint, current_app, send_from_directory

from core.auth import require_permission

uploads_bp = Blueprint("uploads", __name__)


@uploads_bp.route("/uploads/<filename>")
@require_permission("grading.access")
def uploaded_file(filename):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)
