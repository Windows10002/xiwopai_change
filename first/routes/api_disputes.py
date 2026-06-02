"""判题申诉 API。"""
from __future__ import annotations

import logging

from flask import Blueprint, current_app, jsonify, request

from core.auth import require_permission
from core.sanitize import clip_text

logger = logging.getLogger(__name__)

disputes_bp = Blueprint("disputes", __name__)


def _store():
    return current_app.config.get("DISPUTES_STORE")


@disputes_bp.route("/api/grading-disputes", methods=["POST"])
@require_permission("disputes.submit", "grading.manage")
def api_disputes_create():
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "异议模块未加载"}), 500
    if not request.is_json:
        return jsonify({"ok": False, "message": "请求需为 JSON"}), 400
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"ok": False, "message": "无效请求体"}), 400
    try:
        record = store.create(payload)
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    except OSError:
        logger.exception("dispute write error")
        return jsonify({"ok": False, "message": "服务器暂无法保存申诉"}), 500
    return jsonify({"ok": True, "id": record["id"]})


@disputes_bp.route("/api/grading-disputes", methods=["GET"])
@require_permission("disputes.review")
def api_disputes_list():
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "异议模块未加载"}), 500
    status = (request.args.get("status") or "").strip() or None
    ids_raw = (request.args.get("ids") or "").strip()
    ids = [x.strip() for x in ids_raw.split(",") if x.strip()] if ids_raw else None
    items = store.list_items(status=status, ids=ids)
    pending_count = store.count_pending()
    return jsonify({"ok": True, "items": items, "pending_count": pending_count})


@disputes_bp.route("/api/grading-disputes/<dispute_id>/review", methods=["POST"])
@require_permission("disputes.review")
def api_disputes_review(dispute_id: str):
    store = _store()
    if store is None:
        return jsonify({"ok": False, "message": "异议模块未加载"}), 500
    if not request.is_json:
        return jsonify({"ok": False, "message": "请求需为 JSON"}), 400
    body = request.get_json(silent=True) or {}
    action = (body.get("action") or "").strip()
    teacher_reply = clip_text(body.get("teacher_reply"), 2000)
    try:
        store.review(dispute_id, action, teacher_reply)
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    except OSError:
        logger.exception("dispute review error")
        return jsonify({"ok": False, "message": "审核保存失败"}), 500
    return jsonify({"ok": True})
