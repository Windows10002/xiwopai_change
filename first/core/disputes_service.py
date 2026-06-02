"""判题异议：JSONL 存储与审核。不改动批改核心逻辑。"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _clip(s: object, max_len: int) -> str:
    if s is None:
        return ""
    t = str(s).strip().replace("\r\n", "\n")
    return t[:max_len] if len(t) > max_len else t


class DisputesStore:
    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)

    def _read_all(self) -> list[dict[str, Any]]:
        if not self.path.is_file():
            return []
        rows: list[dict[str, Any]] = []
        with open(self.path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    rows.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        return rows

    def _write_all(self, rows: list[dict[str, Any]]) -> None:
        with open(self.path, "w", encoding="utf-8") as fh:
            for r in rows:
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        user_feedback = (payload.get("user_feedback") or "").strip()
        if len(user_feedback) < 8:
            raise ValueError("请至少用 8 个字说明申诉理由")

        record: dict[str, Any] = {
            "id": uuid.uuid4().hex,
            "created_at": _now_iso(),
            "status": "pending",
            "submitter_role": _clip(payload.get("submitter_role"), 16) or "student",
            "student_grade": payload.get("student_grade"),
            "feedback_scope": _clip(payload.get("feedback_scope"), 24) or "question",
            "subject": _clip(payload.get("subject"), 16),
            "dimension_key": _clip(payload.get("dimension_key"), 160),
            "dimension_label": _clip(payload.get("dimension_label"), 400),
            "status_snapshot": _clip(payload.get("status"), 40),
            "value": payload.get("value"),
            "max": payload.get("max"),
            "detail_excerpt": _clip(payload.get("detail_excerpt"), 1200),
            "user_feedback": _clip(user_feedback, 4000),
            "job_file_base": _clip(payload.get("job_file_base"), 160),
            "subject_title": _clip(payload.get("subject_title"), 80),
            "overall_label": _clip(payload.get("overall_label"), 200),
            "score_percent": payload.get("score_percent"),
            "image_ref": _clip(payload.get("image_ref"), 240),
            "image_url": _clip(payload.get("image_url"), 500),
            "history_entry_id": _clip(payload.get("history_entry_id"), 80),
            "local_file_name": _clip(payload.get("local_file_name"), 240),
            "batch_index": payload.get("batch_index"),
            "batch_total": payload.get("batch_total"),
            "teacher_reply": "",
            "reviewed_at": "",
        }
        with open(self.path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")
        return record

    def list_items(
        self,
        *,
        status: str | None = None,
        ids: list[str] | None = None,
        limit: int = 200,
    ) -> list[dict[str, Any]]:
        rows = self._read_all()
        if ids:
            id_set = set(ids)
            rows = [r for r in rows if r.get("id") in id_set]
        if status:
            rows = [r for r in rows if r.get("status") == status]
        rows.sort(key=lambda r: r.get("created_at", ""), reverse=True)
        return rows[:limit]

    def review(self, dispute_id: str, action: str, teacher_reply: str = "") -> dict[str, Any]:
        rows = self._read_all()
        found = None
        for r in rows:
            if r.get("id") == dispute_id:
                found = r
                break
        if not found:
            raise ValueError("未找到该申诉")
        if found.get("status") != "pending":
            raise ValueError("该申诉已处理")

        if action == "confirm":
            found["status"] = "confirmed"
        elif action == "reject":
            if len(teacher_reply.strip()) < 4:
                raise ValueError("驳回时请至少用 4 个字说明理由")
            found["status"] = "rejected"
        else:
            raise ValueError("无效操作")

        found["teacher_reply"] = _clip(teacher_reply, 2000)
        found["reviewed_at"] = _now_iso()
        self._write_all(rows)
        return found

    def count_pending(self) -> int:
        return sum(1 for r in self._read_all() if r.get("status") == "pending")
