"""演示环境 JWT-like 会话令牌与权限校验。"""
from __future__ import annotations

from functools import wraps
from typing import Any, Callable, Iterable

from flask import g, jsonify, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from core.config import GRADING_MIN_GRADE, GUARDIAN_DEMO_PASSPHRASE, SECRET_KEY, TOKEN_MAX_AGE_SECONDS

VALID_ROLES = frozenset({"parent", "student", "teacher", "admin"})

ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    "parent": frozenset({"grading.access", "workspace.view_child"}),
    "student": frozenset({"grading.access", "disputes.submit", "workspace.view_own", "workspace.submit"}),
    "teacher": frozenset(
        {
            "grading.access",
            "grading.manage",
            "feedback.dashboard",
            "disputes.review",
            "analytics",
            "health.detail",
            "workspace.manage",
        }
    ),
    "admin": frozenset(
        {
            "grading.access",
            "grading.manage",
            "feedback.dashboard",
            "disputes.review",
            "analytics",
            "health.detail",
            "workspace.manage",
        }
    ),
}


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(SECRET_KEY, salt="seewo-pi-auth-v1")


def issue_token(payload: dict[str, Any]) -> str:
    return _serializer().dumps(payload)


def load_token(token: str) -> dict[str, Any] | None:
    try:
        data = _serializer().loads(token, max_age=TOKEN_MAX_AGE_SECONDS)
    except (BadSignature, SignatureExpired):
        return None
    if not isinstance(data, dict):
        return None
    role = data.get("role")
    if role not in VALID_ROLES:
        return None
    return data


def student_needs_guardian(grade: int | None) -> bool:
    return grade is not None and 1 <= grade < GRADING_MIN_GRADE


def verify_guardian_passphrase(code: str) -> bool:
    return (code or "").strip() == GUARDIAN_DEMO_PASSPHRASE


def has_permission(role: str, perm: str) -> bool:
    return perm in ROLE_PERMISSIONS.get(role, frozenset())


def get_bearer_token() -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip() or None
    return request.headers.get("X-Auth-Token") or None


def current_user() -> dict[str, Any] | None:
    return getattr(g, "current_user", None)


def decode_student_name_header(raw: str | None) -> str:
    """解析 X-Student-Name（前端对中文做 URI 编码）。"""
    text = (raw or "").strip()
    if not text:
        return ""
    try:
        from urllib.parse import unquote

        decoded = unquote(text, encoding="utf-8", errors="replace")
        return decoded.strip()[:80]
    except Exception:
        return text[:80]


def resolve_student_profile_name(user: dict[str, Any] | None, header_value: str | None = None) -> str:
    """演示环境：学生姓名来自查询参数、请求头或令牌，用于师生任务匹配。"""
    if not user:
        return ""
    from flask import request

    q = (request.args.get("student_name") or "").strip()
    if q:
        return decode_student_name_header(q)[:80] or q[:80]

    hdr = decode_student_name_header(header_value or request.headers.get("X-Student-Name") or "")
    if hdr:
        return hdr

    role = str(user.get("role") or "")
    if role == "student":
        for key in ("student_name", "display_name"):
            v = str(user.get(key) or "").strip()
            if v:
                return v[:80]
    return str(user.get("student_name") or user.get("display_name") or "").strip()[:80]


def require_auth(*, optional: bool = False):
    def decorator(fn: Callable):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            token = get_bearer_token()
            user = load_token(token) if token else None
            g.current_user = user
            if not optional and not user:
                return jsonify({"ok": False, "message": "请先登录"}), 401
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def require_permission(*perms: str):
    def decorator(fn: Callable):
        @wraps(fn)
        @require_auth()
        def wrapper(*args, **kwargs):
            user = current_user()
            assert user is not None
            role = str(user.get("role", ""))
            if not any(has_permission(role, p) for p in perms):
                return jsonify({"ok": False, "message": "当前身份无此权限"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def require_any_permission(perms: Iterable[str]):
    return require_permission(*perms)
