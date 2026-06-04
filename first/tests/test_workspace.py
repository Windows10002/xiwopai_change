"""师生闭环 API 测试（不调用 AI）。"""
from __future__ import annotations

import io
import json
import os
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from urllib.parse import quote

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
            "X-Student-Name": quote("张三"),
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
                "class_name": "七年级1班",
                "due_at": "2099-12-31T23:59:59Z",
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

    @patch(
        "routes.api_workspace._run_grade",
        return_value={"error": False, "score_pct": 85, "comments": "ok", "weak_points": ["运算"]},
    )
    def test_exam_mode_teacher_submit_and_release_answer(self, _mock_grade):
        r = self.client.post(
            "/api/assignments",
            headers=self.teacher_headers,
            json={
                "subject": "math",
                "title": "期中测验",
                "class_name": "七年级1班",
                "due_at": "2099-12-31T23:59:59Z",
                "target_student_names": ["张三"],
                "publish": True,
                "submission_mode": "teacher",
                "hide_answer_from_student": True,
            },
        )
        self.assertEqual(r.status_code, 200)
        aid = r.get_json()["assignment"]["id"]
        self.assertFalse(r.get_json()["assignment"].get("answer_visible_to_student"))

        r_stu = self.client.get("/api/assignments/my", headers=self.student_headers)
        self.assertEqual(r_stu.status_code, 200)
        all_a = r_stu.get_json().get("assignments") or []
        hit = next((x for x in all_a if x["id"] == aid), None)
        self.assertIsNotNone(hit)
        self.assertFalse(hit.get("allows_student_submit"))
        self.assertEqual(hit.get("answer_key_image_url") or "", "")

        png = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05"
            b"\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        r_sub = self.client.post(
            f"/api/assignments/{aid}/submit",
            headers=self.teacher_headers,
            data={"student_name": "张三", "file": (io.BytesIO(png), "zhang.png")},
            content_type="multipart/form-data",
        )
        self.assertEqual(r_sub.status_code, 200, r_sub.get_data(as_text=True))
        self.assertFalse(r_sub.get_json().get("published"))

        r_rel = self.client.post(f"/api/assignments/{aid}/release-answer", headers=self.teacher_headers)
        self.assertEqual(r_rel.status_code, 200)
        self.assertTrue(r_rel.get_json()["assignment"].get("answer_released"))

        r_rev = self.client.post(f"/api/assignments/{aid}/revoke-answer", headers=self.teacher_headers)
        self.assertEqual(r_rev.status_code, 200)
        self.assertFalse(r_rev.get_json()["assignment"].get("answer_released"))

        store = self.app.config["WORKSPACE_STORE"]
        store.update_assignment(
            aid,
            "13800138000",
            answer_key="参考答案A",
            answer_key_image="ans.png",
        )
        r_rel2 = self.client.post(f"/api/assignments/{aid}/release-answer", headers=self.teacher_headers)
        self.assertEqual(r_rel2.status_code, 200)
        sub_id = r_sub.get_json().get("submission_id") or r_sub.get_json().get("submission", {}).get("id")
        self.assertTrue(sub_id)
        store.publish_submission(sub_id, "13800138000")
        r_stu_sub = self.client.get(f"/api/submissions/{sub_id}", headers=self.student_headers)
        self.assertEqual(r_stu_sub.status_code, 200)
        asn = r_stu_sub.get_json()["submission"].get("assignment") or {}
        self.assertTrue(asn.get("answer_visible_to_student"))
        self.assertEqual(asn.get("answer_key"), "参考答案A")

    def test_create_assignment_multipart_answer_key(self):
        png = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05"
            b"\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        payload = json.dumps(
            {
                "subject": "english",
                "title": "参考答案图",
                "class_name": "七年级1班",
                "due_at": "2099-12-31T23:59:59Z",
                "target_student_names": ["张三"],
                "publish": True,
            },
            ensure_ascii=False,
        )
        r = self.client.post(
            "/api/assignments",
            headers=self.teacher_headers,
            data={
                "payload": payload,
                "answer_key_file": (io.BytesIO(png), "answer.png"),
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(r.status_code, 200, r.get_data(as_text=True))
        body = r.get_json()
        self.assertTrue(body.get("ok"))
        self.assertTrue(str(body["assignment"].get("answer_key_image") or "").strip())

    def test_student_todo_by_query_name(self):
        r = self.client.post(
            "/api/assignments",
            headers=self.teacher_headers,
            json={
                "subject": "math",
                "title": "查询参数测试",
                "class_name": "七年级1班",
                "due_at": "2099-12-31T23:59:59Z",
                "target_student_names": ["张三"],
                "publish": True,
            },
        )
        self.assertEqual(r.status_code, 200)
        aid = r.get_json()["assignment"]["id"]
        r2 = self.client.get(
            f"/api/assignments/my?student_name={quote('张三')}",
            headers={"Authorization": f"Bearer {self.student_token}"},
        )
        self.assertEqual(r2.status_code, 200)
        self.assertTrue(any(t["id"] == aid for t in r2.get_json().get("todo", [])))

    def test_update_and_delete_assignment(self):
        r = self.client.post(
            "/api/assignments",
            headers=self.teacher_headers,
            json={
                "subject": "math",
                "title": "待删任务",
                "class_name": "七年级1班",
                "due_at": "2099-12-31T23:59:59Z",
                "target_student_names": ["张三"],
                "publish": True,
            },
        )
        self.assertEqual(r.status_code, 200)
        aid = r.get_json()["assignment"]["id"]

        r2 = self.client.patch(
            f"/api/assignments/{aid}",
            headers=self.teacher_headers,
            json={"title": "已改名任务"},
        )
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.get_json()["assignment"]["title"], "已改名任务")

        r3 = self.client.delete(f"/api/assignments/{aid}", headers=self.teacher_headers)
        self.assertEqual(r3.status_code, 200)

        r4 = self.client.get("/api/assignments", headers=self.teacher_headers)
        items = r4.get_json().get("items", [])
        self.assertFalse(any(i["id"] == aid for i in items))

    def test_delete_assignment_with_submissions(self):
        r = self.client.post(
            "/api/assignments",
            headers=self.teacher_headers,
            json={
                "subject": "math",
                "title": "有提交待删",
                "class_name": "七年级1班",
                "due_at": "2099-12-31T23:59:59Z",
                "target_student_names": ["张三"],
                "publish": True,
            },
        )
        self.assertEqual(r.status_code, 200)
        aid = r.get_json()["assignment"]["id"]

        store = self.app.extensions.get("workspace_store")
        self.assertIsNotNone(store)
        store.create_submission(
            assignment_id=aid,
            teacher_sub="13800138000",
            student_name="张三",
            submitted_by_role="student",
            subject="math",
            file_name="hw.jpg",
            image_filename="hw.jpg",
            image_url="/uploads/hw.jpg",
        )

        r_del = self.client.delete(f"/api/assignments/{aid}", headers=self.teacher_headers)
        self.assertEqual(r_del.status_code, 200, r_del.get_json())

        r_list = self.client.get("/api/assignments", headers=self.teacher_headers)
        items = r_list.get_json().get("items", [])
        self.assertFalse(any(i["id"] == aid for i in items))

    def test_admin_list_all_assignments(self):
        self.client.post(
            "/api/assignments",
            headers=self.teacher_headers,
            json={
                "subject": "english",
                "title": "英语同步",
                "class_name": "七年级1班",
                "due_at": "2099-06-01T12:00:00Z",
                "target_student_names": ["李四"],
                "publish": True,
            },
        )
        admin_token = issue_token({"role": "admin", "sub": "13800138005"})
        r = self.client.get(
            "/api/assignments/all",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        self.assertEqual(r.status_code, 200)
        self.assertGreaterEqual(len(r.get_json().get("items", [])), 1)

    def test_overdue_blocks_submit_until_late_open(self):
        past = "2020-01-01T12:00:00Z"
        r = self.client.post(
            "/api/assignments",
            headers=self.teacher_headers,
            json={
                "subject": "math",
                "title": "过期任务",
                "class_name": "七年级1班",
                "due_at": past,
                "target_student_names": ["张三"],
                "publish": True,
            },
        )
        self.assertEqual(r.status_code, 200)
        aid = r.get_json()["assignment"]["id"]

        r2 = self.client.get(
            f"/api/assignments/my?student_name={quote('张三')}",
            headers=self.student_headers,
        )
        self.assertEqual(r2.status_code, 200)
        todo = r2.get_json().get("todo", [])
        hit = next((t for t in todo if t["id"] == aid), None)
        self.assertIsNotNone(hit)
        self.assertTrue(hit.get("is_overdue"))
        self.assertFalse(hit.get("can_submit"))

        r3 = self.client.post(
            f"/api/assignments/{aid}/late-submit",
            headers=self.teacher_headers,
            json={"enabled": True},
        )
        self.assertEqual(r3.status_code, 200)
        self.assertTrue(r3.get_json()["assignment"].get("allow_late_submit"))

        r4 = self.client.get(
            f"/api/assignments/my?student_name={quote('张三')}",
            headers=self.student_headers,
        )
        hit2 = next((t for t in r4.get_json().get("todo", []) if t["id"] == aid), None)
        self.assertTrue(hit2.get("can_submit"))

    def test_pending_review_count(self):
        store = self.app.config["WORKSPACE_STORE"]
        sub = store.create_submission(
            assignment_id=None,
            teacher_sub="13800138000",
            student_name="张三",
            student_sub="13800138000",
            submitted_by_role="student",
            subject="math",
            file_name="test.jpg",
            image_filename="abc.jpg",
            image_url="/uploads/abc.jpg",
            status="submitted",
        )
        store.save_grading_record(
            sub["id"],
            {"score_pct": 88, "comments": "ok"},
            published=False,
            submission_status="pending_review",
        )
        r = self.client.get("/api/workspace/inbox-counts", headers=self.teacher_headers)
        self.assertEqual(r.status_code, 200)
        data = r.get_json()
        self.assertGreaterEqual(data.get("pending_review", 0), 1)

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


    def test_assignment_pdca_report(self):
        r = self.client.post(
            "/api/assignments",
            headers=self.teacher_headers,
            json={
                "subject": "math",
                "title": "PDCA报告",
                "class_name": "七年级1班",
                "due_at": "2099-12-31T23:59:59Z",
                "target_student_names": ["张三", "李四"],
                "max_submissions": 3,
                "notify_student_parent": True,
                "publish": True,
            },
        )
        self.assertEqual(r.status_code, 200)
        aid = r.get_json()["assignment"]["id"]
        store = self.app.config["WORKSPACE_STORE"]
        sub = store.create_submission(
            assignment_id=aid,
            teacher_sub="13800138000",
            student_name="张三",
            student_sub="13800138000",
            submitted_by_role="student",
            subject="math",
            file_name="test.jpg",
            image_filename="abc.jpg",
            image_url="/uploads/abc.jpg",
            status="pending_review",
        )
        store.save_grading_record(sub["id"], {"score_pct": 90}, published=False, submission_status="pending_review")

        r2 = self.client.get(f"/api/assignments/{aid}/report", headers=self.teacher_headers)
        self.assertEqual(r2.status_code, 200)
        report = r2.get_json()["report"]
        self.assertEqual(report["target_count"], 2)
        self.assertIn("李四", report["not_submitted"])
        self.assertEqual(len(report["submitted"]), 1)

    def test_return_submission_for_correction(self):
        store = self.app.config["WORKSPACE_STORE"]
        sub = store.create_submission(
            assignment_id=None,
            teacher_sub="13800138000",
            student_name="张三",
            student_sub="13800138000",
            submitted_by_role="student",
            subject="math",
            file_name="test.jpg",
            image_filename="abc.jpg",
            image_url="/uploads/abc.jpg",
            status="pending_review",
        )
        store.save_grading_record(sub["id"], {"score_pct": 70}, published=False, submission_status="pending_review")
        r = self.client.post(
            f"/api/submissions/{sub['id']}/return",
            headers=self.teacher_headers,
            json={"note": "请订正第2题"},
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.get_json()["submission"]["status"], "correction_pending")


if __name__ == "__main__":
    unittest.main()
