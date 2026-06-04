"""π 智能助手 LLM API。"""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from core.auth import current_user
from core.pi_assistant_service import (
    ASSISTANT_PROVIDER,
    DISCLAIMER,
    chat_completion,
    llm_available,
    max_rounds_for_role,
    normalize_messages,
)
from core.sanitize import clip_text

assistant_bp = Blueprint("assistant", __name__)

_VALID_ROLES = frozenset({"teacher", "student", "parent", "admin", "guest"})


def _resolve_role(body_role: str | None) -> str:
    user = current_user()
    if user:
        role = str(user.get("role", "")).strip()
        if role in _VALID_ROLES:
            return role
    r = (body_role or "guest").strip()
    return r if r in _VALID_ROLES else "guest"


@assistant_bp.route("/api/assistant/config", methods=["GET"])
def api_assistant_config():
    return jsonify(
        {
            "ok": True,
            "llm_available": llm_available(),
            "max_rounds_default": max_rounds_for_role("student"),
            "max_rounds_teacher": max_rounds_for_role("teacher"),
            "max_rounds_admin": max_rounds_for_role("admin"),
            "disclaimer": DISCLAIMER,
            "provider": ASSISTANT_PROVIDER,
        }
    )


@assistant_bp.route("/api/assistant/chat", methods=["POST"])
def api_assistant_chat():
    if not llm_available():
        return jsonify({"ok": False, "message": "智能问答未启用：请在 .env 配置 AGNES_API_KEY"}), 503

    if not request.is_json:
        return jsonify({"ok": False, "message": "请求需为 JSON"}), 400

    body = request.get_json(silent=True) or {}
    raw_messages = body.get("messages")
    if not isinstance(raw_messages, list) or not raw_messages:
        return jsonify({"ok": False, "message": "请提供 messages 对话历史"}), 400

    messages = normalize_messages(raw_messages)
    if not messages or messages[-1]["role"] != "user":
        return jsonify({"ok": False, "message": "最后一条消息须为用户提问"}), 400

    user_turns = sum(1 for m in messages if m["role"] == "user")
    role = _resolve_role(clip_text(body.get("role"), 24))
    max_rounds = max_rounds_for_role(role)
    if user_turns > max_rounds:
        return jsonify(
            {
                "ok": False,
                "message": f"本轮对话已达上限（{max_rounds} 轮），请关闭助手后重新开始。",
                "max_rounds": max_rounds,
            }
        ), 429

    path = clip_text(body.get("path"), 200) or "/"
    extra_context = clip_text(body.get("context"), 3000) or ""
    reply, err = chat_completion(messages=messages, role=role, path=path, extra_context=extra_context)
    if err or not reply:
        return jsonify({"ok": False, "message": err or "生成失败", "fallback_rules": True}), 502

    return jsonify(
        {
            "ok": True,
            "reply": reply,
            "disclaimer": DISCLAIMER,
            "rounds_used": user_turns,
            "max_rounds": max_rounds,
        }
    )
