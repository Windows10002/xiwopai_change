"""演示环境固定账号（账号决定端别与展示姓名）。"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class DemoAccount:
    account: str
    password: str
    role: str
    display_name: str
    student_grade: int | None = None
    teaching_grades: str | None = None


DEMO_ACCOUNTS: tuple[DemoAccount, ...] = (
    DemoAccount(
        account="13800138001",
        password="123456",
        role="teacher",
        display_name="李老师",
        teaching_grades="七年级、八年级",
    ),
    DemoAccount(
        account="13800138002",
        password="123456",
        role="parent",
        display_name="张三家长",
    ),
    DemoAccount(
        account="13800138003",
        password="123456",
        role="student",
        display_name="张三",
        student_grade=7,
    ),
    DemoAccount(
        account="13800138004",
        password="123456",
        role="student",
        display_name="李四",
        student_grade=9,
    ),
    DemoAccount(
        account="13800138005",
        password="123456",
        role="admin",
        display_name="王教务",
    ),
)

_BY_ACCOUNT: dict[str, DemoAccount] = {a.account: a for a in DEMO_ACCOUNTS}


def lookup_demo_account(account: str, password: str) -> DemoAccount | None:
    rec = _BY_ACCOUNT.get((account or "").strip())
    if rec is None or rec.password != password:
        return None
    return rec


def demo_account_public_rows() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for a in DEMO_ACCOUNTS:
        row: dict[str, Any] = {
            "account": a.account,
            "role": a.role,
            "display_name": a.display_name,
        }
        if a.teaching_grades:
            row["teaching_grades"] = a.teaching_grades
        if a.student_grade is not None:
            row["student_grade"] = a.student_grade
        rows.append(row)
    return rows
