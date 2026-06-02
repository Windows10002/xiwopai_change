"""师生闭环 API：任务、提交、发布、订正、变式题。"""
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

workspace_bp = Blueprint("workspace", __name__)

try:
    from english_essay import process_image as english_process
except ImportError:

    def english_process(p, *, grade_level="", teacher_note="", essay_prompt="", essay_prompt_image=""):
        return {
            "error": True,
            "score": "—",
            "comments": "英语批改模块加载失败",
            "weak_points": [],
        }


def _store():
    return current_app.config.get("WORKSPACE_STORE")


def _run_grade(
    file_path: str,
    subject: str,
    *,
    grade_level: str = "",
    teacher_note: str = "",
    essay_prompt: str = "",
    essay_prompt_image: str = "",
) -> dict:
    if subject == "math":
        return math_process(file_path, grade_level=grade_level, teacher_note=teacher_note)
    return english_process(
        file_path,
        grade_level=grade_level,
        teacher_note=teacher_note,
        essay_prompt=essay_prompt,
        essay_prompt_image=essay_prompt_image,
    )


def _save_upload(file) -> tuple[str, str, str]:
    filename = opaque_stored_filename(file.filename)
    file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
    file.save(file_path)
    image_url = url_for("uploads.uploaded_file", filename=filename)
    return file_path, filename, image_url


@workspace_bp.route("/api/assignments", methods=["POST"])
@require_permission("workspace.manage")
def api_create_assignment():
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    if not request.is_json:
        return jsonify({"ok": False, "message": "请求需为 JSON"}), 400
    body = request.get_json(silent=True) or {}
    user = current_user()
    assert user is not None
    subject = (body.get("subject") or "math").strip()
    if subject not in GRADE_SUBJECTS:
        return jsonify({"ok": False, "message": "无效科目"}), 400
    try:
        rec = store.create_assignment(
            teacher_sub=str(user.get("sub") or ""),
            subject=subject,
            title=str(body.get("title") or ""),
            description=str(body.get("description") or ""),
            class_name=str(body.get("class_name") or ""),
            due_at=str(body.get("due_at") or "") or None,
            target_student_names=body.get("target_student_names") if isinstance(body.get("target_student_names"), list) else [],
            publish=bool(body.get("publish")),
        )
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    return jsonify({"ok": True, "assignment": rec})


@workspace_bp.route("/api/assignments", methods=["GET"])
@require_permission("workspace.manage")
def api_list_assignments_teacher():
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    status = (request.args.get("status") or "").strip() or None
    items = store.list_assignments(teacher_sub=str(user.get("sub") or ""), status=status)
    enriched = []
    for a in items:
        stats = store.assignment_submission_stats(a["id"])
        enriched.append({**a, **stats})
    return jsonify({"ok": True, "items": enriched})


@workspace_bp.route("/api/assignments/my", methods=["GET"])
@require_permission("workspace.view_own", "workspace.submit")
def api_list_assignments_student():
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    student_name = resolve_student_profile_name(user)
    if not student_name:
        return jsonify({"ok": False, "message": "请先在设置中填写学生姓名"}), 400
    assignments = store.list_assignments(student_name=student_name, status="published")
    my_subs = store.list_submissions(student_name=student_name, limit=200)
    submitted_assignment_ids = {s["assignment_id"] for s in my_subs if s.get("assignment_id")}
    todo = [a for a in assignments if a["id"] not in submitted_assignment_ids]
    return jsonify({"ok": True, "todo": todo, "assignments": assignments})


@workspace_bp.route("/api/assignments/<assignment_id>/publish", methods=["POST"])
@require_permission("workspace.manage")
def api_publish_assignment(assignment_id: str):
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    try:
        rec = store.publish_assignment(assignment_id, str(user.get("sub") or ""))
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    return jsonify({"ok": True, "assignment": rec})


