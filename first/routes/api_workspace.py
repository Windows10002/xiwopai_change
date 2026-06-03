"""师生闭环 API：任务、提交、发布、订正、变式题。"""
from __future__ import annotations

import json
import logging
import os

from flask import Blueprint, current_app, jsonify, request, url_for

from core.auth import current_user, require_permission, resolve_student_profile_name
from core.config import GRADE_SUBJECTS, MAX_UPLOAD_BYTES
from core.grade_adapter import math_process
from core.sanitize import sanitize_answer_key, sanitize_essay_prompt, sanitize_grade_level, sanitize_scoring_rubric, sanitize_teacher_note
from core.upload_utils import opaque_stored_filename, validate_image_upload
from core.workspace_deadline import enrich_assignment_deadline, student_may_submit_assignment
from core.workspace_exam import enrich_exam_fields, strip_assignment_answers_for_viewer, allows_student_submit

logger = logging.getLogger(__name__)

workspace_bp = Blueprint("workspace", __name__)

try:
    from english_essay import process_image as english_process
except ImportError:

    def english_process(
        p,
        *,
        grade_level="",
        teacher_note="",
        essay_prompt="",
        essay_prompt_image="",
        answer_key="",
        answer_key_image="",
        scoring_rubric="",
    ):
        return {
            "error": True,
            "score": "—",
            "comments": "英语批改模块加载失败",
            "weak_points": [],
        }


def _store():
    return current_app.config.get("WORKSPACE_STORE")


def _upload_file_url(filename: str) -> str:
    fn = str(filename or "").strip()
    return url_for("uploads.uploaded_file", filename=fn) if fn else ""


def _enrich_assignment_api(a: dict) -> dict:
    out = enrich_exam_fields({**a})
    out["answer_key_image_url"] = _upload_file_url(out.get("answer_key_image") or "")
    out["teacher_attachment_image_url"] = _upload_file_url(out.get("teacher_attachment_image") or "")
    return out


def _assignment_for_viewer(assignment: dict | None) -> dict | None:
    """学生/家长可见的任务：补全考试字段与图片 URL，再按规则隐藏未开放答案。"""
    if not assignment:
        return None
    return strip_assignment_answers_for_viewer(_enrich_assignment_api(enrich_assignment_deadline(assignment)))


def _run_grade(
    file_path: str,
    subject: str,
    *,
    grade_level: str = "",
    teacher_note: str = "",
    essay_prompt: str = "",
    essay_prompt_image: str = "",
    answer_key: str = "",
    answer_key_image: str = "",
    scoring_rubric: str = "",
) -> dict:
    if subject in {"math", "chinese"}:
        return math_process(
            file_path,
            grade_level=grade_level,
            teacher_note=teacher_note,
            answer_key=answer_key,
            answer_key_image=answer_key_image,
            scoring_rubric=scoring_rubric,
        )
    return english_process(
        file_path,
        grade_level=grade_level,
        teacher_note=teacher_note,
        essay_prompt=essay_prompt,
        essay_prompt_image=essay_prompt_image,
        answer_key=answer_key,
        answer_key_image=answer_key_image,
        scoring_rubric=scoring_rubric,
    )


def _resolve_child_name(user: dict) -> str:
    name = resolve_student_profile_name(user)
    if name:
        return name
    if str(user.get("role") or "") == "parent" and str(user.get("sub") or "") == "13800138002":
        return "张三"
    return ""


def _save_upload(file) -> tuple[str, str, str]:
    filename = opaque_stored_filename(file.filename)
    file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
    file.save(file_path)
    image_url = url_for("uploads.uploaded_file", filename=filename)
    return file_path, filename, image_url


def _save_assignment_upload_file(file, prefix: str) -> tuple[str | None, str | None]:
    """保存任务相关图片，返回 (filename, error_message)。"""
    if not file or not file.filename:
        return "", None
    err, _ = validate_image_upload(file, max_bytes=MAX_UPLOAD_BYTES)
    if err:
        return None, err
    filename = opaque_stored_filename(f"{prefix}_{file.filename}")
    file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
    file.save(file_path)
    return filename, None


