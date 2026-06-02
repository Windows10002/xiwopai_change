"""师生闭环 API 测试（不调用 AI）。"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.auth import issue_token
from app import create_app


class WorkspaceApiTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmp.name, "workspace.db")
        self.app = create_app()
        self.app.config["TESTING"] = True
        from core.workspace_service import WorkspaceStore

        store = WorkspaceStore(self.db_path)
        self.app.config["WORKSPACE_STORE"] = store
        self.client = self.app.test_client()
        self.teacher_token = issue_token({"role": "teacher", "sub": "13800138000"})
        self.student_token = issue_token({"role": "student", "sub": "13800138000", "student_grade": 7})
        self.teacher_headers = {"Authorization": f"Bearer {self.teacher_token}"}
        self.student_headers = {
            "Authorization": f"Bearer {self.student_token}",
            "X-Student-Name": "张三",
        }

    def tearDown(self):
        self.tmp.cleanup()

    def test_create_and_list_assignment(self):
        r = self.client.post(
            "/api/assignments",
            headers=self.teacher_headers,
            json={
                "subject": "math",
                "title": "单元测试",
                "target_student_names": ["张三"],
                "publish": True,
            },
        )
        self.assertEqual(r.status_code, 200)
        aid = r.get_json()["assignment"]["id"]

        r2 = self.client.get("/api/assignments/my", headers=self.student_headers)
        self.assertEqual(r2.status_code, 200)
        data = r2.get_json()
        self.assertTrue(any(t["id"] == aid for t in data.get("todo", [])))

    def test_publish_submission_flow(self):
        store = self.app.config["WORKSPACE_STORE"]
        sub = store.create_submission(
            assignment_id=None,
            teacher_sub="13800138000",
            student_name="张三",
            student_sub="13800138000",
            submitted_by_role="teacher",
            subject="math",
            file_name="test.jpg",
            image_filename="abc.jpg",
            image_url="/uploads/abc.jpg",
            status="graded",
        )
        store.save_grading_record(sub["id"], {"score_pct": 80, "comments": "ok"}, published=False)

        r = self.client.post(f"/api/submissions/{sub['id']}/publish", headers=self.teacher_headers)
        self.assertEqual(r.status_code, 200)

        r2 = self.client.get("/api/submissions/my", headers=self.student_headers)
        self.assertEqual(r2.status_code, 200)
        items = r2.get_json().get("items", [])
        self.assertTrue(any(i["id"] == sub["id"] for i in items))

    def test_correction_and_variants(self):
        store = self.app.config["WORKSPACE_STORE"]
        sub = store.create_submission(
            assignment_id=None,
            teacher_sub="13800138000",
            student_name="张三",
            student_sub="13800138000",
            submitted_by_role="teacher",
            subject="math",
            file_name="test.jpg",
            image_filename="abc.jpg",
            image_url="/uploads/abc.jpg",
            status="submitted",
        )
        store.save_grading_record(sub["id"], {"score_pct": 0}, published=True)
        store.publish_submission(sub["id"], "13800138000")

        r = self.client.post(
            f"/api/submissions/{sub['id']}/correction",
            headers=self.student_headers,
            json={"note": "已订正完成"},
        )
        self.assertEqual(r.status_code, 200)

        r2 = self.client.post(
            f"/api/submissions/{sub['id']}/correction/review",
            headers=self.teacher_headers,
            json={"action": "accept"},
        )
        self.assertEqual(r2.status_code, 200)

        r3 = self.client.post(
            f"/api/submissions/{sub['id']}/variants",
            headers=self.teacher_headers,
            json={"tasks": [{"stem": "变式题1", "knowledge_point": "加法"}]},
        )
        self.assertEqual(r3.status_code, 200)


if __name__ == "__main__":
    unittest.main()
