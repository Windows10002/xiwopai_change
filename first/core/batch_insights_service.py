"""批量/个性化学情分析：聚合批改摘要，可选调用 DashScope 文本模型。不改动 math_correct / english_essay 批改逻辑。"""
from __future__ import annotations

import json
import os
import re
from collections import Counter
from typing import Any

MATH_ERROR = frozenset({"错误", "未作答", "过程不规范"})


def _is_error(subject: str, status: str | None) -> bool:
    if not status:
        return False
    if subject == "math":
        return status in MATH_ERROR
    return status in ("错误", "未作答")


def aggregate_batch_locally(subject: str, items: list[dict]) -> dict[str, Any]:
    weak_map: Counter[str] = Counter()
    pattern_map: Counter[str] = Counter()
    status_map: Counter[str] = Counter()
    score_sum = 0.0
    score_n = 0

    for it in items:
        sp = it.get("score_percent")
        if isinstance(sp, (int, float)):
            score_sum += float(sp)
            score_n += 1
        label = (it.get("overall_label") or "—").strip() or "—"
        status_map[label] += 1
        for w in it.get("weak_points") or []:
            t = str(w).strip()
            if t:
                weak_map[t] += 1
        for d in it.get("dimensions") or []:
            if not d.get("is_error") and not _is_error(subject, d.get("status")):
                continue
            st = d.get("status") or "错题"
            lab = str(d.get("label") or "")[:36]
            key = f"{st}·{lab}"
            pattern_map[key] += 1

    weak_ranked = [{"tag": k, "count": v} for k, v in weak_map.most_common(10)]
    err_patterns = [{"pattern": k, "count": v} for k, v in pattern_map.most_common(12)]
    avg = round(score_sum / score_n, 1) if score_n else None
    suggestions: list[str] = []
    if weak_ranked:
        suggestions.append(f"建议针对「{weak_ranked[0]['tag']}」开展专项训练。")
    if err_patterns:
        suggestions.append(f"重点关注：{err_patterns[0]['pattern']}。")

    n = len(items)
    is_single = n == 1
    scope = "本份作业" if is_single else f"本批 {n} 份"
    title = "## 学情分析报告（本份作业 · 本地汇总）" if is_single else "## 学情分析报告（本地汇总）"
    lines = [
        title,
        "",
        f"- 范围：{scope}" if is_single else f"- 份数：{n}",
    ]
    if avg is not None:
        lines.append(f"- 平均得分率：{avg}%")
    lines.extend(["", "### 薄弱知识点"])
    if weak_ranked:
        lines.extend(f"- {w['tag']}（{w['count']} 次）" for w in weak_ranked)
    else:
        lines.append("- 暂无显著薄弱点")
    lines.extend(["", "### 错题模式"])
    if err_patterns:
        lines.extend(f"- {p['pattern']}（{p['count']} 次）" for p in err_patterns)
    else:
        lines.append("- 暂无错题模式汇总")

    summary_md = "\n".join(lines)
    return {
        "stats": {
            "paper_count": n,
            "avg_score_percent": avg,
            "status_distribution": dict(status_map),
            "weak_knowledge_ranked": weak_ranked,
            "error_patterns": err_patterns,
            "teaching_suggestions": suggestions,
        },
        "learning_report": {
            "summary_md": summary_md,
            "error_patterns": err_patterns,
            "weak_knowledge_ranked": weak_ranked,
            "teaching_suggestions": suggestions,
        },
    }


def build_rule_variants(subject: str, local: dict[str, Any]) -> dict[str, Any]:
    stats = local.get("stats") or {}
    weak = stats.get("weak_knowledge_ranked") or []
    patterns = stats.get("error_patterns") or []
    paper_count = stats.get("paper_count") or 1
    is_single = paper_count == 1
    knowledge_summary = [
        {
            "name": w["tag"],
            "frequency": w["count"],
            "mastery_hint": "需巩固" if w["count"] >= 2 else ("本卷薄弱" if is_single else "偶发"),
            "typical_errors": [],
        }
        for w in weak
    ]
    variant_problems: list[dict[str, str]] = []
    seen: set[str] = set()

    def push(kp: str, vtype: str, stem: str) -> None:
        key = kp[:40]
        if key in seen:
            return
        seen.add(key)
        variant_problems.append(
            {
                "knowledge_point": kp,
                "difficulty": "中等",
                "variation_type": vtype,
                "stem": stem,
                "answer_hint": "对照本卷错题订正要点与课堂讲解完成。"
                if is_single
                else "对照本批错题中的正确步骤与订正要点完成。",
            }
        )

    for w in weak[: 4 if is_single else 6]:
        if subject == "math":
            stem = f"围绕「{w['tag']}」出一道计算/应用练习（难度适中）。"
            push(w["tag"], "数值变式", stem)
        else:
            stem = f"围绕「{w['tag']}」写一句符合语境的英语表达。"
            push(w["tag"], "句型变式", stem)

    for p in patterns:
        if len(variant_problems) >= (4 if is_single else 8):
            break
        label = p["pattern"]
        if "·" in label:
            label = label.split("·", 1)[-1].strip()
        kp = label or p["pattern"]
        push(
            kp[:48],
            "纠错变式" if subject == "math" else "表达变式",
            f"针对「{kp}」类错题设计一题巩固练习（出现 {p['count']} 次）。",
        )

    intro = (
        "基于本份作业的错题与薄弱点整理的变形题建议；运行「AI 深度分析」可获得更具体的题干。"
        if is_single
        else f"本批（{paper_count} 份）知识点与变形题建议；完整题干可运行 AI 深度分析。"
    )
    return {"intro": intro, "knowledge_summary": knowledge_summary, "variant_problems": variant_problems}


