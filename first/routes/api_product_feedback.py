"""产品反馈（π 助手等入口）。"""
from __future__ import annotations

import csv
import io
import json
import logging
from datetime import datetime, timezone

from flask import Blueprint, Response, jsonify, request

from core.auth import current_user, require_permission
from core.config import PRODUCT_FEEDBACK_LOG
from core.sanitize import clip_text

logger = logging.getLogger(__name__)

product_feedback_bp = Blueprint("product_feedback", __name__)

_ALLOWED_CATEGORY = frozenset({"bug", "idea", "question"})
_CATEGORY_LABEL = {"bug": "问题/Bug", "idea": "功能建议", "question": "使用疑问"}


def _read_product_feedback_records(limit: int = 2000) -> list[dict]:
    if not PRODUCT_FEEDBACK_LOG.is_file():
        return []
    rows: list[dict] = []
    with open(PRODUCT_FEEDBACK_LOG, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(row, dict):
                rows.append(row)
    rows.sort(key=lambda r: str(r.get("saved_at", "")), reverse=True)
    return rows[:limit]


def _filter_records(
    records: list[dict],
    *,
    category: str | None,
    role: str | None,
    path_contains: str | None,
) -> list[dict]:
    out = records
    if category and category in _ALLOWED_CATEGORY:
        out = [r for r in out if (r.get("category") or "") == category]
    if role:
        out = [r for r in out if (r.get("role") or "") == role]
    if path_contains:
        needle = path_contains.lower()
        out = [r for r in out if needle in str(r.get("path") or "").lower()]
    return out


@product_feedback_bp.route("/api/product-feedback", methods=["POST"])
def api_product_feedback():
    if not request.is_json:
        return jsonify({"ok": False, "message": "请求需为 JSON"}), 400
    body = request.get_json(silent=True) or {}
    message = (body.get("message") or "").strip()
    if len(message) < 6:
        return jsonify({"ok": False, "message": "请至少用 6 个字描述问题或建议。"}), 400

    category = clip_text(body.get("category"), 16) or "idea"
    if category not in _ALLOWED_CATEGORY:
        category = "idea"

    user = current_user()
    record = {
        "saved_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "category": category,
        "message": clip_text(message, 4000),
        "contact": clip_text(body.get("contact"), 120),
        "path": clip_text(body.get("path"), 200),
        "role": clip_text(body.get("role"), 24),
        "client_version": clip_text(body.get("client_version"), 40),
        "user_sub": clip_text(user.get("sub") if user else None, 64),
    }

    try:
        PRODUCT_FEEDBACK_LOG.parent.mkdir(parents=True, exist_ok=True)
        with open(PRODUCT_FEEDBACK_LOG, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")
    except OSError:
        logger.exception("product feedback write error")
        return jsonify({"ok": False, "message": "服务器暂无法保存反馈，请稍后重试。"}), 500

    return jsonify({"ok": True})


@product_feedback_bp.route("/api/product-feedback", methods=["GET"])
@require_permission("feedback.dashboard")
def api_product_feedback_list():
    try:
        limit = min(max(int(request.args.get("limit", 50)), 1), 200)
        offset = max(int(request.args.get("offset", 0)), 0)
    except ValueError:
        return jsonify({"ok": False, "message": "分页参数无效"}), 400

    category = clip_text(request.args.get("category"), 16) or None
    role = clip_text(request.args.get("role"), 24) or None
    path_contains = clip_text(request.args.get("path"), 80) or None

    all_rows = _read_product_feedback_records()
    filtered = _filter_records(all_rows, category=category, role=role, path_contains=path_contains)
    total = len(filtered)

    by_category: dict[str, int] = {}
    by_role: dict[str, int] = {}
    for r in filtered:
        cat = (r.get("category") or "idea").strip()
        by_category[cat] = by_category.get(cat, 0) + 1
        rl = (r.get("role") or "unknown").strip() or "unknown"
        by_role[rl] = by_role.get(rl, 0) + 1

    page = filtered[offset : offset + limit]
    return jsonify(
        {
            "ok": True,
            "total": total,
            "offset": offset,
            "limit": limit,
            "by_category": by_category,
            "by_role": by_role,
            "category_labels": _CATEGORY_LABEL,
            "items": page,
        }
    )


@product_feedback_bp.route("/api/product-feedback/export", methods=["GET"])
@require_permission("feedback.dashboard")
def api_product_feedback_export():
    fmt = (request.args.get("format") or "csv").strip().lower()
    category = clip_text(request.args.get("category"), 16) or None
    role = clip_text(request.args.get("role"), 24) or None
    path_contains = clip_text(request.args.get("path"), 80) or None

    all_rows = _read_product_feedback_records()
    rows = _filter_records(all_rows, category=category, role=role, path_contains=path_contains)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    if fmt == "jsonl":
        body = "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows)
        return Response(
            body,
            mimetype="application/x-ndjson",
            headers={"Content-Disposition": f'attachment; filename="product_feedback_{stamp}.jsonl"'},
        )

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        ["saved_at", "category", "role", "path", "message", "contact", "user_sub", "client_version"]
    )
    for r in rows:
        writer.writerow(
            [
                r.get("saved_at", ""),
                r.get("category", ""),
                r.get("role", ""),
                r.get("path", ""),
                r.get("message", ""),
                r.get("contact", ""),
                r.get("user_sub", ""),
                r.get("client_version", ""),
            ]
        )
    return Response(
        "\ufeff" + buf.getvalue(),
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="product_feedback_{stamp}.csv"'},
    )
