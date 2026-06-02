"""判题异议：SQLite 存储与审核。不改动批改核心逻辑。"""
from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from core.sanitize import clip_text

_lock = threading.Lock()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class DisputesStore:
    def __init__(self, db_path: str | Path) -> None:
        self.db_path = Path(db_path)
        self._init_db()
        self._maybe_import_jsonl()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=30)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with _lock:
            with self._connect() as conn:
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS disputes (
                        id TEXT PRIMARY KEY,
                        created_at TEXT NOT NULL,
                        status TEXT NOT NULL,
                        payload_json TEXT NOT NULL
                    )
                    """
                )
                conn.execute("CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status)")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_disputes_created ON disputes(created_at DESC)")

    def _maybe_import_jsonl(self) -> None:
        jsonl = self.db_path.with_suffix(".jsonl")
        if not jsonl.is_file():
            return
        try:
            text = jsonl.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = jsonl.read_text(encoding="utf-8", errors="ignore")
        with _lock:
            with self._connect() as conn:
                n = conn.execute("SELECT COUNT(*) FROM disputes").fetchone()[0]
                if n > 0:
                    return
                for line in text.splitlines():
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        rec = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    rid = rec.get("id") or uuid.uuid4().hex
                    conn.execute(
                        "INSERT OR IGNORE INTO disputes (id, created_at, status, payload_json) VALUES (?, ?, ?, ?)",
                        (
                            rid,
                            rec.get("created_at") or _now_iso(),
                            rec.get("status") or "pending",
                            json.dumps(rec, ensure_ascii=False),
                        ),
                    )

    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        user_feedback = (payload.get("user_feedback") or "").strip()
        if len(user_feedback) < 8:
            raise ValueError("请至少用 8 个字说明申诉理由")

        record: dict[str, Any] = {
            "id": uuid.uuid4().hex,
            "created_at": _now_iso(),
            "status": "pending",
            "submitter_role": clip_text(payload.get("submitter_role"), 16) or "student",
            "student_grade": payload.get("student_grade"),
            "feedback_scope": clip_text(payload.get("feedback_scope"), 24) or "question",
            "subject": clip_text(payload.get("subject"), 16),
            "dimension_key": clip_text(payload.get("dimension_key"), 160),
            "dimension_label": clip_text(payload.get("dimension_label"), 400),
            "status_snapshot": clip_text(payload.get("status"), 40),
            "value": payload.get("value"),
            "max": payload.get("max"),
            "detail_excerpt": clip_text(payload.get("detail_excerpt"), 1200),
            "user_feedback": clip_text(user_feedback, 4000),
            "job_file_base": clip_text(payload.get("job_file_base"), 160),
            "subject_title": clip_text(payload.get("subject_title"), 80),
            "overall_label": clip_text(payload.get("overall_label"), 200),
            "score_percent": payload.get("score_percent"),
            "image_ref": clip_text(payload.get("image_ref"), 240),
            "image_url": clip_text(payload.get("image_url"), 500),
            "history_entry_id": clip_text(payload.get("history_entry_id"), 80),
            "local_file_name": clip_text(payload.get("local_file_name"), 240),
            "batch_index": payload.get("batch_index"),
            "batch_total": payload.get("batch_total"),
            "teacher_reply": "",
            "reviewed_at": "",
        }
        with _lock:
            with self._connect() as conn:
                conn.execute(
                    "INSERT INTO disputes (id, created_at, status, payload_json) VALUES (?, ?, ?, ?)",
                    (record["id"], record["created_at"], record["status"], json.dumps(record, ensure_ascii=False)),
                )
        return record

    def list_items(
        self,
        *,
        status: str | None = None,
        ids: list[str] | None = None,
        limit: int = 200,
    ) -> list[dict[str, Any]]:
        clauses: list[str] = []
        params: list[Any] = []
        if status:
            clauses.append("status = ?")
            params.append(status)
        if ids:
            placeholders = ",".join("?" * len(ids))
            clauses.append(f"id IN ({placeholders})")
            params.extend(ids)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        sql = f"SELECT payload_json FROM disputes {where} ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        with _lock:
            with self._connect() as conn:
                rows = conn.execute(sql, params).fetchall()
        out: list[dict[str, Any]] = []
        for row in rows:
            try:
                out.append(json.loads(row["payload_json"]))
            except json.JSONDecodeError:
                continue
        return out

    def review(self, dispute_id: str, action: str, teacher_reply: str = "") -> dict[str, Any]:
        with _lock:
            with self._connect() as conn:
                row = conn.execute("SELECT payload_json FROM disputes WHERE id = ?", (dispute_id,)).fetchone()
                if not row:
                    raise ValueError("未找到该申诉")
                found = json.loads(row["payload_json"])
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
                found["teacher_reply"] = clip_text(teacher_reply, 2000)
                found["reviewed_at"] = _now_iso()
                conn.execute(
                    "UPDATE disputes SET status = ?, payload_json = ? WHERE id = ?",
                    (found["status"], json.dumps(found, ensure_ascii=False), dispute_id),
                )
        return found

    def count_pending(self) -> int:
        with _lock:
            with self._connect() as conn:
                return int(conn.execute("SELECT COUNT(*) FROM disputes WHERE status = 'pending'").fetchone()[0])