@workspace_bp.route("/api/assignments/<assignment_id>/submit", methods=["POST"])
@require_permission("workspace.submit", "grading.access")
def api_submit_assignment(assignment_id: str):
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    role = str(user.get("role") or "")
    assignment = store.get_assignment(assignment_id)
    if not assignment or assignment.get("status") != "published":
        return jsonify({"ok": False, "message": "任务不存在或未发布"}), 404

    if "file" not in request.files:
        return jsonify({"ok": False, "message": "未选择文件"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"ok": False, "message": "文件名为空"}), 400
    err, _ = validate_image_upload(file, max_bytes=MAX_UPLOAD_BYTES)
    if err:
        return jsonify({"ok": False, "message": err}), 400

    student_name = resolve_student_profile_name(user) or (request.form.get("student_name") or "").strip()
    if role == "student" and not student_name:
        return jsonify({"ok": False, "message": "请先在设置中填写学生姓名"}), 400
    if role in {"teacher", "admin", "parent"}:
        student_name = (request.form.get("student_name") or "").strip() or student_name
    if not student_name:
        return jsonify({"ok": False, "message": "请填写学生姓名"}), 400

    file_path, filename, image_url = _save_upload(file)
    grade_level = sanitize_grade_level(request.form.get("grade_level") or "")
    teacher_note = sanitize_teacher_note(request.form.get("teacher_note") or "")

    try:
        result_data = _run_grade(
            file_path,
            assignment["subject"],
            grade_level=grade_level,
            teacher_note=teacher_note,
        )
    except Exception:
        logger.exception("assignment submit grade failed")
        return jsonify({"ok": False, "message": "批改服务异常"}), 500

    if result_data.get("error"):
        msg = str(result_data.get("comments") or "批改失败")
        return jsonify({"ok": False, "message": msg}), 422

    auto_publish = request.form.get("auto_publish", "1").strip().lower() not in {"0", "false", "no"}
    teacher_sub = assignment.get("teacher_sub") or str(user.get("sub") or "")

    submission = store.create_submission(
        assignment_id=assignment_id,
        teacher_sub=teacher_sub,
        student_name=student_name,
        student_sub=str(user.get("sub") or ""),
        submitted_by_role=role,
        subject=assignment["subject"],
        file_name=file.filename or filename,
        image_filename=filename,
        image_url=image_url,
        grade_level=grade_level,
        teacher_note=teacher_note,
        status="grading",
    )
    grading = store.save_grading_record(
        submission["id"],
        result_data,
        published=auto_publish and role == "student",
    )
    if auto_publish and role == "student":
        store.publish_submission(submission["id"], teacher_sub)

    item = store.list_submissions(limit=1)[0] if store.list_submissions(limit=1) else None
    for s in store.list_submissions(student_name=student_name, limit=5):
        if s["id"] == submission["id"]:
            item = s
            break

    return jsonify(
        {
            "ok": True,
            "subject": assignment["subject"],
            "result": result_data,
            "image_url": image_url,
            "submission_id": submission["id"],
            "grading_record_id": grading.get("id"),
            "published": auto_publish and role == "student",
            "submission": item,
        }
    )


@workspace_bp.route("/api/submissions/inbox", methods=["GET"])
@require_permission("workspace.manage")
def api_submissions_inbox():
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    items = store.list_submissions(teacher_sub=str(user.get("sub") or ""), limit=120)
    counts = store.count_teacher_inbox(str(user.get("sub") or ""))
    return jsonify({"ok": True, "items": items, "counts": counts})


@workspace_bp.route("/api/submissions/my", methods=["GET"])
@require_permission("workspace.view_own")
def api_submissions_my():
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    student_name = resolve_student_profile_name(user)
    if not student_name:
        return jsonify({"ok": False, "message": "请先在设置中填写学生姓名"}), 400
    items = store.list_submissions(student_name=student_name, limit=120)
    visible: list[dict] = []
    for raw in items:
        enriched = store._enrich_submission(raw)  # noqa: SLF001
        if enriched.get("grading_record") and (
            enriched.get("status") in {"published", "correction_pending", "correction_done", "closed", "graded"}
            or enriched.get("submitted_by_role") == "student"
        ):
            visible.append(enriched)
    variants = store.list_variant_tasks(student_name=student_name, status="assigned")
    return jsonify({"ok": True, "items": visible, "variant_tasks": variants})


