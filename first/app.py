import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, abort, request, url_for, jsonify, send_file, send_from_directory
from werkzeug.utils import secure_filename

ALLOWED_UPLOAD_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}


def safe_stored_filename(original: str) -> str:
    """生成磁盘上的安全文件名。纯中文等文件名经 secure_filename 常变成空串或仅剩扩展名（如 jpg），会导致保存异常或预览 URL 失效。"""
    original = original or ""
    ext = Path(original).suffix.lower()
    if ext not in ALLOWED_UPLOAD_EXT:
        ext = ".jpg"
    safe = secure_filename(original)
    if not safe:
        return f"{uuid.uuid4().hex}{ext}"
    stem = Path(safe).stem.lower()
    if stem == ext.lstrip(".").lower():
        return f"{uuid.uuid4().hex}{ext}"
    return safe


def _sanitize_grade_level(s: str) -> str:
    t = (s or "").strip()
    if len(t) > 48:
        t = t[:48]
    return t


def _sanitize_teacher_note(s: str) -> str:
    t = (s or "").strip().replace("\r\n", "\n")
    if len(t) > 1200:
        t = t[:1200]
    return t


def _sanitize_essay_prompt(s: str) -> str:
    t = (s or "").strip().replace("\r\n", "\n")
    if len(t) > 2000:
        t = t[:2000]
    return t


try:
    from math_correct import call_ai_math
except ImportError:
    call_ai_math = None

try:
    from english_essay import process_image as english_process
except ImportError:
    def english_process(p, *, grade_level="", teacher_note="", essay_prompt="", essay_prompt_image=""):
        return {"error": True, "score": "—", "comments": "英语批改模块加载失败", "weak_points": [], "scores": {}, "errors": []}


def math_process(image_path: str, *, grade_level: str = "", teacher_note: str = "") -> dict:
    """网页端数学批改入口：复用 math_correct 现有 AI 与规范化逻辑，不改动批改核心代码。"""
    if not image_path:
        return {
            "error": True,
            "score": "—",
            "comments": "未收到图片路径",
            "weak_points": [],
            "questions": [],
            "details": [],
        }
    if call_ai_math is None:
        return {
            "error": True,
            "score": "—",
            "comments": "数学批改模块加载失败，请检查 math_correct.py 是否存在。",
            "weak_points": [],
            "questions": [],
            "details": [],
        }

    try:
        data = call_ai_math(image_path, grade_level=grade_level, teacher_note=teacher_note)
        if data and data.get("questions"):
            try:
                from math_correct import normalize_math_result

                data = normalize_math_result(data)
            except Exception:
                pass
    except Exception as e:
        return {
            "error": True,
            "score": "—",
            "comments": f"批改过程异常：{e}。请查看服务端日志或联系管理员。",
            "weak_points": [],
            "questions": [],
            "details": [],
        }
    if not data:
        return {
            "error": True,
            "score": "—",
            "comments": "批改失败，请检查图片清晰度、网络或 API 配置后重试。",
            "weak_points": [],
            "questions": [],
            "details": [],
        }

    questions = data.get("questions") or []
    try:
        avg_score = round(sum(float(q.get("total_score", 0) or 0) for q in questions) / len(questions), 1) if questions else 0
        score_pct = round(avg_score * 10)
    except (TypeError, ValueError):
        avg_score = 0
        score_pct = 0

    data["error"] = False
    data["score"] = f"{avg_score}/10"
    data["score_pct"] = max(0, min(100, score_pct))
    data["process_score_avg"] = max(0, min(100, score_pct))
    data["comments"] = data.get("personal_comment", "")
    data.setdefault("weak_points", [])
    data.setdefault("details", [])
    return data

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Vite 生产构建目录：存在时由本服务托管 React SPA（/、/login、/math、/english 等）
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")


def _spa_index_path():
    return os.path.join(FRONTEND_DIST, "index.html")


def spa_built():
    return os.path.isfile(_spa_index_path())


@app.route("/assets/<path:filename>")
def frontend_vite_assets(filename):
    """Vite 打包后的 JS/CSS 等静态资源（路径与 dist/index.html 中 /assets/... 一致）。"""
    if not spa_built():
        abort(404)
    d = os.path.join(FRONTEND_DIST, "assets")
    if not os.path.isdir(d):
        abort(404)
    return send_from_directory(d, filename)


