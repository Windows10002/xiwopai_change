"""师生闭环：任务、提交、批改报告、变式题（SQLite）。"""
from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from core.sanitize import clip_text, sanitize_grade_level, sanitize_teacher_note

_lock = threading.Lock()

SUBMISSION_STATUSES = frozenset(
    {
        "submitted",
        "grading",
        "graded",
        "published",
        "correction_pending",
        "correction_done",
        "closed",
    }
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _norm_student_name(name: str | None) -> str:
    return (name or "").strip()


def _names_match(a: str | None, b: str | None) -> bool:
    na, nb = _norm_student_name(a).casefold(), _norm_student_name(b).casefold()
    return bool(na and nb and na == nb)


class WorkspaceStore:
    def __init__(self, db_path: str | Path) -> None:
        self.db_path = Path(db_path)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=30)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with _lock:
            with self._connect() as conn:
                conn.executescript(
                    """
                    CREATE TABLE IF NOT EXISTS assignments (
                        id TEXT PRIMARY KEY,
                        teacher_sub TEXT NOT NULL,
                        class_name TEXT NOT NULL DEFAULT '',
                        subject TEXT NOT NULL,
                        title TEXT NOT NULL,
                        description TEXT NOT NULL DEFAULT '',
                        due_at TEXT,
                        status TEXT NOT NULL DEFAULT 'draft',
                        target_student_names_json TEXT NOT NULL DEFAULT '[]',
                        created_at TEXT NOT NULL,
                        published_at TEXT
                    );
                    CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_sub, created_at DESC);
                    CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);

                    CREATE TABLE IF NOT EXISTS submissions (
                        id TEXT PRIMARY KEY,
                        assignment_id TEXT,
                        teacher_sub TEXT NOT NULL DEFAULT '',
                        student_name TEXT NOT NULL DEFAULT '',
                        student_sub TEXT NOT NULL DEFAULT '',
                        submitted_by_role TEXT NOT NULL,
                        subject TEXT NOT NULL,
                        file_name TEXT NOT NULL DEFAULT '',
                        image_filename TEXT NOT NULL,
                        image_url TEXT NOT NULL DEFAULT '',
                        status TEXT NOT NULL DEFAULT 'submitted',
                        grade_level TEXT NOT NULL DEFAULT '',
                        teacher_note TEXT NOT NULL DEFAULT '',
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        published_at TEXT,
                        correction_note TEXT NOT NULL DEFAULT '',
                        correction_reviewed_at TEXT,
                        correction_review_status TEXT NOT NULL DEFAULT '',
                        FOREIGN KEY (assignment_id) REFERENCES assignments(id)
                    );
                    CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_name, created_at DESC);
                    CREATE INDEX IF NOT EXISTS idx_submissions_teacher ON submissions(teacher_sub, created_at DESC);
                    CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);

                    CREATE TABLE IF NOT EXISTS grading_records (
                        id TEXT PRIMARY KEY,
                        submission_id TEXT NOT NULL UNIQUE,
                        result_json TEXT NOT NULL,
                        graded_by TEXT NOT NULL DEFAULT 'ai',
                        teacher_override INTEGER NOT NULL DEFAULT 0,
                        published INTEGER NOT NULL DEFAULT 0,
                        version INTEGER NOT NULL DEFAULT 1,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (submission_id) REFERENCES submissions(id)
                    );

                    CREATE TABLE IF NOT EXISTS variant_tasks (
                        id TEXT PRIMARY KEY,
                        submission_id TEXT NOT NULL,
                        grading_record_id TEXT NOT NULL,
                        student_name TEXT NOT NULL,
                        teacher_sub TEXT NOT NULL DEFAULT '',
                        knowledge_point TEXT NOT NULL DEFAULT '',
                        stem TEXT NOT NULL,
                        answer_hint TEXT NOT NULL DEFAULT '',
                        status TEXT NOT NULL DEFAULT 'assigned',
                        assigned_at TEXT NOT NULL,
                        done_at TEXT,
                        FOREIGN KEY (submission_id) REFERENCES submissions(id)
                    );
                    CREATE INDEX IF NOT EXISTS idx_variants_student ON variant_tasks(student_name, status);
                    """
                )

    def create_assignment(
        self,
        *,
        teacher_sub: str,
        subject: str,
        title: str,
        description: str = "",
        class_name: str = "",
        due_at: str | None = None,
        target_student_names: list[str] | None = None,
        publish: bool = False,
    ) -> dict[str, Any]:
        if subject not in {"math", "english"}:
            raise ValueError("科目仅支持 math / english")
        title = clip_text(title, 200)
        if len(title) < 2:
            raise ValueError("任务标题至少 2 个字")
        names = [_norm_student_name(n) for n in (target_student_names or []) if _norm_student_name(n)]
        now = _now_iso()
        rec = {
            "id": uuid.uuid4().hex,
            "teacher_sub": clip_text(teacher_sub, 80),
            "class_name": clip_text(class_name, 80),
            "subject": subject,
            "title": title,
            "description": clip_text(description, 2000),
            "due_at": due_at or "",
            "status": "published" if publish else "draft",
            "target_student_names": names,
            "created_at": now,
            "published_at": now if publish else "",
        }
        with _lock:
            with self._connect() as conn:
                conn.execute(
                    """
                    INSERT INTO assignments (
                        id, teacher_sub, class_name, subject, title, description,
                        due_at, status, target_student_names_json, created_at, published_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        rec["id"],
                        rec["teacher_sub"],
                        rec["class_name"],
                        rec["subject"],
                        rec["title"],
                        rec["description"],
                        rec["due_at"],
                        rec["status"],
                        json.dumps(names, ensure_ascii=False),
                        rec["created_at"],
                        rec["published_at"],
                    ),
                )
        return rec

    def publish_assignment(self, assignment_id: str, teacher_sub: str) -> dict[str, Any]:
        now = _now_iso()
        with _lock:
            with self._connect() as conn:
                row = conn.execute("SELECT * FROM assignments WHERE id = ?", (assignment_id,)).fetchone()
                if not row:
                    raise ValueError("未找到该任务")
                if row["teacher_sub"] != teacher_sub:
                    raise ValueError("无权操作该任务")
                conn.execute(
                    "UPDATE assignments SET status = 'published', published_at = ? WHERE id = ?",
                    (now, assignment_id),
                )
        return self.get_assignment(assignment_id) or {}

    def get_assignment(self, assignment_id: str) -> dict[str, Any] | None:
        with _lock:
            with self._connect() as conn:
                row = conn.execute("SELECT * FROM assignments WHERE id = ?", (assignment_id,)).fetchone()
        return self._assignment_row(row) if row else None

    def list_assignments(
        self,
        *,
        teacher_sub: str | None = None,
        student_name: str | None = None,
        status: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        clauses: list[str] = []
        params: list[Any] = []
        if teacher_sub:
            clauses.append("teacher_sub = ?")
            params.append(teacher_sub)
        if status:
            clauses.append("status = ?")
            params.append(status)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        sql = f"SELECT * FROM assignments {where} ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        with _lock:
            with self._connect() as conn:
                rows = conn.execute(sql, params).fetchall()
        items = [self._assignment_row(r) for r in rows]
        if student_name:
            sn = _norm_student_name(student_name)
            items = [
                a
                for a in items
                if a["status"] == "published"
                and (not a["target_student_names"] or sn in a["target_student_names"])
            ]
        return items

    def _assignment_row(self, row: sqlite3.Row) -> dict[str, Any]:
        try:
            names = json.loads(row["target_student_names_json"] or "[]")
        except json.JSONDecodeError:
            names = []
        return {
            "id": row["id"],
            "teacher_sub": row["teacher_sub"],
            "class_name": row["class_name"],
            "subject": row["subject"],
            "title": row["title"],
            "description": row["description"],
            "due_at": row["due_at"],
            "status": row["status"],
            "target_student_names": names if isinstance(names, list) else [],
            "created_at": row["created_at"],
            "published_at": row["published_at"],
        }

    def create_submission(
        self,
        *,
        assignment_id: str | None,
        teacher_sub: str,
        student_name: str,
        student_sub: str,
        submitted_by_role: str,
        subject: str,
        file_name: str,
        image_filename: str,
        image_url: str,
        grade_level: str = "",
        teacher_note: str = "",
        status: str = "submitted",
    ) -> dict[str, Any]:
        now = _now_iso()
        if status not in SUBMISSION_STATUSES:
            status = "submitted"
        rec = {
            "id": uuid.uuid4().hex,
            "assignment_id": assignment_id or "",
            "teacher_sub": clip_text(teacher_sub, 80),
            "student_name": clip_text(_norm_student_name(student_name), 80),
            "student_sub": clip_text(student_sub, 80),
            "submitted_by_role": clip_text(submitted_by_role, 16),
            "subject": subject,
            "file_name": clip_text(file_name, 240),
            "image_filename": clip_text(image_filename, 240),
            "image_url": clip_text(image_url, 500),
            "status": status,
            "grade_level": sanitize_grade_level(grade_level),
            "teacher_note": sanitize_teacher_note(teacher_note),
            "created_at": now,
            "updated_at": now,
            "published_at": "",
            "correction_note": "",
            "correction_reviewed_at": "",
            "correction_review_status": "",
        }
        with _lock:
            with self._connect() as conn:
                conn.execute(
                    """
                    INSERT INTO submissions (
                        id, assignment_id, teacher_sub, student_name, student_sub,
                        submitted_by_role, subject, file_name, image_filename, image_url,
                        status, grade_level, teacher_note, created_at, updated_at,
                        published_at, correction_note, correction_reviewed_at, correction_review_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        rec["id"],
                        rec["assignment_id"] or None,
                        rec["teacher_sub"],
                        rec["student_name"],
                        rec["student_sub"],
                        rec["submitted_by_role"],
                        rec["subject"],
                        rec["file_name"],
                        rec["image_filename"],
                        rec["image_url"],
                        rec["status"],
                        rec["grade_level"],
                        rec["teacher_note"],
                        rec["created_at"],
                        rec["updated_at"],
                        rec["published_at"],
                        rec["correction_note"],
                        rec["correction_reviewed_at"],
                        rec["correction_review_status"],
                    ),
                )
        return rec

    def save_grading_record(
        self,
        submission_id: str,
        result: dict[str, Any],
        *,
        graded_by: str = "ai",
        published: bool = False,
    ) -> dict[str, Any]:
        now = _now_iso()
        with _lock:
            with self._connect() as conn:
                existing = conn.execute(
                    "SELECT id, version FROM grading_records WHERE submission_id = ?", (submission_id,)
                ).fetchone()
                if existing:
                    version = int(existing["version"]) + 1
                    conn.execute(
                        """
                        UPDATE grading_records SET result_json = ?, graded_by = ?, published = ?,
                        version = ?, updated_at = ?
                        WHERE submission_id = ?
                        """,
                        (
                            json.dumps(result, ensure_ascii=False),
                            graded_by,
                            1 if published else 0,
                            version,
                            now,
                            submission_id,
                        ),
                    )
                    record_id = existing["id"]
                else:
                    record_id = uuid.uuid4().hex
                    conn.execute(
                        """
                        INSERT INTO grading_records (
                            id, submission_id, result_json, graded_by, teacher_override,
                            published, version, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, 0, ?, 1, ?, ?)
                        """,
                        (
                            record_id,
                            submission_id,
                            json.dumps(result, ensure_ascii=False),
                            graded_by,
                            1 if published else 0,
                            now,
                            now,
                        ),
                    )
                sub_status = "published" if published else "graded"
                pub_at = now if published else None
                if published:
                    conn.execute(
                        """
                        UPDATE submissions SET status = ?, updated_at = ?, published_at = ?
                        WHERE id = ?
                        """,
                        (sub_status, now, pub_at, submission_id),
                    )
                else:
                    conn.execute(
                        "UPDATE submissions SET status = ?, updated_at = ? WHERE id = ?",
                        ("graded", now, submission_id),
                    )
        rec = self.get_grading_record_by_submission(submission_id)
        return rec or {}

    def publish_submission(self, submission_id: str, teacher_sub: str) -> dict[str, Any]:
        sub = self.get_submission(submission_id)
        if not sub:
            raise ValueError("未找到该提交")
        if sub["teacher_sub"] and sub["teacher_sub"] != teacher_sub:
            raise ValueError("无权发布该批改")
        now = _now_iso()
        with _lock:
            with self._connect() as conn:
                conn.execute(
                    "UPDATE grading_records SET published = 1, updated_at = ? WHERE submission_id = ?",
                    (now, submission_id),
                )
                conn.execute(
                    """
                    UPDATE submissions SET status = 'published', published_at = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (now, now, submission_id),
                )
        return self.get_submission(submission_id) or {}

    def get_submission(self, submission_id: str) -> dict[str, Any] | None:
        with _lock:
            with self._connect() as conn:
                row = conn.execute("SELECT * FROM submissions WHERE id = ?", (submission_id,)).fetchone()
        if not row:
            return None
        return self._submission_row(row)

    def get_grading_record_by_submission(self, submission_id: str) -> dict[str, Any] | None:
        with _lock:
            with self._connect() as conn:
                row = conn.execute(
                    "SELECT * FROM grading_records WHERE submission_id = ?", (submission_id,)
                ).fetchone()
        if not row:
            return None
        return self._grading_row(row)

    def list_submissions(
        self,
        *,
        teacher_sub: str | None = None,
        student_name: str | None = None,
        assignment_id: str | None = None,
        published_only: bool = False,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        clauses: list[str] = []
        params: list[Any] = []
        if teacher_sub:
            clauses.append("(teacher_sub = ? OR teacher_sub = '' OR submitted_by_role IN ('parent', 'student'))")
            params.append(teacher_sub)
        if student_name:
            clauses.append("LOWER(TRIM(student_name)) = ?")
            params.append(_norm_student_name(student_name).casefold())
        if assignment_id:
            clauses.append("assignment_id = ?")
            params.append(assignment_id)
        if published_only:
            clauses.append("status IN ('published', 'correction_pending', 'correction_done', 'closed')")
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        sql = f"SELECT * FROM submissions {where} ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        with _lock:
            with self._connect() as conn:
                rows = conn.execute(sql, params).fetchall()
        return [self._enrich_submission(self._submission_row(r)) for r in rows]

    def _submission_row(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "assignment_id": row["assignment_id"] or "",
            "teacher_sub": row["teacher_sub"],
            "student_name": row["student_name"],
            "student_sub": row["student_sub"],
            "submitted_by_role": row["submitted_by_role"],
            "subject": row["subject"],
            "file_name": row["file_name"],
            "image_filename": row["image_filename"],
            "image_url": row["image_url"],
            "status": row["status"],
            "grade_level": row["grade_level"],
            "teacher_note": row["teacher_note"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "published_at": row["published_at"],
            "correction_note": row["correction_note"],
            "correction_reviewed_at": row["correction_reviewed_at"],
            "correction_review_status": row["correction_review_status"],
        }

    def _grading_row(self, row: sqlite3.Row) -> dict[str, Any]:
        try:
            result = json.loads(row["result_json"])
        except json.JSONDecodeError:
            result = {}
        return {
            "id": row["id"],
            "submission_id": row["submission_id"],
            "result": result,
            "graded_by": row["graded_by"],
            "teacher_override": bool(row["teacher_override"]),
            "published": bool(row["published"]),
            "version": row["version"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def _enrich_submission(self, sub: dict[str, Any]) -> dict[str, Any]:
        gr = self.get_grading_record_by_submission(sub["id"])
        assignment = self.get_assignment(sub["assignment_id"]) if sub.get("assignment_id") else None
        variants = self.list_variant_tasks(student_name=sub["student_name"], submission_id=sub["id"])
        out = {**sub, "grading_record": gr, "assignment": assignment, "variant_tasks": variants}
        if gr and gr.get("result"):
            sp = gr["result"].get("score_pct")
            if sp is not None:
                out["score_percent"] = sp
        return out

    def student_may_view(self, sub: dict[str, Any], student_name: str) -> bool:
        if not _names_match(sub.get("student_name"), student_name):
            return False
        return sub.get("status") in {"published", "correction_pending", "correction_done", "closed"} or bool(
            sub.get("grading_record", {}).get("published")
        )

    def submit_correction(self, submission_id: str, student_name: str, note: str = "") -> dict[str, Any]:
        sub = self.get_submission(submission_id)
        if not sub or not _names_match(sub["student_name"], student_name):
            raise ValueError("未找到该作业或未授权")
        if sub["status"] not in {"published", "correction_pending"}:
            raise ValueError("当前状态不可提交订正")
        now = _now_iso()
        with _lock:
            with self._connect() as conn:
                conn.execute(
                    """
                    UPDATE submissions SET status = 'correction_done', correction_note = ?,
                    updated_at = ?, correction_review_status = 'pending'
                    WHERE id = ?
                    """,
                    (clip_text(note, 2000), now, submission_id),
                )
        return self.get_submission(submission_id) or {}

    def review_correction(
        self, submission_id: str, teacher_sub: str, action: str, teacher_reply: str = ""
    ) -> dict[str, Any]:
        sub = self.get_submission(submission_id)
        if not sub:
            raise ValueError("未找到该提交")
        if sub["teacher_sub"] and sub["teacher_sub"] != teacher_sub:
            raise ValueError("无权审核")
        if sub["status"] != "correction_done":
            raise ValueError("该作业尚未标记订正完成")
        now = _now_iso()
        if action == "accept":
            status = "closed"
            review = "accepted"
        elif action == "reject":
            if len(teacher_reply.strip()) < 2:
                raise ValueError("驳回时请简要说明理由")
            status = "correction_pending"
            review = "rejected"
        else:
            raise ValueError("无效操作")
        with _lock:
            with self._connect() as conn:
                conn.execute(
                    """
                    UPDATE submissions SET status = ?, correction_review_status = ?,
                    correction_reviewed_at = ?, teacher_note = CASE WHEN ? != '' THEN ? ELSE teacher_note END,
                    updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        status,
                        review,
                        now,
                        teacher_reply.strip(),
                        clip_text(teacher_reply, 2000),
                        now,
                        submission_id,
                    ),
                )
        return self.get_submission(submission_id) or {}

    def create_variant_tasks(
        self,
        *,
        submission_id: str,
        teacher_sub: str,
        tasks: list[dict[str, str]],
    ) -> list[dict[str, Any]]:
        sub = self.get_submission(submission_id)
        if not sub:
            raise ValueError("未找到该提交")
        gr = self.get_grading_record_by_submission(submission_id)
        if not gr:
            raise ValueError("该提交尚无批改报告")
        now = _now_iso()
        created: list[dict[str, Any]] = []
        with _lock:
            with self._connect() as conn:
                for t in tasks[:12]:
                    stem = clip_text(t.get("stem") or t.get("question") or "", 4000)
                    if len(stem) < 4:
                        continue
                    rec = {
                        "id": uuid.uuid4().hex,
                        "submission_id": submission_id,
                        "grading_record_id": gr["id"],
                        "student_name": sub["student_name"],
                        "teacher_sub": clip_text(teacher_sub, 80),
                        "knowledge_point": clip_text(t.get("knowledge_point") or "", 200),
                        "stem": stem,
                        "answer_hint": clip_text(t.get("answer_hint") or "", 2000),
                        "status": "assigned",
                        "assigned_at": now,
                        "done_at": "",
                    }
                    conn.execute(
                        """
                        INSERT INTO variant_tasks (
                            id, submission_id, grading_record_id, student_name, teacher_sub,
                            knowledge_point, stem, answer_hint, status, assigned_at, done_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            rec["id"],
                            rec["submission_id"],
                            rec["grading_record_id"],
                            rec["student_name"],
                            rec["teacher_sub"],
                            rec["knowledge_point"],
                            rec["stem"],
                            rec["answer_hint"],
                            rec["status"],
                            rec["assigned_at"],
                            rec["done_at"],
                        ),
                    )
                    created.append(rec)
                if created and sub["status"] == "published":
                    conn.execute(
                        "UPDATE submissions SET status = 'correction_pending', updated_at = ? WHERE id = ?",
                        (now, submission_id),
                    )
        return created

    def list_variant_tasks(
        self,
        *,
        student_name: str | None = None,
        submission_id: str | None = None,
        status: str | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        clauses: list[str] = []
        params: list[Any] = []
        if student_name:
            clauses.append("LOWER(TRIM(student_name)) = ?")
            params.append(_norm_student_name(student_name).casefold())
        if submission_id:
            clauses.append("submission_id = ?")
            params.append(submission_id)
        if status:
            clauses.append("status = ?")
            params.append(status)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        sql = f"SELECT * FROM variant_tasks {where} ORDER BY assigned_at DESC LIMIT ?"
        params.append(limit)
        with _lock:
            with self._connect() as conn:
                rows = conn.execute(sql, params).fetchall()
        return [
            {
                "id": r["id"],
                "submission_id": r["submission_id"],
                "grading_record_id": r["grading_record_id"],
                "student_name": r["student_name"],
                "teacher_sub": r["teacher_sub"],
                "knowledge_point": r["knowledge_point"],
                "stem": r["stem"],
                "answer_hint": r["answer_hint"],
                "status": r["status"],
                "assigned_at": r["assigned_at"],
                "done_at": r["done_at"] or "",
            }
            for r in rows
        ]

    def complete_variant_task(self, task_id: str, student_name: str) -> dict[str, Any]:
        now = _now_iso()
        submission_id = ""
        with _lock:
            with self._connect() as conn:
                row = conn.execute("SELECT * FROM variant_tasks WHERE id = ?", (task_id,)).fetchone()
                if not row:
                    raise ValueError("未找到该变式题")
                if not _names_match(row["student_name"], student_name):
                    raise ValueError("无权操作")
                submission_id = row["submission_id"]
                conn.execute(
                    "UPDATE variant_tasks SET status = 'done', done_at = ? WHERE id = ?",
                    (now, task_id),
                )
        tasks = self.list_variant_tasks(submission_id=submission_id)
        if tasks and all(t["status"] == "done" for t in tasks):
            with _lock:
                with self._connect() as conn:
                    conn.execute(
                        "UPDATE submissions SET updated_at = ? WHERE id = ? AND status = 'correction_pending'",
                        (now, submission_id),
                    )
        done = [t for t in tasks if t["id"] == task_id]
        if not done:
            raise ValueError("未找到该变式题")
        return done[0]

    def count_teacher_inbox(self, teacher_sub: str) -> dict[str, int]:
        with _lock:
            with self._connect() as conn:
                corrections = conn.execute(
                    """
                    SELECT COUNT(*) FROM submissions
                    WHERE (teacher_sub = ? OR teacher_sub = '' OR submitted_by_role IN ('parent', 'student'))
                    AND status = 'correction_done'
                    AND correction_review_status = 'pending'
                    """,
                    (teacher_sub,),
                ).fetchone()[0]
                unpublished = conn.execute(
                    """
                    SELECT COUNT(*) FROM submissions
                    WHERE (teacher_sub = ? OR teacher_sub = '' OR submitted_by_role IN ('parent', 'student'))
                    AND status = 'graded'
                    """,
                    (teacher_sub,),
                ).fetchone()[0]
        return {"corrections_pending": int(corrections), "unpublished_graded": int(unpublished)}

    def assignment_submission_stats(self, assignment_id: str) -> dict[str, Any]:
        with _lock:
            with self._connect() as conn:
                total = conn.execute(
                    "SELECT COUNT(*) FROM submissions WHERE assignment_id = ?", (assignment_id,)
                ).fetchone()[0]
                published = conn.execute(
                    """
                    SELECT COUNT(*) FROM submissions
                    WHERE assignment_id = ? AND status IN ('published', 'correction_pending', 'correction_done', 'closed')
                    """,
                    (assignment_id,),
                ).fetchone()[0]
        return {"submission_count": int(total), "published_count": int(published)}
