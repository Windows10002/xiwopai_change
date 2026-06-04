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
from core.workspace_deadline import enrich_assignment_deadline, student_may_submit_assignment
from core.workspace_exam import allows_student_submit, normalize_submission_mode, strip_assignment_answers_for_viewer
from core.workspace_grading_score import score_percent_from_result

_lock = threading.Lock()

SUBMISSION_STATUSES = frozenset(
    {
        "submitted",
        "grading",
        "graded",
        "pending_review",
        "published",
        "correction_pending",
        "correction_done",
        "closed",
    }
)

ASSIGNMENT_SUBJECTS = frozenset({"math", "english", "chinese"})


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _norm_student_name(name: str | None) -> str:
    import re

    s = (name or "").strip()
    s = re.sub(r"[\u200b-\u200d\ufeff\u00a0]", "", s)
    return s.strip()


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

                    CREATE TABLE IF NOT EXISTS submission_versions (
                        id TEXT PRIMARY KEY,
                        submission_id TEXT NOT NULL,
                        version INTEGER NOT NULL,
                        file_name TEXT NOT NULL DEFAULT '',
                        image_filename TEXT NOT NULL,
                        image_url TEXT NOT NULL DEFAULT '',
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (submission_id) REFERENCES submissions(id)
                    );
                    CREATE INDEX IF NOT EXISTS idx_submission_versions ON submission_versions(submission_id, version);
                    """
                )
                self._migrate_columns(conn)

    def _migrate_columns(self, conn: sqlite3.Connection) -> None:
        cols = {r[1] for r in conn.execute("PRAGMA table_info(assignments)").fetchall()}
        if "answer_key" not in cols:
            conn.execute("ALTER TABLE assignments ADD COLUMN answer_key TEXT NOT NULL DEFAULT ''")
        if "send_answer_to_parent" not in cols:
            conn.execute(
                "ALTER TABLE assignments ADD COLUMN send_answer_to_parent INTEGER NOT NULL DEFAULT 0"
            )
        if "allow_late_submit" not in cols:
            conn.execute(
                "ALTER TABLE assignments ADD COLUMN allow_late_submit INTEGER NOT NULL DEFAULT 0"
            )
        if "max_submissions" not in cols:
            conn.execute("ALTER TABLE assignments ADD COLUMN max_submissions INTEGER NOT NULL DEFAULT 0")
        if "allowed_formats_json" not in cols:
            conn.execute(
                "ALTER TABLE assignments ADD COLUMN allowed_formats_json TEXT NOT NULL DEFAULT '[\"jpg\",\"jpeg\",\"png\",\"webp\"]'"
            )
        if "scoring_rubric" not in cols:
            conn.execute("ALTER TABLE assignments ADD COLUMN scoring_rubric TEXT NOT NULL DEFAULT ''")
        if "teacher_attachment_note" not in cols:
            conn.execute("ALTER TABLE assignments ADD COLUMN teacher_attachment_note TEXT NOT NULL DEFAULT ''")
        if "notify_student_parent" not in cols:
            conn.execute(
                "ALTER TABLE assignments ADD COLUMN notify_student_parent INTEGER NOT NULL DEFAULT 1"
            )
        if "scheduled_publish_at" not in cols:
            conn.execute("ALTER TABLE assignments ADD COLUMN scheduled_publish_at TEXT NOT NULL DEFAULT ''")
        if "answer_key_image" not in cols:
            conn.execute("ALTER TABLE assignments ADD COLUMN answer_key_image TEXT NOT NULL DEFAULT ''")
        if "teacher_attachment_image" not in cols:
            conn.execute("ALTER TABLE assignments ADD COLUMN teacher_attachment_image TEXT NOT NULL DEFAULT ''")
        if "submission_mode" not in cols:
            conn.execute("ALTER TABLE assignments ADD COLUMN submission_mode TEXT NOT NULL DEFAULT 'both'")
        if "hide_answer_from_student" not in cols:
            conn.execute(
                "ALTER TABLE assignments ADD COLUMN hide_answer_from_student INTEGER NOT NULL DEFAULT 0"
            )
        if "answer_released_at" not in cols:
            conn.execute("ALTER TABLE assignments ADD COLUMN answer_released_at TEXT NOT NULL DEFAULT ''")

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
        answer_key: str = "",
        answer_key_image: str = "",
        send_answer_to_parent: bool = False,
        publish: bool = False,
        max_submissions: int = 0,
        allowed_formats: list[str] | None = None,
        scoring_rubric: str = "",
        teacher_attachment_note: str = "",
        teacher_attachment_image: str = "",
        notify_student_parent: bool = True,
        scheduled_publish_at: str = "",
        submission_mode: str = "both",
        hide_answer_from_student: bool = False,
    ) -> dict[str, Any]:
        if subject not in ASSIGNMENT_SUBJECTS:
            raise ValueError("科目仅支持 math / english / chinese")
        title = clip_text(title, 200)
        if len(title) < 2:
            raise ValueError("任务标题至少 2 个字")
        class_name = clip_text(class_name, 80)
        if len(class_name) < 2:
            raise ValueError("请选择班级")
        due = clip_text(due_at or "", 40)
        if not due:
            raise ValueError("请设置截止时间")
        names = [_norm_student_name(n) for n in (target_student_names or []) if _norm_student_name(n)]
        if not names:
            raise ValueError("请指定布置对象（至少一名学生）")
        formats = allowed_formats or ["jpg", "jpeg", "png", "webp"]
        formats = [f.strip().lower().lstrip(".") for f in formats if str(f).strip()]
        if not formats:
            formats = ["jpg", "jpeg", "png", "webp"]
        scheduled = clip_text(scheduled_publish_at or "", 40)
        now = _now_iso()
        rec = {
            "id": uuid.uuid4().hex,
            "teacher_sub": clip_text(teacher_sub, 80),
            "class_name": class_name,
            "subject": subject,
            "title": title,
            "description": clip_text(description, 2000),
            "due_at": due,
            "status": "published" if publish else "draft",
            "target_student_names": names,
            "answer_key": clip_text(answer_key, 8000),
            "answer_key_image": clip_text(answer_key_image, 240),
            "send_answer_to_parent": bool(send_answer_to_parent),
            "allow_late_submit": False,
            "max_submissions": max(0, int(max_submissions or 0)),
            "allowed_formats": formats,
            "scoring_rubric": clip_text(scoring_rubric, 4000),
            "teacher_attachment_note": clip_text(teacher_attachment_note, 2000),
            "teacher_attachment_image": clip_text(teacher_attachment_image, 240),
            "notify_student_parent": bool(notify_student_parent),
            "scheduled_publish_at": scheduled,
            "submission_mode": normalize_submission_mode(submission_mode),
            "hide_answer_from_student": bool(hide_answer_from_student),
            "answer_released_at": "",
            "created_at": now,
            "published_at": now if publish else "",
        }
        with _lock:
            with self._connect() as conn:
                conn.execute(
                    """
                    INSERT INTO assignments (
                        id, teacher_sub, class_name, subject, title, description,
                        due_at, status, target_student_names_json, answer_key, answer_key_image,
                        send_answer_to_parent, allow_late_submit, max_submissions,
                        allowed_formats_json, scoring_rubric, teacher_attachment_note,
                        teacher_attachment_image, notify_student_parent, scheduled_publish_at,
                        submission_mode, hide_answer_from_student, answer_released_at,
                        created_at, published_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                        rec["answer_key"],
                        rec["answer_key_image"],
                        1 if rec["send_answer_to_parent"] else 0,
                        0,
                        rec["max_submissions"],
                        json.dumps(formats, ensure_ascii=False),
                        rec["scoring_rubric"],
                        rec["teacher_attachment_note"],
                        rec["teacher_attachment_image"],
                        1 if rec["notify_student_parent"] else 0,
                        rec["scheduled_publish_at"],
                        rec["submission_mode"],
                        1 if rec["hide_answer_from_student"] else 0,
                        rec["answer_released_at"],
                        rec["created_at"],
                        rec["published_at"],
                    ),
                )
        out = enrich_assignment_deadline(rec)
        if publish and rec["notify_student_parent"]:
            out["notify_sent"] = True
        return out

    def update_assignment(
        self,
        assignment_id: str,
        teacher_sub: str,
        *,
        subject: str | None = None,
        title: str | None = None,
        description: str | None = None,
        class_name: str | None = None,
        due_at: str | None = None,
        target_student_names: list[str] | None = None,
        answer_key: str | None = None,
        answer_key_image: str | None = None,
        clear_answer_key_image: bool = False,
        send_answer_to_parent: bool | None = None,
        max_submissions: int | None = None,
        allowed_formats: list[str] | None = None,
        scoring_rubric: str | None = None,
        teacher_attachment_note: str | None = None,
        teacher_attachment_image: str | None = None,
        clear_teacher_attachment_image: bool = False,
        notify_student_parent: bool | None = None,
        scheduled_publish_at: str | None = None,
        submission_mode: str | None = None,
        hide_answer_from_student: bool | None = None,
    ) -> dict[str, Any]:
        existing = self.get_assignment(assignment_id)
        if not existing:
            raise ValueError("未找到该任务")
        if existing["teacher_sub"] != teacher_sub:
            raise ValueError("无权操作该任务")
        subj = subject if subject is not None else existing["subject"]
        if subj not in ASSIGNMENT_SUBJECTS:
            raise ValueError("科目仅支持 math / english / chinese")
        new_title = clip_text(title if title is not None else existing["title"], 200)
        if len(new_title) < 2:
            raise ValueError("任务标题至少 2 个字")
        new_class = clip_text(class_name if class_name is not None else existing["class_name"], 80)
        if len(new_class) < 2:
            raise ValueError("请选择班级")
        new_due = clip_text(due_at if due_at is not None else existing["due_at"], 40)
        if not new_due:
            raise ValueError("请设置截止时间")
        if target_student_names is not None:
            names = [_norm_student_name(n) for n in target_student_names if _norm_student_name(n)]
        else:
            names = existing["target_student_names"]
        if not names:
            raise ValueError("请指定布置对象（至少一名学生）")
        new_desc = clip_text(description if description is not None else existing["description"], 2000)
        new_answer = (
            clip_text(answer_key, 8000)
            if answer_key is not None
            else existing.get("answer_key") or ""
        )
        if clear_answer_key_image:
            new_answer_img = ""
        elif answer_key_image is not None:
            new_answer_img = clip_text(answer_key_image, 240)
        else:
            new_answer_img = existing.get("answer_key_image") or ""
        send_parent = (
            bool(send_answer_to_parent)
            if send_answer_to_parent is not None
            else bool(existing.get("send_answer_to_parent"))
        )
        new_max = max_submissions if max_submissions is not None else int(existing.get("max_submissions") or 0)
        new_max = max(0, int(new_max))
        if allowed_formats is not None:
            formats = [f.strip().lower().lstrip(".") for f in allowed_formats if str(f).strip()]
        else:
            formats = existing.get("allowed_formats") or ["jpg", "jpeg", "png", "webp"]
        if not formats:
            formats = ["jpg", "jpeg", "png", "webp"]
        new_rubric = (
            clip_text(scoring_rubric, 4000)
            if scoring_rubric is not None
            else existing.get("scoring_rubric") or ""
        )
        new_attach = (
            clip_text(teacher_attachment_note, 2000)
            if teacher_attachment_note is not None
            else existing.get("teacher_attachment_note") or ""
        )
        if clear_teacher_attachment_image:
            new_attach_img = ""
        elif teacher_attachment_image is not None:
            new_attach_img = clip_text(teacher_attachment_image, 240)
        else:
            new_attach_img = existing.get("teacher_attachment_image") or ""
        new_notify = (
            bool(notify_student_parent)
            if notify_student_parent is not None
            else bool(existing.get("notify_student_parent", True))
        )
        new_scheduled = (
            clip_text(scheduled_publish_at or "", 40)
            if scheduled_publish_at is not None
            else existing.get("scheduled_publish_at") or ""
        )
        new_mode = (
            normalize_submission_mode(submission_mode)
            if submission_mode is not None
            else normalize_submission_mode(existing.get("submission_mode"))
        )
        new_hide_answer = (
            bool(hide_answer_from_student)
            if hide_answer_from_student is not None
            else bool(existing.get("hide_answer_from_student"))
        )
        with _lock:
            with self._connect() as conn:
                conn.execute(
                    """
                    UPDATE assignments SET
                        subject = ?, title = ?, description = ?, class_name = ?,
                        due_at = ?, target_student_names_json = ?, answer_key = ?,
                        answer_key_image = ?, send_answer_to_parent = ?, max_submissions = ?,
                        allowed_formats_json = ?, scoring_rubric = ?,
                        teacher_attachment_note = ?, teacher_attachment_image = ?,
                        notify_student_parent = ?, scheduled_publish_at = ?,
                        submission_mode = ?, hide_answer_from_student = ?
                    WHERE id = ?
                    """,
                    (
                        subj,
                        new_title,
                        new_desc,
                        new_class,
                        new_due,
                        json.dumps(names, ensure_ascii=False),
                        new_answer,
                        new_answer_img,
                        1 if send_parent else 0,
                        new_max,
                        json.dumps(formats, ensure_ascii=False),
                        new_rubric,
                        new_attach,
                        new_attach_img,
                        1 if new_notify else 0,
                        new_scheduled,
                        new_mode,
                        1 if new_hide_answer else 0,
                        assignment_id,
                    ),
                )
        return enrich_assignment_deadline(self.get_assignment(assignment_id) or {})

    def release_assignment_answer(self, assignment_id: str, teacher_sub: str) -> dict[str, Any]:
        existing = self.get_assignment(assignment_id)
        if not existing:
            raise ValueError("未找到该任务")
        if existing["teacher_sub"] != teacher_sub:
            raise ValueError("无权操作该任务")
        now = _now_iso()
        with _lock:
            with self._connect() as conn:
                conn.execute(
                    "UPDATE assignments SET answer_released_at = ? WHERE id = ?",
                    (now, assignment_id),
                )
        return enrich_assignment_deadline(self.get_assignment(assignment_id) or {})

    def revoke_assignment_answer(self, assignment_id: str, teacher_sub: str) -> dict[str, Any]:
        existing = self.get_assignment(assignment_id)
        if not existing:
            raise ValueError("未找到该任务")
        if existing["teacher_sub"] != teacher_sub:
            raise ValueError("无权操作该任务")
        with _lock:
            with self._connect() as conn:
                conn.execute(
                    "UPDATE assignments SET answer_released_at = '' WHERE id = ?",
                    (assignment_id,),
                )
        return enrich_assignment_deadline(self.get_assignment(assignment_id) or {})

    def publish_pending_submissions_for_assignment(
        self, assignment_id: str, teacher_sub: str
    ) -> list[str]:
        """批量下发该任务下已批改未发布的提交，返回 submission id 列表。"""
        assignment = self.get_assignment(assignment_id)
        if not assignment:
            raise ValueError("未找到该任务")
        if assignment["teacher_sub"] != teacher_sub:
            raise ValueError("无权操作该任务")
        subs = self.list_submissions(assignment_id=assignment_id, teacher_sub=teacher_sub, limit=500)
        published_ids: list[str] = []
        for sub in subs:
            if sub.get("status") in {"pending_review", "graded"}:
                self.publish_submission(sub["id"], teacher_sub)
                published_ids.append(sub["id"])
        return published_ids

    def resolve_upload_image_path(self, upload_folder: str | Path, filename: str) -> str:
        fn = clip_text(filename or "", 240)
        if not fn:
            return ""
        path = Path(upload_folder) / fn
        return str(path) if path.is_file() else ""

    def resolve_answer_key_image_path(self, upload_folder: str | Path, assignment: dict[str, Any]) -> str:
        return self.resolve_upload_image_path(upload_folder, str(assignment.get("answer_key_image") or ""))

    def set_allow_late_submit(self, assignment_id: str, teacher_sub: str, *, enabled: bool) -> dict[str, Any]:
        existing = self.get_assignment(assignment_id)
        if not existing:
            raise ValueError("未找到该任务")
        if existing["teacher_sub"] != teacher_sub:
            raise ValueError("无权操作该任务")
        if existing.get("status") != "published":
            raise ValueError("仅已发布任务可设置补交")
        with _lock:
            with self._connect() as conn:
                conn.execute(
                    "UPDATE assignments SET allow_late_submit = ? WHERE id = ?",
                    (1 if enabled else 0, assignment_id),
                )
        return enrich_assignment_deadline(self.get_assignment(assignment_id) or {})

    def delete_assignment(self, assignment_id: str, teacher_sub: str) -> None:
        existing = self.get_assignment(assignment_id)
        if not existing:
            raise ValueError("未找到该任务")
        if existing["teacher_sub"] != teacher_sub:
            raise ValueError("无权操作该任务")
        with _lock:
            with self._connect() as conn:
                sub_ids = [
                    r[0]
                    for r in conn.execute(
                        "SELECT id FROM submissions WHERE assignment_id = ?",
                        (assignment_id,),
                    ).fetchall()
                ]
                for sid in sub_ids:
                    conn.execute("DELETE FROM variant_tasks WHERE submission_id = ?", (sid,))
                    conn.execute("DELETE FROM grading_records WHERE submission_id = ?", (sid,))
                    conn.execute("DELETE FROM submission_versions WHERE submission_id = ?", (sid,))
                conn.execute("DELETE FROM submissions WHERE assignment_id = ?", (assignment_id,))
                conn.execute("DELETE FROM assignments WHERE id = ?", (assignment_id,))

    def list_all_assignments(self, *, limit: int = 200) -> list[dict[str, Any]]:
        with _lock:
            with self._connect() as conn:
                rows = conn.execute(
                    "SELECT * FROM assignments ORDER BY created_at DESC LIMIT ?",
                    (limit,),
                ).fetchall()
        items = [self._assignment_row(r) for r in rows]
        for a in items:
            a.update(self.assignment_submission_stats(a["id"]))
        return [enrich_assignment_deadline(a) for a in items]

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
        return enrich_assignment_deadline(self.get_assignment(assignment_id) or {})

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
                and (
                    not a["target_student_names"]
                    or any(_names_match(n, sn) for n in a["target_student_names"])
                )
            ]
        return [enrich_assignment_deadline(a) for a in items]

    def list_assignments_for_parent(self, child_name: str, *, limit: int = 100) -> list[dict[str, Any]]:
        sn = _norm_student_name(child_name)
        if not sn:
            return []
        items = self.list_assignments(status="published", limit=limit)
        out: list[dict[str, Any]] = []
        for a in items:
            if not a["target_student_names"] or any(_names_match(n, sn) for n in a["target_student_names"]):
                row = {**a}
                if not row.get("send_answer_to_parent"):
                    row["answer_key"] = ""
                    row["answer_key_image"] = ""
                out.append(strip_assignment_answers_for_viewer(row))
        return out

    def _assignment_row(self, row: sqlite3.Row) -> dict[str, Any]:
        try:
            names = json.loads(row["target_student_names_json"] or "[]")
        except json.JSONDecodeError:
            names = []
        keys = row.keys()
        try:
            formats = json.loads(row["allowed_formats_json"] or "[]") if "allowed_formats_json" in keys else []
        except json.JSONDecodeError:
            formats = []
        if not formats:
            formats = ["jpg", "jpeg", "png", "webp"]
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
            "answer_key": row["answer_key"] if "answer_key" in keys else "",
            "answer_key_image": row["answer_key_image"] if "answer_key_image" in keys else "",
            "send_answer_to_parent": bool(row["send_answer_to_parent"]) if "send_answer_to_parent" in keys else False,
            "allow_late_submit": bool(row["allow_late_submit"]) if "allow_late_submit" in keys else False,
            "max_submissions": int(row["max_submissions"]) if "max_submissions" in keys else 0,
            "allowed_formats": formats if isinstance(formats, list) else ["jpg", "jpeg", "png", "webp"],
            "scoring_rubric": row["scoring_rubric"] if "scoring_rubric" in keys else "",
            "teacher_attachment_note": row["teacher_attachment_note"] if "teacher_attachment_note" in keys else "",
            "teacher_attachment_image": row["teacher_attachment_image"] if "teacher_attachment_image" in keys else "",
            "notify_student_parent": bool(row["notify_student_parent"]) if "notify_student_parent" in keys else True,
            "scheduled_publish_at": row["scheduled_publish_at"] if "scheduled_publish_at" in keys else "",
            "submission_mode": row["submission_mode"] if "submission_mode" in keys else "both",
            "hide_answer_from_student": bool(row["hide_answer_from_student"])
            if "hide_answer_from_student" in keys
            else False,
            "answer_released_at": row["answer_released_at"] if "answer_released_at" in keys else "",
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
        submission_status: str | None = None,
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
                sub_status = "published" if published else (submission_status or "graded")
                if sub_status not in SUBMISSION_STATUSES:
                    sub_status = "graded"
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
                        (sub_status, now, submission_id),
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
        status: str | None = None,
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
        if status:
            clauses.append("status = ?")
            params.append(status)
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
            sp = score_percent_from_result(gr["result"])
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
                    AND status = 'pending_review'
                    """,
                    (teacher_sub,),
                ).fetchone()[0]
        pending = int(unpublished)
        return {
            "corrections_pending": int(corrections),
            "pending_review": pending,
            "unpublished_graded": pending,
        }

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

    def find_submission_for_student(self, assignment_id: str, student_name: str) -> dict[str, Any] | None:
        sn = _norm_student_name(student_name).casefold()
        if not sn:
            return None
        with _lock:
            with self._connect() as conn:
                row = conn.execute(
                    """
                    SELECT * FROM submissions
                    WHERE assignment_id = ? AND LOWER(TRIM(student_name)) = ?
                    ORDER BY updated_at DESC LIMIT 1
                    """,
                    (assignment_id, sn),
                ).fetchone()
        return self._submission_row(row) if row else None

    def count_submission_versions(self, submission_id: str) -> int:
        with _lock:
            with self._connect() as conn:
                n = conn.execute(
                    "SELECT COUNT(*) FROM submission_versions WHERE submission_id = ?",
                    (submission_id,),
                ).fetchone()[0]
        return int(n)

    def _archive_submission_version(self, conn: sqlite3.Connection, sub_row: sqlite3.Row | dict[str, Any]) -> None:
        sid = sub_row["id"] if isinstance(sub_row, sqlite3.Row) else sub_row.get("id")
        ver = conn.execute(
            "SELECT COUNT(*) FROM submission_versions WHERE submission_id = ?", (sid,)
        ).fetchone()[0] + 1
        conn.execute(
            """
            INSERT INTO submission_versions (
                id, submission_id, version, file_name, image_filename, image_url, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                uuid.uuid4().hex,
                sid,
                ver,
                sub_row["file_name"],
                sub_row["image_filename"],
                sub_row["image_url"],
                _now_iso(),
            ),
        )

    def resubmit_submission(
        self,
        submission_id: str,
        *,
        file_name: str,
        image_filename: str,
        image_url: str,
        status: str = "grading",
    ) -> dict[str, Any]:
        now = _now_iso()
        with _lock:
            with self._connect() as conn:
                row = conn.execute("SELECT * FROM submissions WHERE id = ?", (submission_id,)).fetchone()
                if not row:
                    raise ValueError("未找到该提交")
                self._archive_submission_version(conn, row)
                conn.execute(
                    """
                    UPDATE submissions SET
                        file_name = ?, image_filename = ?, image_url = ?,
                        status = ?, updated_at = ?, published_at = '',
                        correction_note = '', correction_review_status = ''
                    WHERE id = ?
                    """,
                    (
                        clip_text(file_name, 240),
                        clip_text(image_filename, 240),
                        clip_text(image_url, 500),
                        status,
                        now,
                        submission_id,
                    ),
                )
        return self.get_submission(submission_id) or {}

    def student_assignment_in_todo(
        self, assignment: dict[str, Any], submission: dict[str, Any] | None
    ) -> bool:
        """学生待办：未交、退回订正、或截止前可重交。"""
        if not allows_student_submit(assignment):
            return False
        if not submission:
            return True
        if submission.get("status") == "correction_pending":
            return student_may_submit_assignment(assignment)
        if not student_may_submit_assignment(assignment):
            return False
        return submission.get("status") in {
            "submitted",
            "grading",
            "graded",
            "pending_review",
        }

    def may_resubmit(
        self, assignment: dict[str, Any], submission: dict[str, Any] | None
    ) -> tuple[bool, str]:
        if not submission:
            return True, ""
        if not student_may_submit_assignment(assignment):
            return False, "已超过截止时间"
        if submission.get("status") == "correction_pending":
            return True, ""
        max_sub = int(assignment.get("max_submissions") or 0)
        if max_sub > 0:
            used = self.count_submission_versions(submission["id"]) + 1
            if used >= max_sub:
                return False, f"已达最大提交次数（{max_sub} 次）"
        if submission.get("status") in {"published", "closed", "correction_done"}:
            return False, "当前状态不可重交"
        return True, ""

    def return_submission_for_correction(
        self, submission_id: str, teacher_sub: str, note: str = ""
    ) -> dict[str, Any]:
        sub = self.get_submission(submission_id)
        if not sub:
            raise ValueError("未找到该提交")
        if sub["teacher_sub"] and sub["teacher_sub"] != teacher_sub:
            raise ValueError("无权操作")
        if sub["status"] not in {"pending_review", "graded", "published"}:
            raise ValueError("当前状态不可退回订正")
        now = _now_iso()
        with _lock:
            with self._connect() as conn:
                conn.execute(
                    """
                    UPDATE submissions SET status = 'correction_pending', correction_note = ?,
                    correction_review_status = '', updated_at = ?, published_at = ''
                    WHERE id = ?
                    """,
                    (clip_text(note, 2000), now, submission_id),
                )
                conn.execute(
                    "UPDATE grading_records SET published = 0, updated_at = ? WHERE submission_id = ?",
                    (now, submission_id),
                )
        return self.get_submission(submission_id) or {}

    def _submission_status_label(self, status: str | None, *, published_grading: bool) -> str:
        st = (status or "").strip()
        if st == "published":
            return "已下发学生"
        if st == "pending_review":
            return "待审阅"
        if st == "graded":
            return "已批改待下发"
        if st == "correction_pending":
            return "待订正"
        if st == "correction_done":
            return "订正待验收"
        if st == "closed":
            return "已完成"
        if published_grading:
            return "已批改"
        return st or "—"

    def assignment_pdca_report(self, assignment_id: str) -> dict[str, Any]:
        assignment = self.get_assignment(assignment_id)
        if not assignment:
            raise ValueError("未找到任务")
        targets = [_norm_student_name(n) for n in (assignment.get("target_student_names") or []) if _norm_student_name(n)]
        subs = self.list_submissions(assignment_id=assignment_id, limit=500)
        submitted_names: set[str] = set()
        submitted_rows: list[dict[str, Any]] = []
        scores: list[float] = []
        weak_counter: dict[str, int] = {}
        pending_review = 0
        unpublished_graded = 0
        for s in subs:
            sn = _norm_student_name(s.get("student_name"))
            if not sn:
                continue
            key = sn.casefold()
            if key in submitted_names:
                continue
            submitted_names.add(key)
            gr = s.get("grading_record")
            result = gr.get("result") if gr else None
            score = s.get("score_percent")
            if score is None and isinstance(result, dict):
                score = score_percent_from_result(result)
            published_grading = bool(gr and gr.get("published"))
            st = s.get("status")
            if st == "pending_review":
                pending_review += 1
            elif st == "graded" or (gr and not published_grading):
                unpublished_graded += 1
            if score is not None:
                scores.append(float(score))
            weak: list[str] = []
            if isinstance(result, dict):
                raw_weak = result.get("weak_points")
                if isinstance(raw_weak, list):
                    weak = [str(x).strip() for x in raw_weak if str(x).strip()][:5]
                for w in weak:
                    weak_counter[w] = weak_counter.get(w, 0) + 1
            comments = ""
            if isinstance(result, dict):
                comments = str(result.get("comments") or result.get("personal_comment") or "").strip()
            submitted_rows.append(
                {
                    "student_name": sn,
                    "status": st,
                    "status_label": self._submission_status_label(st, published_grading=published_grading),
                    "score_percent": score,
                    "submitted_at": s.get("created_at"),
                    "updated_at": s.get("updated_at"),
                    "version_count": self.count_submission_versions(s["id"]) + 1,
                    "submission_id": s.get("id"),
                    "weak_points": weak,
                    "comment_preview": comments[:120] if comments else "",
                    "published_to_student": st in {"published", "correction_pending", "correction_done", "closed"},
                }
            )
        not_submitted = [n for n in targets if n.casefold() not in submitted_names]
        target_count = len(targets)
        rate = round(len(submitted_rows) / target_count * 100, 1) if target_count else 0.0
        avg = round(sum(scores) / len(scores), 1) if scores else None
        distribution = {"90-100": 0, "80-89": 0, "60-79": 0, "0-59": 0, "未评分": 0}
        for sc in scores:
            if sc >= 90:
                distribution["90-100"] += 1
            elif sc >= 80:
                distribution["80-89"] += 1
            elif sc >= 60:
                distribution["60-79"] += 1
            else:
                distribution["0-59"] += 1
        if len(scores) < len(submitted_rows):
            distribution["未评分"] = len(submitted_rows) - len(scores)
        weak_ranked = sorted(weak_counter.items(), key=lambda x: (-x[1], x[0]))[:8]
        released = bool(str(assignment.get("answer_released_at") or "").strip())
        return {
            "assignment": enrich_assignment_deadline(assignment),
            "target_count": target_count,
            "submitted": submitted_rows,
            "not_submitted": not_submitted,
            "submission_rate": rate,
            "avg_score": avg,
            "notify_sent": bool(assignment.get("notify_student_parent")),
            "pending_review_count": pending_review,
            "unpublished_graded_count": unpublished_graded,
            "score_distribution": distribution,
            "weak_knowledge_ranked": [{"name": k, "count": v} for k, v in weak_ranked],
            "answer_released": released,
        }
