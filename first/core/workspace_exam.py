"""课堂考试模式：交卷方式、参考答案对学生可见性。"""
from __future__ import annotations

from typing import Any

SUBMISSION_MODES = frozenset({"student", "teacher", "both"})


def normalize_submission_mode(mode: str | None) -> str:
    m = (mode or "both").strip().lower()
    return m if m in SUBMISSION_MODES else "both"


def allows_student_submit(assignment: dict[str, Any]) -> bool:
    return normalize_submission_mode(assignment.get("submission_mode")) in {"student", "both"}


def answer_visible_to_student(assignment: dict[str, Any]) -> bool:
    if not bool(assignment.get("hide_answer_from_student")):
        return True
    return bool(str(assignment.get("answer_released_at") or "").strip())


def strip_assignment_answers_for_viewer(assignment: dict[str, Any]) -> dict[str, Any]:
    """对学生/家长隐藏尚未开放的参考答案。"""
    out = {**assignment}
    if answer_visible_to_student(out):
        return out
    out["answer_key"] = ""
    out["answer_key_image"] = ""
    out["answer_key_image_url"] = ""
    return out


def enrich_exam_fields(assignment: dict[str, Any]) -> dict[str, Any]:
    out = {**assignment}
    mode = normalize_submission_mode(out.get("submission_mode"))
    out["submission_mode"] = mode
    out["allows_student_submit"] = allows_student_submit(out)
    released = bool(str(out.get("answer_released_at") or "").strip())
    out["answer_released"] = released
    out["answer_visible_to_student"] = answer_visible_to_student(out)
    return out