def _save_answer_key_file(file) -> tuple[str | None, str | None]:
    return _save_assignment_upload_file(file, "answerkey")


def _assignment_request_body() -> tuple[dict | None, str | None]:
    """JSON 或 multipart（字段 payload + 可选 answer_key_file）。"""
    ct = request.content_type or ""
    if "multipart/form-data" in ct:
        raw = request.form.get("payload") or "{}"
        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            return None, "任务数据格式无效"
        if not isinstance(body, dict):
            return None, "任务数据格式无效"
        upload = request.files.get("answer_key_file")
        if upload and upload.filename:
            fn, err = _save_answer_key_file(upload)
            if err:
                return None, err
            body["answer_key_image"] = fn
            body.pop("clear_answer_key_image", None)
        attach = request.files.get("teacher_attachment_file")
        if attach and attach.filename:
            fn, err = _save_assignment_upload_file(attach, "teacheratt")
            if err:
                return None, err
            body["teacher_attachment_image"] = fn
            body.pop("clear_teacher_attachment_image", None)
        return body, None
    if request.is_json:
        body = request.get_json(silent=True) or {}
        return (body if isinstance(body, dict) else {}), None
    return None, "请求需为 JSON，或上传图片时使用 multipart（payload + answer_key_file / teacher_attachment_file）"


@workspace_bp.route("/api/assignments/answer-key-image", methods=["POST"])
@require_permission("workspace.manage")
def api_upload_answer_key_image():
    """上传参考答案图片（兼容旧前端）；推荐在创建/更新任务时 multipart 一并上传。"""
    file = request.files.get("file") or request.files.get("answer_key_file")
    if not file or not file.filename:
        return jsonify({"ok": False, "message": "未选择图片"}), 400
    filename, err = _save_answer_key_file(file)
    if err:
        return jsonify({"ok": False, "message": err}), 400
    image_url = url_for("uploads.uploaded_file", filename=filename)
    return jsonify({"ok": True, "filename": filename, "image_url": image_url})


@workspace_bp.route("/api/assignments", methods=["POST"])
@require_permission("workspace.manage")
def api_create_assignment():
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    body, parse_err = _assignment_request_body()
    if parse_err:
        return jsonify({"ok": False, "message": parse_err}), 400
    assert body is not None
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
            answer_key=str(body.get("answer_key") or ""),
            answer_key_image=str(body.get("answer_key_image") or ""),
            send_answer_to_parent=bool(body.get("send_answer_to_parent")),
            publish=bool(body.get("publish")),
            max_submissions=int(body.get("max_submissions") or 0),
            allowed_formats=body.get("allowed_formats") if isinstance(body.get("allowed_formats"), list) else None,
            scoring_rubric=str(body.get("scoring_rubric") or ""),
            teacher_attachment_note=str(body.get("teacher_attachment_note") or ""),
            teacher_attachment_image=str(body.get("teacher_attachment_image") or ""),
            notify_student_parent=bool(body.get("notify_student_parent", True)),
            scheduled_publish_at=str(body.get("scheduled_publish_at") or ""),
            submission_mode=str(body.get("submission_mode") or "both"),
            hide_answer_from_student=bool(body.get("hide_answer_from_student")),
        )
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    return jsonify({"ok": True, "assignment": _enrich_assignment_api(rec)})


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
        enriched.append(_enrich_assignment_api({**a, **stats}))
    return jsonify({"ok": True, "items": enriched})


@workspace_bp.route("/api/assignments/all", methods=["GET"])
@require_permission("workspace.manage")
def api_list_assignments_admin():
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    items = [_enrich_assignment_api(a) for a in store.list_all_assignments()]
    return jsonify({"ok": True, "items": items})


