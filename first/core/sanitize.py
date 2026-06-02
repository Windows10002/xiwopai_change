"""输入清洗与截断（API 层共用）。"""
from __future__ import annotations


def clip_text(s: object, max_len: int) -> str:
    if s is None:
        return ""
    t = str(s).strip().replace("\r\n", "\n")
    return t[:max_len] if len(t) > max_len else t


def sanitize_grade_level(s: str) -> str:
    return clip_text(s, 48)


def sanitize_teacher_note(s: str) -> str:
    return clip_text(s, 1200)


def sanitize_essay_prompt(s: str) -> str:
    return clip_text(s, 2000)