@workspace_bp.route("/api/submissions/<submission_id>", methods=["GET"])
@require_permission("workspace.view_own", "workspace.manage")
def api_get_submission(submission_id: str):
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    sub = store.get_submission(submission_id)
    if not sub:
        return jsonify({"ok": False, "message": "未找到"}), 404
    role = str(user.get("role") or "")
    enriched = store._enrich_submission(sub)  # noqa: SLF001
    if role == "student":
        student_name = resolve_student_profile_name(user)
        if not store.student_may_view(enriched, student_name):
            return jsonify({"ok": False, "message": "无权查看"}), 403
    elif role in {"teacher", "admin"}:
        if enriched.get("teacher_sub") and enriched["teacher_sub"] != str(user.get("sub") or ""):
            pass  # demo: same teacher account
    return jsonify({"ok": True, "submission": enriched})


@workspace_bp.route("/api/submissions/<submission_id>/publish", methods=["POST"])
@require_permission("workspace.manage")
def api_publish_submission(submission_id: str):
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    try:
        sub = store.publish_submission(submission_id, str(user.get("sub") or ""))
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    enriched = store._enrich_submission(sub)  # noqa: SLF001
    return jsonify({"ok": True, "submission": enriched})


@workspace_bp.route("/api/submissions/<submission_id>/correction", methods=["POST"])
@require_permission("workspace.view_own")
def api_submit_correction(submission_id: str):
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    body = request.get_json(silent=True) or {}
    note = str(body.get("note") or "")
    student_name = resolve_student_profile_name(user)
    try:
        sub = store.submit_correction(submission_id, student_name, note)
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    return jsonify({"ok": True, "submission": store._enrich_submission(sub)})  # noqa: SLF001


@workspace_bp.route("/api/submissions/<submission_id>/correction/review", methods=["POST"])
@require_permission("workspace.manage")
def api_review_correction(submission_id: str):
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    body = request.get_json(silent=True) or {}
    action = str(body.get("action") or "")
    reply = str(body.get("teacher_reply") or "")
    try:
        sub = store.review_correction(submission_id, str(user.get("sub") or ""), action, reply)
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    return jsonify({"ok": True, "submission": store._enrich_submission(sub)})  # noqa: SLF001


@workspace_bp.route("/api/submissions/<submission_id>/variants", methods=["POST"])
@require_permission("workspace.manage")
def api_assign_variants(submission_id: str):
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    body = request.get_json(silent=True) or {}
    tasks = body.get("tasks")
    if not isinstance(tasks, list) or not tasks:
        return jsonify({"ok": False, "message": "请提供变式题列表"}), 400
    try:
        created = store.create_variant_tasks(
            submission_id=submission_id,
            teacher_sub=str(user.get("sub") or ""),
            tasks=tasks,
        )
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    if not created:
        return jsonify({"ok": False, "message": "未能创建变式题"}), 400
    return jsonify({"ok": True, "items": created})


@workspace_bp.route("/api/variant-tasks/my", methods=["GET"])
@require_permission("workspace.view_own")
def api_my_variants():
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    student_name = resolve_student_profile_name(user)
    if not student_name:
        return jsonify({"ok": False, "message": "请先在设置中填写学生姓名"}), 400
    status = (request.args.get("status") or "").strip() or None
    items = store.list_variant_tasks(student_name=student_name, status=status)
    return jsonify({"ok": True, "items": items})


@workspace_bp.route("/api/variant-tasks/<task_id>/done", methods=["POST"])
@require_permission("workspace.view_own")
def api_complete_variant(task_id: str):
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    student_name = resolve_student_profile_name(user)
    try:
        item = store.complete_variant_task(task_id, student_name)
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    return jsonify({"ok": True, "item": item})


@workspace_bp.route("/api/workspace/inbox-counts", methods=["GET"])
@require_permission("workspace.manage")
def api_inbox_counts():
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    counts = store.count_teacher_inbox(str(user.get("sub") or ""))
    return jsonify({"ok": True, **counts})