@workspace_bp.route("/api/assignments/parent", methods=["GET"])
@require_permission("workspace.view_child")
def api_list_assignments_parent():
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    child_name = _resolve_child_name(user)
    if not child_name:
        return jsonify({"ok": False, "message": "请先在设置中填写孩子姓名"}), 400
    items = [_enrich_assignment_api(a) for a in store.list_assignments_for_parent(child_name)]
    return jsonify({"ok": True, "child_name": child_name, "items": items})


@workspace_bp.route("/api/assignments/<assignment_id>", methods=["PATCH"])
@require_permission("workspace.manage")
def api_update_assignment(assignment_id: str):
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    body, parse_err = _assignment_request_body()
    if parse_err:
        return jsonify({"ok": False, "message": parse_err}), 400
    assert body is not None
    user = current_user()
    assert user is not None
    subject = body.get("subject")
    if subject is not None and subject not in GRADE_SUBJECTS:
        return jsonify({"ok": False, "message": "无效科目"}), 400
    try:
        rec = store.update_assignment(
            assignment_id,
            str(user.get("sub") or ""),
            subject=str(subject) if subject is not None else None,
            title=str(body["title"]) if "title" in body else None,
            description=str(body["description"]) if "description" in body else None,
            class_name=str(body["class_name"]) if "class_name" in body else None,
            due_at=str(body["due_at"]) if "due_at" in body else None,
            target_student_names=body["target_student_names"] if isinstance(body.get("target_student_names"), list) else None,
            answer_key=str(body["answer_key"]) if "answer_key" in body else None,
            answer_key_image=str(body["answer_key_image"]) if "answer_key_image" in body else None,
            clear_answer_key_image=bool(body.get("clear_answer_key_image")),
            send_answer_to_parent=bool(body["send_answer_to_parent"]) if "send_answer_to_parent" in body else None,
            max_submissions=int(body["max_submissions"]) if "max_submissions" in body else None,
            allowed_formats=body["allowed_formats"] if isinstance(body.get("allowed_formats"), list) else None,
            scoring_rubric=str(body["scoring_rubric"]) if "scoring_rubric" in body else None,
            teacher_attachment_note=str(body["teacher_attachment_note"]) if "teacher_attachment_note" in body else None,
            teacher_attachment_image=str(body["teacher_attachment_image"]) if "teacher_attachment_image" in body else None,
            clear_teacher_attachment_image=bool(body.get("clear_teacher_attachment_image")),
            notify_student_parent=bool(body["notify_student_parent"]) if "notify_student_parent" in body else None,
            scheduled_publish_at=str(body["scheduled_publish_at"]) if "scheduled_publish_at" in body else None,
            submission_mode=str(body["submission_mode"]) if "submission_mode" in body else None,
            hide_answer_from_student=bool(body["hide_answer_from_student"])
            if "hide_answer_from_student" in body
            else None,
        )
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    stats = store.assignment_submission_stats(assignment_id)
    return jsonify({"ok": True, "assignment": _enrich_assignment_api({**rec, **stats})})


@workspace_bp.route("/api/assignments/<assignment_id>/release-answer", methods=["POST"])
@require_permission("workspace.manage")
def api_release_assignment_answer(assignment_id: str):
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    try:
        rec = store.release_assignment_answer(assignment_id, str(user.get("sub") or ""))
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    stats = store.assignment_submission_stats(assignment_id)
    return jsonify({"ok": True, "assignment": _enrich_assignment_api({**rec, **stats})})


@workspace_bp.route("/api/assignments/<assignment_id>/revoke-answer", methods=["POST"])
@require_permission("workspace.manage")
def api_revoke_assignment_answer(assignment_id: str):
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    try:
        rec = store.revoke_assignment_answer(assignment_id, str(user.get("sub") or ""))
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    stats = store.assignment_submission_stats(assignment_id)
    return jsonify({"ok": True, "assignment": _enrich_assignment_api({**rec, **stats})})


