"""从批改结果 JSON 提取统一得分（百分制）。"""
from __future__ import annotations

import re
from typing import Any


def score_percent_from_result(result: dict[str, Any] | None) -> float | None:
    if not result or result.get("error"):
        return None
    for key in ("score_pct", "process_score_avg"):
        raw = result.get(key)
        if raw is not None:
            try:
                return max(0.0, min(100.0, float(raw)))
            except (TypeError, ValueError):
                pass
    questions = result.get("questions")
    if isinstance(questions, list) and questions:
        try:
            total = sum(float(q.get("total_score", 0) or 0) for q in questions if isinstance(q, dict))
            avg = total / len(questions)
            return max(0.0, min(100.0, round(avg * 10, 1)))
        except (TypeError, ValueError, ZeroDivisionError):
            pass
    score_raw = str(result.get("score") or "").strip()
    if score_raw:
        m = re.search(r"(\d+(?:\.\d+)?)\s*/\s*10", score_raw)
        if m:
            try:
                return max(0.0, min(100.0, round(float(m.group(1)) * 10, 1)))
            except ValueError:
                pass
        m2 = re.search(r"(\d+(?:\.\d+)?)\s*%", score_raw)
        if m2:
            try:
                return max(0.0, min(100.0, float(m2.group(1))))
            except ValueError:
                pass
    return None