def _call_llm_insights(
    subject: str,
    items: list[dict],
    local: dict[str, Any],
    *,
    grade_level: str = "",
    teacher_note: str = "",
    group_name: str = "",
    analysis_mode: str = "batch",
    student_name: str = "",
) -> dict[str, Any] | None:
    try:
        import dashscope
        from http import HTTPStatus
    except ImportError:
        return None

    api_key = os.getenv("DASHSCOPE_API_KEY", "").strip()
    if api_key:
        dashscope.api_key = api_key
    if not getattr(dashscope, "api_key", None):
        return None

    subj_cn = "数学" if subject == "math" else "英语作文"
    scope = "单名学生多次作业" if analysis_mode == "student_personalized" and student_name else "一批作业"
    payload_lines = []
    for it in items[:40]:
        payload_lines.append(
            json.dumps(
                {
                    "file": it.get("file_name"),
                    "score_percent": it.get("score_percent"),
                    "overall": it.get("overall_label"),
                    "weak": it.get("weak_points"),
                    "errors": [
                        {"label": d.get("label"), "status": d.get("status"), "detail": (d.get("detail") or "")[:120]}
                        for d in (it.get("dimensions") or [])
                        if d.get("is_error") or _is_error(subject, d.get("status"))
                    ][:8],
                },
                ensure_ascii=False,
            )
        )

    stats = local.get("stats") or {}
    prompt = f"""你是资深{subj_cn}教研员。根据以下批改摘要（{scope}，共 {len(items)} 份），生成学情分析与教学建议。
年级/学段：{grade_level or "未填"}
批次/分组：{group_name or "未命名"}
学生：{student_name or "—"}
教师备注：{teacher_note or "无"}

本地统计：平均分率 {stats.get("avg_score_percent")}%；薄弱点 {stats.get("weak_knowledge_ranked")}；错题模式 {stats.get("error_patterns")}

批改条目（JSON 行）：
{chr(10).join(payload_lines)}

请仅输出一个 JSON 对象（无 Markdown），格式：
{{
  "summary_md": "Markdown 正文（简体中文，含 ## 标题）",
  "teaching_suggestions": ["建议1", "建议2"],
  "error_patterns": [{{"pattern": "模式名", "count": 数字, "description": "说明"}}],
  "weak_knowledge_ranked": [{{"tag": "知识点", "count": 数字, "analysis": "分析"}}],
  "variant_problems": [
    {{"knowledge_point": "知识点", "difficulty": "中等", "variation_type": "类型", "stem": "题干", "answer_hint": "提示"}}
  ]
}}
变形题 3～6 道，须贴合薄弱点。"""

    try:
        resp = dashscope.Generation.call(
            model=os.getenv("DASHSCOPE_TEXT_MODEL", "qwen-plus"),
            messages=[{"role": "user", "content": prompt}],
            result_format="message",
        )
        if getattr(resp, "status_code", None) != HTTPStatus.OK:
            return None
        content = resp.output.choices[0].message.content
        if isinstance(content, list):
            content = content[0].get("text", "") if content else ""
        m = re.search(r"\{.*\}", str(content), re.DOTALL)
        if not m:
            return None
        parsed = json.loads(m.group())
        lr = local.get("learning_report") or {}
        return {
            "learning_report": {
                "summary_md": parsed.get("summary_md") or lr.get("summary_md", ""),
                "teaching_suggestions": parsed.get("teaching_suggestions") or lr.get("teaching_suggestions", []),
                "error_patterns": parsed.get("error_patterns") or lr.get("error_patterns", []),
                "weak_knowledge_ranked": parsed.get("weak_knowledge_ranked") or lr.get("weak_knowledge_ranked", []),
            },
            "knowledge_variants": {
                "intro": f"AI 深度分析 · {group_name or scope}",
                "knowledge_summary": [
                    {
                        "name": w.get("tag", ""),
                        "frequency": w.get("count", 0),
                        "mastery_hint": (w.get("analysis") or "")[:80],
                        "typical_errors": [],
                    }
                    for w in (parsed.get("weak_knowledge_ranked") or [])
                ],
                "variant_problems": parsed.get("variant_problems") or [],
            },
        }
    except Exception as e:
        print(f"batch insights LLM error: {e}")
        return None


def run_batch_insights(
    subject: str,
    items: list[dict],
    *,
    grade_level: str = "",
    teacher_note: str = "",
    group_name: str = "",
    use_llm: bool = True,
    analysis_mode: str = "batch",
    student_name: str = "",
) -> dict[str, Any]:
    if not items:
        return {"ok": False, "message": "无批改条目"}
    if subject not in ("math", "english"):
        return {"ok": False, "message": "不支持的学科"}

    local = aggregate_batch_locally(subject, items)
    variants = build_rule_variants(subject, local)
    out: dict[str, Any] = {"ok": True, **local, "knowledge_variants": variants}

    if use_llm:
        llm = _call_llm_insights(
            subject,
            items,
            local,
            grade_level=grade_level,
            teacher_note=teacher_note,
            group_name=group_name,
            analysis_mode=analysis_mode,
            student_name=student_name,
        )
        if llm:
            if llm.get("learning_report"):
                out["learning_report"] = llm["learning_report"]
            kv = llm.get("knowledge_variants")
            if kv and (kv.get("variant_problems") or kv.get("knowledge_summary")):
                out["knowledge_variants"] = kv

    return out