@workspace_bp.route("/api/assignments/<assignment_id>/publish-pending", methods=["POST"])
@require_permission("workspace.manage")
def api_publish_pending_submissions(assignment_id: str):
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    try:
        ids = store.publish_pending_submissions_for_assignment(assignment_id, str(user.get("sub") or ""))
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    return jsonify({"ok": True, "published_ids": ids, "count": len(ids)})


@workspace_bp.route("/api/assignments/<assignment_id>", methods=["DELETE"])
@require_permission("workspace.manage")
def api_delete_assignment(assignment_id: str):
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    try:
        store.delete_assignment(assignment_id, str(user.get("sub") or ""))
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    return jsonify({"ok": True})


@workspace_bp.route("/api/assignments/<assignment_id>/late-submit", methods=["POST"])
@require_permission("workspace.manage")
def api_set_late_submit(assignment_id: str):
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    if not request.is_json:
        return jsonify({"ok": False, "message": "请求需为 JSON"}), 400
    body = request.get_json(silent=True) or {}
    enabled = bool(body.get("enabled"))
    user = current_user()
    assert user is not None
    try:
        rec = store.set_allow_late_submit(assignment_id, str(user.get("sub") or ""), enabled=enabled)
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    stats = store.assignment_submission_stats(assignment_id)
    return jsonify({"ok": True, "assignment": _enrich_assignment_api({**rec, **stats})})