@app.route("/")
def index():
    if not spa_built():
        abort(
            404,
            description="未找到前端构建。请在项目下执行: cd frontend && npm install && npm run build",
        )
    return send_file(_spa_index_path())


@app.route("/login")
@app.route("/math")
@app.route("/english")
@app.route("/chinese")
@app.route("/settings")
@app.route("/wrong-book")
@app.route("/student-analytics")
@app.route("/class-analytics")
@app.route("/feedback-dashboard")
def spa_shell():
    """BrowserRouter 子路径：必须返回同一 index.html，否则刷新或直接打开子路由会 404。"""
    if not spa_built():
        abort(
            404,
            description="未找到前端构建。请在项目下执行: cd frontend && npm install && npm run build",
        )
    return send_file(_spa_index_path())


@app.route("/api/grade", methods=["POST"])
def api_grade():
    """异步批改接口：返回 JSON，避免长耗时请求时页面无反馈。"""
    subject = request.form.get("subject", "math")
    if "file" not in request.files:
        return jsonify({"ok": False, "message": "未选择文件"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"ok": False, "message": "文件名为空"}), 400

    filename = safe_stored_filename(file.filename)
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(file_path)

    grade_level = _sanitize_grade_level(request.form.get("grade_level") or "")
    teacher_note = _sanitize_teacher_note(request.form.get("teacher_note") or "")
    essay_prompt = _sanitize_essay_prompt(request.form.get("essay_prompt") or "")
    essay_prompt_image = ""
    prompt_file = request.files.get("prompt_file")
    if prompt_file and prompt_file.filename:
        if Path(prompt_file.filename).suffix.lower() not in ALLOWED_UPLOAD_EXT:
            return jsonify({"ok": False, "message": "题目图片格式不支持，请上传 JPG、PNG、WebP、BMP 或 GIF。"}), 400
        prompt_name = safe_stored_filename(f"prompt_{prompt_file.filename}")
        essay_prompt_image = os.path.join(app.config["UPLOAD_FOLDER"], prompt_name)
        prompt_file.save(essay_prompt_image)

    try:
        if subject == "math":
            result_data = math_process(file_path, grade_level=grade_level, teacher_note=teacher_note)
        elif subject == "english":
            result_data = english_process(
                file_path,
                grade_level=grade_level,
                teacher_note=teacher_note,
                essay_prompt=essay_prompt,
                essay_prompt_image=essay_prompt_image,
            )
        else:
            result_data = {"error": True, "comments": "暂不支持的科目"}
    except Exception as e:
        print(f"API grade error: {e}")
        result_data = {"error": True, "comments": f"系统错误: {e}"}

    image_url = url_for("uploaded_file", filename=filename)
    return jsonify({"ok": True, "subject": subject, "result": result_data, "image_url": image_url})


def _feedback_clip(s: object, max_len: int) -> str:
    if s is None:
        return ""
    t = str(s).strip().replace("\r\n", "\n")
    if len(t) > max_len:
        return t[:max_len]
    return t


GRADING_FEEDBACK_LOG = os.path.join(BASE_DIR, "grading_feedback.jsonl")
GRADING_DISPUTES_LOG = os.path.join(BASE_DIR, "grading_disputes.jsonl")

SPA_EXTRA_PATHS = (
    "/login",
    "/math",
    "/english",
    "/chinese",
    "/settings",
    "/wrong-book",
    "/student-analytics",
    "/class-analytics",
    "/feedback-dashboard",
)

try:
    from core.batch_insights_service import run_batch_insights
except ImportError:
    def run_batch_insights(*args, **kwargs):
        return {"ok": False, "message": "学情分析模块未加载"}

try:
    from core.disputes_service import DisputesStore

    _disputes_store = DisputesStore(GRADING_DISPUTES_LOG)
except ImportError:
    _disputes_store = None


