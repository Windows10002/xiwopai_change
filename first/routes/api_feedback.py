"""教师反馈 API。"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from core.auth import require_permission
from core.config import GRADING_FEEDBACK_LOG
from core.sanitize import clip_text

logger = logging.getLogger(__name__)

feedback_bp = Blueprint("feedback", __name__)


def _read_feedback_records(limit: int = 500) -> list:
    if not GRADING_FEEDBACK_LOG.is_file():
        return []
    rows = []
    with open(GRADING_FEEDBACK_LOG, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    rows.sort(key=lambda r: r.get("saved_at", ""), reverse=True)
    return rows[:limit]


@feedback_bp.route("/api/grading-feedback", methods=["POST"])
@require_permission("grading.manage")
def api_grading_feedback():
    if not request.is_json:
        return jsonify({"ok": False, "message": "请求需为 JSON"}), 400
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"ok": False, "message": "无效请求体"}), 400

    user_feedback = (payload.get("user_feedback") or "").strip()
    if len(user_feedback) < 8:
        return jsonify({"ok": False, "message": "请至少用 8 个字说明判题问题，便于后续优化模型。"}), 400

    record = {
        "saved_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "feedback_scope": clip_text(payload.get("feedback_scope"), 24) or "question",
        "subject": clip_text(payload.get("subject"), 16),
        "dimension_key": clip_text(payload.get("dimension_key"), 160),
        "dimension_label": clip_text(payload.get("dimension_label"), 400),
        "status": clip_text(payload.get("status"), 40),
        "value": payload.get("value"),
        "max": payload.get("max"),
        "detail_excerpt": clip_text(payload.get("detail_excerpt"), 1200),
        "user_feedback": clip_text(user_feedback, 4000),
        "job_file_base": clip_text(payload.get("job_file_base"), 160),
        "subject_title": clip_text(payload.get("subject_title"), 80),
        "overall_label": clip_text(payload.get("overall_label"), 200),
        "score_percent": payload.get("score_percent"),
        "client_ts": payload.get("client_ts"),
        "image_ref": clip_text(payload.get("image_ref"), 240),
        "image_url": clip_text(payload.get("image_url"), 500),
        "history_entry_id": clip_text(payload.get("history_entry_id"), 80),
        "local_file_name": clip_text(payload.get("local_file_name"), 240),
        "batch_index": payload.get("batch_index"),
        "batch_total": payload.get("batch_total"),
    }

    try:
        with open(GRADING_FEEDBACK_LOG, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")
    except OSError:
        logger.exception("grading feedback write error")
        return jsonify({"ok": False, "message": "服务器暂无法写入反馈，请稍后重试。"}), 500

    return jsonify({"ok": True})


@feedback_bp.route("/api/grading-feedback", methods=["GET"])
@require_permission("feedback.dashboard")
def api_grading_feedback_list():
    records = _read_feedback_records()
    by_subject: dict[str, int] = {}
    by_scope: dict[str, int] = {}
    dim_counter: dict[str, int] = {}
    for r in records:
        sub = (r.get("subject") or "unknown").strip()
        by_subject[sub] = by_subject.get(sub, 0) + 1
        sc = (r.get("feedback_scope") or "question").strip()
        by_scope[sc] = by_scope.get(sc, 0) + 1
        label = (r.get("dimension_label") or r.get("overall_label") or "整卷").strip()[:60]
        dim_counter[label] = dim_counter.get(label, 0) + 1
    top_dims = sorted(dim_counter.items(), key=lambda x: -x[1])[:12]
    return jsonify(
        {
            "ok": True,
            "total": len(records),
            "by_subject": by_subject,
            "by_scope": by_scope,
            "top_dimensions": [{"label": k, "count": v} for k, v in top_dims],
            "recent": records[:30],
        }
    )


feedback_bp.read_feedback_records = _read_feedback_records  # type: ignore[attr-defined]