@workspace_bp.route("/api/assignments/<assignment_id>/report", methods=["GET"])
@require_permission("workspace.manage")
def api_assignment_report(assignment_id: str):
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    try:
        report = store.assignment_pdca_report(assignment_id)
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    return jsonify({"ok": True, "report": report})


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
    subs_by_assignment: dict[str, dict] = {}
    for s in my_subs:
        aid = s.get("assignment_id")
        if aid and aid not in subs_by_assignment:
            subs_by_assignment[aid] = s
    todo = []
    for a in assignments:
        a = enrich_assignment_deadline(a)
        sub = subs_by_assignment.get(a["id"])
        if store.student_assignment_in_todo(a, sub):
            item = {**a}
            if sub:
                ok, _ = store.may_resubmit(a, sub)
                item["resubmit_allowed"] = ok or sub.get("status") == "correction_pending"
                item["submission_id"] = sub.get("id")
            todo.append(_assignment_for_viewer(item) or item)
    all_assignments = [_assignment_for_viewer(a) or a for a in assignments]
    return jsonify({"ok": True, "todo": todo, "assignments": all_assignments})


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
    return jsonify({"ok": True, "assignment": _enrich_assignment_api(rec)})


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

    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if file.filename else ""
    allowed = assignment.get("allowed_formats") or ["jpg", "jpeg", "png", "webp"]
    if ext and allowed and ext not in [f.lower().lstrip(".") for f in allowed]:
        return jsonify({"ok": False, "message": f"附件格式不支持，允许：{', '.join(allowed)}"}), 400

    student_name = resolve_student_profile_name(user) or (request.form.get("student_name") or "").strip()
    if role == "student" and not student_name:
        return jsonify({"ok": False, "message": "请先在设置中填写学生姓名"}), 400
    if role in {"teacher", "admin", "parent"}:
        student_name = (request.form.get("student_name") or "").strip() or student_name
    if not student_name:
        return jsonify({"ok": False, "message": "请先在设置中填写学生姓名"}), 400
    if role == "student" and not allows_student_submit(assignment):
        return jsonify({"ok": False, "message": "本任务为课堂考试，由教师统一录入试卷，学生无需交卷"}), 400
    if role == "student" and not student_may_submit_assignment(assignment):
        return jsonify(
            {
                "ok": False,
                "message": "已超过截止时间，无法交卷；请联系教师开放补交入口",
            }
        ), 400

    existing = store.find_submission_for_student(assignment_id, student_name) if role == "student" else None
    if existing and role == "student":
        ok, reason = store.may_resubmit(assignment, existing)
        if not ok:
            return jsonify({"ok": False, "message": reason or "当前不可重交"}), 400

    file_path, filename, image_url = _save_upload(file)
    grade_level = sanitize_grade_level(request.form.get("grade_level") or "")
    teacher_note = sanitize_teacher_note(request.form.get("teacher_note") or "")
    answer_key = sanitize_answer_key(assignment.get("answer_key") or "")
    scoring_rubric = sanitize_scoring_rubric(assignment.get("scoring_rubric") or "")
    answer_key_image = store.resolve_answer_key_image_path(current_app.config["UPLOAD_FOLDER"], assignment)

    try:
        result_data = _run_grade(
            file_path,
            assignment["subject"],
            grade_level=grade_level,
            teacher_note=teacher_note,
            answer_key=answer_key,
            answer_key_image=answer_key_image,
            scoring_rubric=scoring_rubric,
        )
    except Exception:
        logger.exception("assignment submit grade failed")
        return jsonify({"ok": False, "message": "批改服务异常"}), 500

    if result_data.get("error"):
        msg = str(result_data.get("comments") or "批改失败")
        return jsonify({"ok": False, "message": msg}), 422

    default_auto = "0" if assignment.get("submission_mode") == "teacher" else "1"
    auto_publish = request.form.get("auto_publish", default_auto).strip().lower() not in {"0", "false", "no"}
    if role == "student":
        auto_publish = False
    teacher_sub = assignment.get("teacher_sub") or str(user.get("sub") or "")

    if existing and role == "student":
        submission = store.resubmit_submission(
            existing["id"],
            file_name=file.filename or filename,
            image_filename=filename,
            image_url=image_url,
            status="grading",
        )
        is_resubmit = True
    else:
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
        is_resubmit = False
    submission_status = "pending_review" if role == "student" else None
    grading = store.save_grading_record(
        submission["id"],
        result_data,
        published=auto_publish and role != "student",
        submission_status=submission_status,
    )
    if auto_publish and role != "student":
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
            "published": auto_publish and role != "student",
            "resubmit": is_resubmit,
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
    status_filter = (request.args.get("status") or "").strip() or None
    items = store.list_submissions(teacher_sub=str(user.get("sub") or ""), status=status_filter, limit=120)
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
    pending_release: list[dict] = []
    for raw in items:
        enriched = store._enrich_submission(raw)  # noqa: SLF001
        if not store.student_may_view(enriched, student_name):
            if enriched.get("status") in {"graded", "pending_review"}:
                assignment = enriched.get("assignment")
                pending_release.append(
                    {
                        "id": enriched.get("id"),
                        "assignment_id": enriched.get("assignment_id"),
                        "student_name": enriched.get("student_name"),
                        "status": enriched.get("status"),
                        "created_at": enriched.get("created_at"),
                        "assignment": _assignment_for_viewer(assignment) if assignment else None,
                    }
                )
            continue
        if enriched.get("grading_record"):
            if enriched.get("assignment"):
                enriched = {
                    **enriched,
                    "assignment": _assignment_for_viewer(enriched["assignment"]),
                }
            visible.append(enriched)
    variants = store.list_variant_tasks(student_name=student_name, status="assigned")
    return jsonify({"ok": True, "items": visible, "variant_tasks": variants, "pending_release": pending_release})


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
        if enriched.get("assignment"):
            enriched = {
                **enriched,
                "assignment": _assignment_for_viewer(enriched["assignment"]),
            }
    elif role in {"teacher", "admin"}:
        if enriched.get("assignment"):
            enriched = {
                **enriched,
                "assignment": _enrich_assignment_api(enriched["assignment"]),
            }
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


@workspace_bp.route("/api/submissions/<submission_id>/return", methods=["POST"])
@require_permission("workspace.manage")
def api_return_submission(submission_id: str):
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "作业服务未加载"}), 500
    user = current_user()
    assert user is not None
    body = request.get_json(silent=True) or {}
    note = str(body.get("note") or body.get("teacher_note") or "")
    try:
        sub = store.return_submission_for_correction(submission_id, str(user.get("sub") or ""), note)
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