@app.route("/api/grading-feedback", methods=["POST"])
def api_grading_feedback():
    """老师判题异议反馈（逐题 / 整卷）：追加写入项目根目录 grading_feedback.jsonl，供后续优化提示词、规则或学习模块。"""
    if not request.is_json:
        return jsonify({"ok": False, "message": "请求需为 JSON"}), 400
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"ok": False, "message": "无效请求体"}), 400

    user_feedback = (payload.get("user_feedback") or "").strip()
    if len(user_feedback) < 8:
        return jsonify({"ok": False, "message": "请至少用 8 个字说明判题问题，便于后续优化模型。"}), 400

    record = {
        "saved_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "feedback_scope": _feedback_clip(payload.get("feedback_scope"), 24) or "question",
        "subject": _feedback_clip(payload.get("subject"), 16),
        "dimension_key": _feedback_clip(payload.get("dimension_key"), 160),
        "dimension_label": _feedback_clip(payload.get("dimension_label"), 400),
        "status": _feedback_clip(payload.get("status"), 40),
        "value": payload.get("value"),
        "max": payload.get("max"),
        "detail_excerpt": _feedback_clip(payload.get("detail_excerpt"), 1200),
        "user_feedback": _feedback_clip(user_feedback, 4000),
        "job_file_base": _feedback_clip(payload.get("job_file_base"), 160),
        "subject_title": _feedback_clip(payload.get("subject_title"), 80),
        "overall_label": _feedback_clip(payload.get("overall_label"), 200),
        "score_percent": payload.get("score_percent"),
        "client_ts": payload.get("client_ts"),
        "image_ref": _feedback_clip(payload.get("image_ref"), 240),
        "image_url": _feedback_clip(payload.get("image_url"), 500),
        "history_entry_id": _feedback_clip(payload.get("history_entry_id"), 80),
        "local_file_name": _feedback_clip(payload.get("local_file_name"), 240),
        "batch_index": payload.get("batch_index"),
        "batch_total": payload.get("batch_total"),
    }

    try:
        with open(GRADING_FEEDBACK_LOG, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")
    except OSError as e:
        print(f"grading feedback write error: {e}")
        return jsonify({"ok": False, "message": "服务器暂无法写入反馈，请稍后重试。"}), 500

    return jsonify({"ok": True})


def _read_feedback_records(limit: int = 500) -> list:
    if not os.path.isfile(GRADING_FEEDBACK_LOG):
        return []
    rows = []
    with open(GRADING_FEEDBACK_LOG, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    rows.sort(key=lambda r: r.get("saved_at", ""), reverse=True)
    return rows[:limit]


@app.route("/api/grading-feedback", methods=["GET"])
def api_grading_feedback_list():
    """教师反馈看板：读取 grading_feedback.jsonl 摘要统计。"""
    records = _read_feedback_records()
    by_subject: dict[str, int] = {}
    by_scope: dict[str, int] = {}
    dim_counter: dict[str, int] = {}
    for r in records:
        sub = (r.get("subject") or "unknown").strip()
        by_subject[sub] = by_subject.get(sub, 0) + 1
        sc = (r.get("feedback_scope") or "question").strip()
        by_scope[sc] = by_scope.get(sc, 0) + 1
        label = (r.get("dimension_label") or r.get("overall_label") or "整卷").strip()[:60]
        dim_counter[label] = dim_counter.get(label, 0) + 1
    top_dims = sorted(dim_counter.items(), key=lambda x: -x[1])[:12]
    return jsonify(
        {
            "ok": True,
            "total": len(records),
            "by_subject": by_subject,
            "by_scope": by_scope,
            "top_dimensions": [{"label": k, "count": v} for k, v in top_dims],
            "recent": records[:30],
        }
    )


@app.route("/api/grading/batch-insights", methods=["POST"])
def api_batch_insights():
    """批量/个性化学情分析（本地聚合 + 可选 LLM），不调用数学/英语批改核心。"""
    if not request.is_json:
        return jsonify({"ok": False, "message": "请求需为 JSON"}), 400
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"ok": False, "message": "无效请求体"}), 400

    subject = (body.get("subject") or "math").strip()
    items = body.get("items")
    if not isinstance(items, list) or not items:
        return jsonify({"ok": False, "message": "items 不能为空"}), 400

    safe_items = []
    for it in items[:80]:
        if not isinstance(it, dict):
            continue
        safe_items.append(
            {
                "file_name": _feedback_clip(it.get("file_name"), 200),
                "score_percent": it.get("score_percent") if isinstance(it.get("score_percent"), (int, float)) else 0,
                "overall_label": _feedback_clip(it.get("overall_label"), 120),
                "weak_points": [str(x)[:80] for x in (it.get("weak_points") or [])[:20] if str(x).strip()],
                "dimensions": [
                    {
                        "label": _feedback_clip(d.get("label"), 200),
                        "status": _feedback_clip(d.get("status"), 40),
                        "detail": _feedback_clip(d.get("detail"), 400),
                        "is_error": bool(d.get("is_error")),
                    }
                    for d in (it.get("dimensions") or [])[:60]
                    if isinstance(d, dict)
                ],
            }
        )

    result = run_batch_insights(
        subject,
        safe_items,
        grade_level=_sanitize_grade_level(body.get("grade_level") or ""),
        teacher_note=_sanitize_teacher_note(body.get("teacher_note") or ""),
        group_name=_feedback_clip(body.get("group_name"), 120),
        use_llm=body.get("use_llm", True) is not False,
        analysis_mode=_feedback_clip(body.get("analysis_mode"), 32) or "batch",
        student_name=_feedback_clip(body.get("student_name"), 48),
    )
    if not result.get("ok"):
        return jsonify(result), 400
    return jsonify(result)


