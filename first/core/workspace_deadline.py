"""作业截止时间：解析、逾期判断、是否允许交卷。"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def parse_due_at(iso: str | None) -> datetime | None:
    text = (iso or "").strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def is_assignment_overdue(assignment: dict[str, Any]) -> bool:
    due = parse_due_at(str(assignment.get("due_at") or ""))
    if not due:
        return False
    return datetime.now(timezone.utc) > due


def student_may_submit_assignment(assignment: dict[str, Any]) -> bool:
    """截止前可交；截止后仅当教师已开放补交入口。"""
    if not is_assignment_overdue(assignment):
        return True
    return bool(assignment.get("allow_late_submit"))


def enrich_assignment_deadline(assignment: dict[str, Any]) -> dict[str, Any]:
    overdue = is_assignment_overdue(assignment)
    allow_late = bool(assignment.get("allow_late_submit"))
    can_submit = student_may_submit_assignment(assignment)
    return {
        **assignment,
        "is_overdue": overdue,
        "allow_late_submit": allow_late,
        "can_submit": can_submit,
    }
