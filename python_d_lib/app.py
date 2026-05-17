import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, abort, render_template, request, redirect, url_for, jsonify, send_file, send_from_directory
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


try:
    from math_correct import call_ai_math
except ImportError:
    call_ai_math = None

try:
    from english_essay import process_image as english_process
except ImportError:
    def english_process(p, *, grade_level="", teacher_note=""):
        return {"error": True, "score": "—", "comments": "英语批改模块加载失败", "weak_points": [], "scores": {}, "errors": []}

try:
    from grading_insights import generate_batch_insights
except ImportError:
    generate_batch_insights = None


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

    data = call_ai_math(image_path, grade_level=grade_level, teacher_note=teacher_note)
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


def _send_spa_index():
    """返回 SPA 入口并禁止缓存 index.html，避免浏览器沿用旧 JS 文件名。"""
    resp = send_file(_spa_index_path())
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp


def subject_name_cn(subject: str) -> str:
    return {"english": "英语作文", "math": "数学作业", "chinese": "语文作文"}.get(subject, subject)


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
    if spa_built():
        return _send_spa_index()
    return render_template("index.html")


@app.route("/login")
@app.route("/math")
@app.route("/english")
@app.route("/settings")
def spa_shell():
    """BrowserRouter 子路径：必须返回同一 index.html，否则刷新或直接打开 /login 会 404。"""
    if not spa_built():
        abort(
            404,
            description="未找到前端构建。请在项目下执行: cd frontend && npm install && npm run build",
        )
    return _send_spa_index()


@app.route("/grading/<subject>")
def grading(subject):
    default_result = {
        "score": "—",
        "comments": "上传作业照片后，系统将自动完成识别、过程性评分与学情分析。",
        "weak_points": [],
        "details": [],
        "scores": {},
    }
    return render_template(
        "grading.html",
        subject=subject,
        subject_name=subject_name_cn(subject),
        result=default_result,
        uploaded_image=None,
    )


@app.route("/upload", methods=["POST"])
def upload_file():
    subject = request.form.get("subject", "math")
    if "file" not in request.files:
        return redirect(url_for("grading", subject=subject))

    file = request.files["file"]
    if file.filename == "":
        return redirect(url_for("grading", subject=subject))

    if Path(file.filename).suffix.lower() not in ALLOWED_UPLOAD_EXT:
        return jsonify({"ok": False, "message": "图片格式不支持，请上传 JPG、PNG、WebP、BMP 或 GIF。"}), 400

    if Path(file.filename).suffix.lower() not in ALLOWED_UPLOAD_EXT:
        return jsonify({"ok": False, "message": "图片格式不支持，请上传 JPG、PNG、WebP、BMP 或 GIF。"}), 400

    filename = safe_stored_filename(file.filename)
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(file_path)

    try:
        if subject == "math":
            result_data = math_process(file_path)
        elif subject == "english":
            result_data = english_process(file_path)
        else:
            result_data = {"error": True, "score": "—", "comments": "暂不支持的科目", "weak_points": [], "details": []}
    except Exception as e:
        print(f"Error running AI logic: {e}")
        result_data = {"error": True, "score": "—", "comments": f"系统错误: {e}", "weak_points": [], "details": []}

    return render_template(
        "grading.html",
        result=result_data,
        subject=subject,
        subject_name=subject_name_cn(subject),
        uploaded_image=filename,
    )


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

    try:
        if subject == "math":
            result_data = math_process(file_path, grade_level=grade_level, teacher_note=teacher_note)
        elif subject == "english":
            result_data = english_process(file_path, grade_level=grade_level, teacher_note=teacher_note)
        else:
            result_data = {"error": True, "comments": "暂不支持的科目"}
    except Exception as e:
        print(f"API grade error: {e}")
        result_data = {"error": True, "comments": f"系统错误: {e}"}

    image_url = url_for("uploaded_file", filename=filename)
    return jsonify({"ok": True, "subject": subject, "result": result_data, "image_url": image_url})