@app.route("/api/grading-disputes", methods=["POST"])
def api_disputes_create():
    if _disputes_store is None:
        return jsonify({"ok": False, "message": "异议模块未加载"}), 500
    if not request.is_json:
        return jsonify({"ok": False, "message": "请求需为 JSON"}), 400
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"ok": False, "message": "无效请求体"}), 400
    try:
        record = _disputes_store.create(payload)
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    except OSError as e:
        print(f"dispute write error: {e}")
        return jsonify({"ok": False, "message": "服务器暂无法保存申诉"}), 500
    return jsonify({"ok": True, "id": record["id"]})


@app.route("/api/grading-disputes", methods=["GET"])
def api_disputes_list():
    if _disputes_store is None:
        return jsonify({"ok": False, "message": "异议模块未加载"}), 500
    status = (request.args.get("status") or "").strip() or None
    ids_raw = (request.args.get("ids") or "").strip()
    ids = [x.strip() for x in ids_raw.split(",") if x.strip()] if ids_raw else None
    items = _disputes_store.list_items(status=status, ids=ids)
    pending_count = _disputes_store.count_pending()
    return jsonify({"ok": True, "items": items, "pending_count": pending_count})


@app.route("/api/grading-disputes/<dispute_id>/review", methods=["POST"])
def api_disputes_review(dispute_id: str):
    if _disputes_store is None:
        return jsonify({"ok": False, "message": "异议模块未加载"}), 500
    if not request.is_json:
        return jsonify({"ok": False, "message": "请求需为 JSON"}), 400
    body = request.get_json(silent=True) or {}
    action = (body.get("action") or "").strip()
    teacher_reply = _feedback_clip(body.get("teacher_reply"), 2000)
    try:
        _disputes_store.review(dispute_id, action, teacher_reply)
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    except OSError as e:
        print(f"dispute review error: {e}")
        return jsonify({"ok": False, "message": "审核保存失败"}), 500
    return jsonify({"ok": True})


@app.route("/api/health", methods=["GET"])
def api_health():
    """演示环境健康检查与批改次数占位。"""
    feedback_n = len(_read_feedback_records(1000))
    dispute_n = 0
    pending = 0
    if _disputes_store:
        rows = _disputes_store.list_items(limit=1000)
        dispute_n = len(rows)
        pending = _disputes_store.count_pending()
    return jsonify(
        {
            "ok": True,
            "spa_built": spa_built(),
            "feedback_records": feedback_n,
            "dispute_records": dispute_n,
            "dispute_pending": pending,
            "dashscope_configured": bool(os.getenv("DASHSCOPE_API_KEY", "").strip()),
        }
    )


@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return app.send_from_directory(app.config["UPLOAD_FOLDER"], filename)


if __name__ == "__main__":
    # app.run(debug=True)
     app.run(debug=True, port=50003)