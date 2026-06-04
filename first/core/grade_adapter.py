"""网页端数学批改适配层：复用 math_correct，不改动批改核心。"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

try:
    from math_correct import call_ai_math
except ImportError:
    call_ai_math = None


def math_process(
    image_path: str,
    *,
    grade_level: str = "",
    teacher_note: str = "",
    answer_key: str = "",
    answer_key_image: str = "",
    scoring_rubric: str = "",
) -> dict:
    if not image_path:
        return {
            "error": True,
            "score": "—",
            "comments": "未收到图片路径",
            "weak_points": [],
            "questions": [],
            "details": [],
        }
    if call_ai_math is None:
        return {
            "error": True,
            "score": "—",
            "comments": "数学批改模块加载失败，请检查 math_correct.py 是否存在。",
            "weak_points": [],
            "questions": [],
            "details": [],
        }

    try:
        data = call_ai_math(
            image_path,
            grade_level=grade_level,
            teacher_note=teacher_note,
            answer_key=answer_key,
            answer_key_image=answer_key_image,
            scoring_rubric=scoring_rubric,
        )
        if data and data.get("questions"):
            try:
                from math_correct import normalize_math_result

                data = normalize_math_result(data)
            except Exception:
                logger.exception("normalize_math_result failed")
    except Exception as e:
        logger.exception("math_process failed")
        return {
            "error": True,
            "score": "—",
            "comments": f"批改过程异常：{e}。请查看服务端日志或联系管理员。",
            "weak_points": [],
            "questions": [],
            "details": [],
        }
    if not data:
        return {
            "error": True,
            "score": "—",
            "comments": "批改失败，请检查图片清晰度、网络或 .env 中 MOONSHOT_API_KEY（Kimi）配置后重试。",
            "weak_points": [],
            "questions": [],
            "details": [],
        }

    questions = data.get("questions") or []
    try:
        avg_score = round(sum(float(q.get("total_score", 0) or 0) for q in questions) / len(questions), 1) if questions else 0
        score_pct = round(avg_score * 10)
    except (TypeError, ValueError):
        avg_score = 0
        score_pct = 0

    data["error"] = False
    data["score"] = f"{avg_score}/10"
    data["score_pct"] = max(0, min(100, score_pct))
    data["process_score_avg"] = max(0, min(100, score_pct))
    data["comments"] = data.get("personal_comment", "")
    data.setdefault("weak_points", [])
    data.setdefault("details", [])
    return data
