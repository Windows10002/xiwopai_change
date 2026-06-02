"""登录与令牌。"""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from core.auth import (
    issue_token,
    load_token,
    require_auth,
    student_needs_guardian,
    verify_guardian_passphrase,
)
from core.config import DEMO_ACCOUNT, DEMO_PASSWORD, GRADING_MIN_GRADE
from core.demo_accounts import demo_account_public_rows, lookup_demo_account

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"])
def login():
    if not request.is_json:
        return jsonify({"ok": False, "message": "请求需为 JSON"}), 400
    body = request.get_json(silent=True) or {}
    account = (body.get("account") or "").strip()
    password = body.get("password") or ""
    role = (body.get("role") or "").strip()
    student_grade = body.get("student_grade")

    display_name = ""
    teaching_grades: str | None = None

    fixed = lookup_demo_account(account, password)
    if fixed:
        role = fixed.role
        display_name = fixed.display_name
        teaching_grades = fixed.teaching_grades
        if fixed.student_grade is not None:
            student_grade = fixed.student_grade
    elif account != DEMO_ACCOUNT or password != DEMO_PASSWORD:
        return jsonify({"ok": False, "message": "账号或密码不正确"}), 401

    if role not in {"parent", "student", "teacher", "admin"}:
        return jsonify({"ok": False, "message": "无效的端别"}), 400

    grade: int | None = None
    if role == "student":
        try:
            grade = int(student_grade)
        except (TypeError, ValueError):
            return jsonify({"ok": False, "message": "请选择有效年级"}), 400
        if not (1 <= grade <= 12):
            return jsonify({"ok": False, "message": "请选择有效年级"}), 400
        if student_needs_guardian(grade):
            code = (body.get("guardian_code") or "").strip()
            if not verify_guardian_passphrase(code):
                return jsonify({"ok": False, "message": "家长或教师确认码不正确"}), 401

    payload: dict = {"role": role, "sub": account}
    if display_name:
        payload["display_name"] = display_name
    if teaching_grades:
        payload["teaching_grades"] = teaching_grades
    if role == "student":
        payload["student_grade"] = grade
        if display_name:
            payload["student_name"] = display_name

    token = issue_token(payload)
    return jsonify(
        {
            "ok": True,
            "token": token,
            "role": role,
            "student_grade": grade,
            "display_name": display_name or None,
            "teaching_grades": teaching_grades,
            "grading_min_grade": GRADING_MIN_GRADE,
            "guardian_required_below": GRADING_MIN_GRADE,
        }
    )


@auth_bp.route("/me", methods=["GET"])
@require_auth()
def me():
    from core.auth import current_user

    user = current_user()
    return jsonify({"ok": True, "user": user})


@auth_bp.route("/config", methods=["GET"])
def public_config():
    """前端可读取的演示配置（不含密钥）。"""
    return jsonify(
        {
            "ok": True,
            "grading_min_grade": GRADING_MIN_GRADE,
            "demo_account_hint": DEMO_ACCOUNT[:3] + "****" + DEMO_ACCOUNT[-4:],
            "demo_password_hint": "123456",
            "demo_accounts": demo_account_public_rows(),
        }
    )
