"""批量学情分析 API。"""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from core.auth import require_permission
from core.sanitize import clip_text, sanitize_grade_level, sanitize_teacher_note

insights_bp = Blueprint("insights", __name__)

try:
    from core.batch_insights_service import run_batch_insights
except ImportError:

    def run_batch_insights(*args, **kwargs):
        return {"ok": False, "message": "学情分析模块未加载"}


@insights_bp.route("/api/grading/batch-insights", methods=["POST"])
@require_permission("grading.access")
def api_batch_insights():
    if not request.is_json:
        return jsonify({"ok": False, "message": "请求需为 JSON"}), 400
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"ok": False, "message": "无效请求体"}), 400

    subject = (body.get("subject") or "math").strip()
    items = body.get("items")
    if not isinstance(items, list) or not items:
        return jsonify({"ok": False, "message": "items 不能为空"}), 400

    safe_items = []
    for it in items[:80]:
        if not isinstance(it, dict):
            continue
        safe_items.append(
            {
                "file_name": clip_text(it.get("file_name"), 200),
                "score_percent": it.get("score_percent") if isinstance(it.get("score_percent"), (int, float)) else 0,
                "overall_label": clip_text(it.get("overall_label"), 120),
                "weak_points": [str(x)[:80] for x in (it.get("weak_points") or [])[:20] if str(x).strip()],
                "dimensions": [
                    {
                        "label": clip_text(d.get("label"), 200),
                        "status": clip_text(d.get("status"), 40),
                        "detail": clip_text(d.get("detail"), 400),
                        "is_error": bool(d.get("is_error")),
                    }
                    for d in (it.get("dimensions") or [])[:60]
                    if isinstance(d, dict)
                ],
            }
        )

    result = run_batch_insights(
        subject,
        safe_items,
        grade_level=sanitize_grade_level(body.get("grade_level") or ""),
        teacher_note=sanitize_teacher_note(body.get("teacher_note") or ""),
        group_name=clip_text(body.get("group_name"), 120),
        use_llm=body.get("use_llm", True) is not False,
        analysis_mode=clip_text(body.get("analysis_mode"), 32) or "batch",
        student_name=clip_text(body.get("student_name"), 48),
    )
    if not result.get("ok"):
        return jsonify(result), 400
    return jsonify(result)