@app.route("/api/grading/batch-insights", methods=["POST"])
def api_grading_batch_insights():
    """批量学情分析：错题模式、薄弱知识点、变式题建议。"""
    if generate_batch_insights is None:
        return jsonify({"ok": False, "message": "学情分析模块未加载"}), 503

    if not request.is_json:
        return jsonify({"ok": False, "message": "请求需为 JSON"}), 400

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"ok": False, "message": "无效请求体"}), 400

    subject = (payload.get("subject") or "math").strip().lower()
    if subject not in ("math", "english"):
        return jsonify({"ok": False, "message": "仅支持 math 或 english"}), 400

    items = payload.get("items")
    if not isinstance(items, list) or len(items) == 0:
        return jsonify({"ok": False, "message": "请提供至少一份已批改作业摘要"}), 400
    if len(items) > 80:
        return jsonify({"ok": False, "message": "单次最多分析 80 份作业"}), 400

    grade_level = _sanitize_grade_level(payload.get("grade_level") or "")
    teacher_note = _sanitize_teacher_note(payload.get("teacher_note") or "")
    group_name = _feedback_clip(payload.get("group_name"), 120)
    use_llm = payload.get("use_llm", True) is not False

    try:
        out = generate_batch_insights(
            subject,
            items,
            grade_level=grade_level,
            teacher_note=teacher_note,
            group_name=group_name,
            use_llm=use_llm,
        )
        return jsonify(out)
    except Exception as e:
        print(f"batch-insights error: {e}")
        return jsonify({"ok": False, "message": f"学情分析失败: {e}"}), 500


def _feedback_clip(s: object, max_len: int) -> str:
    if s is None:
        return ""
    t = str(s).strip().replace("\r\n", "\n")
    if len(t) > max_len:
        return t[:max_len]
    return t


GRADING_FEEDBACK_LOG = os.path.join(BASE_DIR, "grading_feedback.jsonl")


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


GRADING_DISPUTES_FILE = os.path.join(BASE_DIR, "grading_disputes.json")


