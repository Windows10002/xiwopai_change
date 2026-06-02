"""Flask API 冒烟测试（不调用真实 AI）。"""
from __future__ import annotations

import io
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.auth import issue_token
from app import create_app


class ApiAuthTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def test_health_public(self):
        r = self.client.get("/api/health")
        self.assertEqual(r.status_code, 200)
        data = r.get_json()
        self.assertTrue(data.get("ok"))
        self.assertNotIn("dashscope_configured", data)

    def test_login_and_grade_auth(self):
        r = self.client.post(
            "/api/auth/login",
            json={"account": "13800138000", "password": "123456", "role": "teacher"},
        )
        self.assertEqual(r.status_code, 200)
        token = r.get_json()["token"]

        r2 = self.client.post("/api/grade", data={"subject": "math"})
        self.assertEqual(r2.status_code, 401)

        r3 = self.client.post(
            "/api/grade",
            data={"subject": "invalid"},
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(r3.status_code, 400)

    def test_uploads_require_auth(self):
        r = self.client.get("/uploads/nonexistent.jpg")
        self.assertEqual(r.status_code, 401)

    def test_teacher_health_detail(self):
        token = issue_token({"role": "teacher", "sub": "test"})
        r = self.client.get("/api/health", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(r.status_code, 200)
        self.assertIn("feedback_records", r.get_json())


class UploadValidationTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        login = self.client.post(
            "/api/auth/login",
            json={"account": "13800138000", "password": "123456", "role": "parent"},
        )
        self.token = login.get_json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_reject_empty_file(self):
        r = self.client.post(
            "/api/grade",
            data={"subject": "math", "file": (io.BytesIO(b""), "")},
            headers=self.headers,
            content_type="multipart/form-data",
        )
        self.assertIn(r.status_code, (400, 422))


if __name__ == "__main__":
    unittest.main()
