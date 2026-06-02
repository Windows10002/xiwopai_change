"""批改 API。"""
from __future__ import annotations

import logging
import os
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request, url_for

from core.config import GRADE_SUBJECTS, MAX_UPLOAD_BYTES
from core.grade_adapter import math_process
from core.auth import require_permission
from core.sanitize import sanitize_essay_prompt, sanitize_grade_level, sanitize_teacher_note
from core.upload_utils import opaque_stored_filename, validate_image_upload

logger = logging.getLogger(__name__)

grade_bp = Blueprint("grade", __name__)

try:
    from english_essay import process_image as english_process
except ImportError:

    def english_process(p, *, grade_level="", teacher_note="", essay_prompt="", essay_prompt_image=""):
        return {
            "error": True,
            "score": "—",
            "comments": "英语批改模块加载失败",
            "weak_points": [],
            "scores": {},
            "errors": [],
        }


@grade_bp.route("/api/grade", methods=["POST"])
@require_permission("grading.access")
def api_grade():
    subject = (request.form.get("subject") or "math").strip()
    if subject not in GRADE_SUBJECTS:
        return jsonify({"ok": False, "message": f"暂不支持的科目，仅支持：{', '.join(sorted(GRADE_SUBJECTS))}"}), 400

    if "file" not in request.files:
        return jsonify({"ok": False, "message": "未选择文件"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"ok": False, "message": "文件名为空"}), 400

    err, _ext = validate_image_upload(file, max_bytes=MAX_UPLOAD_BYTES)
    if err:
        return jsonify({"ok": False, "message": err}), 400

    filename = opaque_stored_filename(file.filename)
    file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
    file.save(file_path)

    grade_level = sanitize_grade_level(request.form.get("grade_level") or "")
    teacher_note = sanitize_teacher_note(request.form.get("teacher_note") or "")
    essay_prompt = sanitize_essay_prompt(request.form.get("essay_prompt") or "")
    essay_prompt_image = ""
    prompt_file = request.files.get("prompt_file")
    if prompt_file and prompt_file.filename:
        perr, _ = validate_image_upload(prompt_file, max_bytes=MAX_UPLOAD_BYTES)
        if perr:
            return jsonify({"ok": False, "message": f"题目图片：{perr}"}), 400
        prompt_name = opaque_stored_filename(f"prompt_{prompt_file.filename}")
        essay_prompt_image = os.path.join(current_app.config["UPLOAD_FOLDER"], prompt_name)
        prompt_file.save(essay_prompt_image)

    try:
        if subject == "math":
            result_data = math_process(file_path, grade_level=grade_level, teacher_note=teacher_note)
        else:
            result_data = english_process(
                file_path,
                grade_level=grade_level,
                teacher_note=teacher_note,
                essay_prompt=essay_prompt,
                essay_prompt_image=essay_prompt_image,
            )
    except Exception:
        logger.exception("api_grade failed subject=%s", subject)
        return jsonify({"ok": False, "message": "批改服务异常，请稍后重试"}), 500

    if result_data.get("error"):
        msg = str(result_data.get("comments") or "批改失败")
        return jsonify({"ok": False, "message": msg, "subject": subject, "result": result_data}), 422

    image_url = url_for("uploads.uploaded_file", filename=filename)
    return jsonify({"ok": True, "subject": subject, "result": result_data, "image_url": image_url})
