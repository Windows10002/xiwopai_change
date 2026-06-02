"""批改 API。"""
from __future__ import annotations

import logging
import os

from flask import Blueprint, current_app, jsonify, request, url_for

from core.auth import current_user, require_permission, resolve_student_profile_name
from core.config import GRADE_SUBJECTS, MAX_UPLOAD_BYTES
from core.grade_adapter import math_process
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


def _workspace_store():
    return current_app.config.get("WORKSPACE_STORE")


def _persist_workspace_grade(
    *,
    subject: str,
    file_name: str,
    filename: str,
    image_url: str,
    result_data: dict,
    grade_level: str,
    teacher_note: str,
    student_name: str,
    assignment_id: str,
    publish_to_student: bool,
) -> dict | None:
    store = _workspace_store()
    user = current_user()
    if store is None or user is None:
        return None
    role = str(user.get("role") or "")
    if not student_name and role == "student":
        student_name = resolve_student_profile_name(user)
    if not student_name:
        return None

    teacher_sub = str(user.get("sub") or "")
    if role in {"teacher", "admin"}:
        pass
    elif role == "parent":
        pass
    else:
        teacher_sub = teacher_sub  # student self-grade: teacher_sub empty until linked

    submission = store.create_submission(
        assignment_id=assignment_id or None,
        teacher_sub=teacher_sub if role in {"teacher", "admin"} else "",
        student_name=student_name,
        student_sub=str(user.get("sub") or ""),
        submitted_by_role=role,
        subject=subject,
        file_name=file_name,
        image_filename=filename,
        image_url=image_url,
        grade_level=grade_level,
        teacher_note=teacher_note,
        status="grading",
    )
    grading = store.save_grading_record(
        submission["id"],
        result_data,
        graded_by="ai",
        published=publish_to_student,
    )
    if publish_to_student:
        store.publish_submission(submission["id"], teacher_sub or str(user.get("sub") or ""))
    return {
        "submission_id": submission["id"],
        "grading_record_id": grading.get("id"),
        "published": publish_to_student,
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

    student_name = (request.form.get("student_name") or "").strip()
    assignment_id = (request.form.get("assignment_id") or "").strip()
    save_workspace = request.form.get("save_to_workspace", "").strip().lower() in {"1", "true", "yes"}
    publish_to_student = request.form.get("publish_to_student", "").strip().lower() in {"1", "true", "yes"}

    user = current_user()
    if user and str(user.get("role")) == "student" and not student_name:
        student_name = resolve_student_profile_name(user)

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

    workspace_meta = None
    if save_workspace or publish_to_student or student_name:
        try:
            workspace_meta = _persist_workspace_grade(
                subject=subject,
                file_name=file.filename or filename,
                filename=filename,
                image_url=image_url,
                result_data=result_data,
                grade_level=grade_level,
                teacher_note=teacher_note,
                student_name=student_name,
                assignment_id=assignment_id,
                publish_to_student=publish_to_student,
            )
        except Exception:
            logger.exception("workspace persist failed")

    payload: dict = {"ok": True, "subject": subject, "result": result_data, "image_url": image_url}
    if workspace_meta:
        payload.update(workspace_meta)
    return jsonify(payload)
