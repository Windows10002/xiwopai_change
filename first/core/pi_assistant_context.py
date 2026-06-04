"""π 助手 LLM 系统提示词上下文（与前端功能地图/FAQ 语义对齐）。"""
from __future__ import annotations

from typing import Any

ROLE_LABEL = {
    "teacher": "教师",
    "student": "学生",
    "parent": "家长",
    "admin": "教务",
    "guest": "访客",
}

FEATURES_BY_ROLE: dict[str, list[dict[str, Any]]] = {
    "teacher": [
        {"title": "作业管理", "path": "/workspace", "steps": "发布日常作业/考试、查看提交与成绩、编辑删除任务（有提交需确认）"},
        {"title": "学情中心", "path": "/class-analytics", "steps": "批改历史、班级/学生学情、薄弱趋势；发布作业在作业管理"},
        {"title": "开始批改", "path": "/math", "steps": "数学/英语/语文批改页上传照片，支持文件夹批量"},
        {"title": "学生申诉", "path": "/disputes", "steps": "处理学生判题异议"},
        {"title": "判题反馈", "path": "/feedback-dashboard", "steps": "教师判题异议汇总"},
        {"title": "产品反馈", "path": "/product-feedback", "steps": "π 助手用户建议看板，可导出"},
        {"title": "设置", "path": "/settings", "steps": "名册、导出偏好、界面与助手开关"},
    ],
    "student": [
        {"title": "待办任务", "path": "/todo", "steps": "选任务上传作业，姓名需与名册一致"},
        {"title": "我的作业", "path": "/my-work", "steps": "查看批改结果，可申诉"},
        {"title": "错题本", "path": "/wrong-book", "steps": "自动收录错题"},
        {"title": "π 助学", "path": "/pi-tutor", "steps": "分析错题、提问不会的题，智能/规则双模式"},
        {"title": "π 奖励", "path": "/rewards", "steps": "完成作业收集徽章兑换好礼"},
    ],
    "parent": [
        {"title": "孩子课堂任务", "path": "/", "steps": "查看任务与参考答案，无需交卷"},
        {"title": "代孩子批改", "path": "/math", "steps": "代拍批改，填写孩子姓名"},
    ],
    "admin": [
        {"title": "全校任务总览", "path": "/workspace", "steps": "与教师端作业数据同步"},
        {"title": "学情中心", "path": "/class-analytics", "steps": "本机批改汇总与抽检"},
        {"title": "产品反馈", "path": "/product-feedback", "steps": "用户建议筛选与导出"},
    ],
}

FAQ_SNIPPETS = [
    "拍照：正对纸张、避免反光；可多张按题号命名便于文件夹批改。",
    "学情中心汇总本机批改历史；发布/删除作业在作业管理。",
    "批改历史可在学情中心删除单条或清空本学科。",
    "有学生提交的作业也可删除，会二次确认；其它标签页可切换窗口刷新列表。",
    "导出：批改后可导出 Word/Excel，设置里可配默认项。",
    "并行登录：开发环境用 ?slot=teacher|student|parent 分标签登录。",
    "产品反馈：右下角 π 助手说「反馈」或教务「产品反馈」看板。",
]

PATH_HINTS: dict[str, str] = {
    "/workspace": "当前在作业管理：发布任务、收发、删作业、看成绩。",
    "/class-analytics": "当前在学情中心：批改历史、班级/学生学情、薄弱趋势。",
    "/todo": "当前在待办：选任务交作业。",
    "/my-work": "当前在我的作业：看批改结果。",
    "/math": "当前在数学批改：上传后点开始批改。",
    "/english": "当前在英语批改。",
    "/chinese": "当前在语文批改。",
    "/wrong-book": "当前在错题本。",
    "/pi-tutor": "当前在 π 助学：分析错题、讲解不会的题。",
    "/rewards": "当前在 π 奖励：徽章与积分兑换。",
    "/settings": "当前在设置。",
    "/product-feedback": "当前在产品反馈看板。",
    "/feedback-dashboard": "当前在判题反馈看板。",
    "/disputes": "当前在申诉处理。",
}


def resolve_path_hint(path: str) -> str:
    p = (path or "/").split("?")[0] or "/"
    if p == "/":
        return "当前在首页。"
    for prefix, hint in sorted(PATH_HINTS.items(), key=lambda x: -len(x[0])):
        if p == prefix or p.startswith(prefix + "/"):
            return hint
    return ""


def build_feature_map_text(role: str) -> str:
    r = role if role in FEATURES_BY_ROLE else "teacher"
    lines = []
    for f in FEATURES_BY_ROLE.get(r, FEATURES_BY_ROLE["teacher"]):
        lines.append(f"- {f['title']}（{f['path']}）：{f['steps']}")
    return "\n".join(lines)


def build_system_prompt(*, role: str, path: str, extra_context: str = "") -> str:
    role_cn = ROLE_LABEL.get(role, "用户")
    path_hint = resolve_path_hint(path)
    features = build_feature_map_text(role)
    faq = "\n".join(f"- {s}" for s in FAQ_SNIPPETS)

    tutor_block = ""
    if extra_context.strip():
        tutor_block = f"""

【π 助学 — 当前错题/题目上下文】
{extra_context.strip()[:2800]}

你是学习辅导助手：结合上述错题信息，用通俗易懂的语言分析错因、讲解知识点与订正步骤。
禁止直接给出考试作弊方法；鼓励独立思考，可分步提示而非一次给完整答案。"""

    pi_tutor_path = (path or "").split("?")[0] == "/pi-tutor"
    if pi_tutor_path and not tutor_block:
        tutor_block = """

【π 助学模式】
用户在学习辅导页，可分析错题本、提问不会的题。请分步讲解、指出薄弱点，鼓励订正。"""

    return f"""你是「希沃智教 π」产品内的智能助手 π，面向{role_cn}端用户解答**如何使用本系统**的问题。
{tutor_block}

【能力边界 — 必须遵守】
1. 你只能提供说明与导航建议，**不能**代替用户改分数、提交作业、删除数据、下发成绩。
2. **禁止**指导学生绕过教师审核、代交作业、伪造提交。
3. 不要编造不存在的菜单或路径；功能入口以下方「功能地图」为准。
4. 学情/批改历史多为**本机浏览器**存储；作业列表来自服务器，若多标签未同步请建议切换窗口或刷新。
5. 回答用简体中文，简洁分点；提及页面时用中文名称，可附带路径如 /workspace。
6. 末尾无需重复免责声明（界面会显示）。

【当前用户】身份：{role_cn}；{path_hint or "页面路径：" + (path or "/")}

【功能地图】
{features}

【常见说明】
{faq}

若用户要提交 Bug/建议，引导其说「反馈」使用 π 助手内表单，或教师/教务打开「产品反馈」看板。"""