def _load_disputes():
    if not os.path.isfile(GRADING_DISPUTES_FILE):
        return []
    try:
        with open(GRADING_DISPUTES_FILE, encoding="utf-8") as fh:
            data = json.load(fh)
        return data if isinstance(data, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def _save_disputes(items):
    with open(GRADING_DISPUTES_FILE, "w", encoding="utf-8") as fh:
        json.dump(items, fh, ensure_ascii=False, indent=2)


def _dispute_from_payload(payload: dict) -> dict:
    user_feedback = (payload.get("user_feedback") or "").strip()
    return {
        "feedback_scope": _feedback_clip(payload.get("feedback_scope"), 24) or "question",
        "subject": _feedback_clip(payload.get("subject"), 16),
        "dimension_key": _feedback_clip(payload.get("dimension_key"), 160),
        "dimension_label": _feedback_clip(payload.get("dimension_label"), 400),
        "status_snapshot": _feedback_clip(payload.get("status"), 40),
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
        "submitter_role": _feedback_clip(payload.get("submitter_role"), 16) or "student",
        "student_grade": payload.get("student_grade"),
    }


def _append_grading_feedback_record(record: dict):
    with open(GRADING_FEEDBACK_LOG, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(record, ensure_ascii=False) + "\n")


@app.route("/api/grading-disputes", methods=["GET", "POST"])
def api_grading_disputes():
  if request.method == "GET":
    items = _load_disputes()
    status_q = (request.args.get("status") or "").strip()
    if status_q in ("pending", "confirmed", "rejected"):
      items = [x for x in items if x.get("status") == status_q]
    ids_raw = (request.args.get("ids") or "").strip()
    if ids_raw:
      want = {s.strip() for s in ids_raw.split(",") if s.strip()}
      items = [x for x in items if x.get("id") in want]
    items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return jsonify({"ok": True, "items": items})

  if not request.is_json:
    return jsonify({"ok": False, "message": "请求需为 JSON"}), 400
  payload = request.get_json(silent=True)
  if not isinstance(payload, dict):
    return jsonify({"ok": False, "message": "无效请求体"}), 400

  user_feedback = (payload.get("user_feedback") or "").strip()
  if len(user_feedback) < 8:
    return jsonify({"ok": False, "message": "请至少用 8 个字说明判题问题。"}), 400

  body = _dispute_from_payload(payload)
  dispute_id = uuid.uuid4().hex
  record = {
    "id": dispute_id,
    "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    "status": "pending",
    "teacher_reply": "",
    "reviewed_at": None,
    **body,
  }
  items = _load_disputes()
  items.append(record)
  try:
    _save_disputes(items)
  except OSError as e:
    print(f"grading dispute write error: {e}")
    return jsonify({"ok": False, "message": "服务器暂无法保存申诉，请稍后重试。"}), 500
  return jsonify({"ok": True, "id": dispute_id})


@app.route("/api/grading-disputes/<dispute_id>/review", methods=["POST"])
def api_grading_dispute_review(dispute_id):
  if not request.is_json:
    return jsonify({"ok": False, "message": "请求需为 JSON"}), 400
  payload = request.get_json(silent=True)
  if not isinstance(payload, dict):
    return jsonify({"ok": False, "message": "无效请求体"}), 400

  action = (payload.get("action") or "").strip()
  if action not in ("confirm", "reject"):
    return jsonify({"ok": False, "message": "action 须为 confirm 或 reject"}), 400

  teacher_reply = _feedback_clip(payload.get("teacher_reply"), 2000)
  if action == "reject" and len(teacher_reply.strip()) < 4:
    return jsonify({"ok": False, "message": "驳回时请至少用 4 个字向学生说明理由。"}), 400

  items = _load_disputes()
  target = None
  for item in items:
    if item.get("id") == dispute_id:
      target = item
      break
  if not target:
    return jsonify({"ok": False, "message": "未找到该申诉"}), 404
  if target.get("status") != "pending":
    return jsonify({"ok": False, "message": "该申诉已处理"}), 400

  reviewed_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
  if action == "confirm":
    target["status"] = "confirmed"
    target["teacher_reply"] = teacher_reply
    target["reviewed_at"] = reviewed_at
    feedback_record = {
      "saved_at": reviewed_at,
      "feedback_scope": target.get("feedback_scope") or "question",
      "subject": target.get("subject"),
      "dimension_key": target.get("dimension_key"),
      "dimension_label": target.get("dimension_label"),
      "status": target.get("status_snapshot"),
      "value": target.get("value"),
      "max": target.get("max"),
      "detail_excerpt": target.get("detail_excerpt"),
      "user_feedback": target.get("user_feedback"),
      "job_file_base": target.get("job_file_base"),
      "subject_title": target.get("subject_title"),
      "overall_label": target.get("overall_label"),
      "score_percent": target.get("score_percent"),
      "client_ts": target.get("client_ts"),
      "image_ref": target.get("image_ref"),
      "image_url": target.get("image_url"),
      "history_entry_id": target.get("history_entry_id"),
      "local_file_name": target.get("local_file_name"),
      "batch_index": target.get("batch_index"),
      "batch_total": target.get("batch_total"),
      "source": "student_dispute_confirmed",
      "dispute_id": dispute_id,
      "teacher_reply": teacher_reply,
    }
    try:
      _append_grading_feedback_record(feedback_record)
      _save_disputes(items)
    except OSError as e:
      print(f"grading dispute confirm error: {e}")
      return jsonify({"ok": False, "message": "写入反馈日志失败，请稍后重试。"}), 500
  else:
    target["status"] = "rejected"
    target["teacher_reply"] = teacher_reply
    target["reviewed_at"] = reviewed_at
    try:
      _save_disputes(items)
    except OSError as e:
      print(f"grading dispute reject error: {e}")
      return jsonify({"ok": False, "message": "保存驳回结果失败，请稍后重试。"}), 500

  return jsonify({"ok": True})


@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return app.send_from_directory(app.config["UPLOAD_FOLDER"], filename)


if __name__ == "__main__":
    # 默认 5001，避免 Windows 上 5000 常被其它服务占用；可用环境变量 PORT 覆盖
    port = int(os.environ.get("PORT", "5008"))
    print(f" * 服务地址: http://127.0.0.1:{port}  （React 页: /math /english；开发前端请 npm run dev 并代理到此端口）")
    app.run(debug=True, host="127.0.0.1", port=port)
