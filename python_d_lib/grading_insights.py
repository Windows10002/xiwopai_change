"""
批量批改学情分析：错题模式汇总、薄弱知识点、变式题建议。
供 Flask /api/grading/batch-insights 调用；聚合逻辑可独立于 LLM 运行。
"""

from __future__ import annotations

import json
import logging
import os
import re
from collections import Counter, defaultdict
from http import HTTPStatus
from typing import Any

import dashscope
from dashscope import Generation

from dashscope_config import configure_dashscope, get_dashscope_api_key

configure_dashscope()

TEXT_MODEL = os.getenv("DASHSCOPE_TEXT_MODEL", "qwen-plus")

MATH_ERROR_STATUSES = {"错误", "未作答", "过程不规范"}
ENGLISH_ERROR_STATUSES = {"错误", "未作答"}


def _clip(s: str, n: int = 280) -> str:
    t = (s or "").strip()
    if len(t) <= n:
        return t
    return t[: n - 1] + "…"


def _extract_math_reason_tags(reason: str) -> list[str]:
    tags: list[str] = []
    if not reason:
        return tags
    for key in ("【薄弱点】", "【错误原因】", "【知识点】"):
        m = re.search(rf"{re.escape(key)}([^【\n]+)", reason)
        if m:
            tags.append(m.group(1).strip()[:80])
    return tags


def aggregate_batch_items(subject: str, items: list[dict]) -> dict[str, Any]:
    """从前端提交的批改摘要聚合统计（不依赖 LLM）。"""
    if not items:
        return {"paper_count": 0, "success_count": 0}

    weak_counter: Counter[str] = Counter()
    status_counter: Counter[str] = Counter()
    error_pattern_counter: Counter[str] = Counter()
    knowledge_counter: Counter[str] = Counter()
    score_list: list[float] = []
    per_paper: list[dict] = []

    for it in items:
        fn = str(it.get("file_name") or it.get("fileName") or "未命名")
        score = it.get("score_percent", it.get("scorePercent"))
        try:
            score_f = float(score) if score is not None else None
        except (TypeError, ValueError):
            score_f = None
        if score_f is not None:
            score_list.append(score_f)

        overall = str(it.get("overall_label") or it.get("overallLabel") or "")
        if overall:
            status_counter[overall] += 1

        weak_pts = it.get("weak_points") or it.get("weakKnowledgeTags") or []
        if isinstance(weak_pts, str):
            weak_pts = [w.strip() for w in weak_pts.split(",") if w.strip()]
        for w in weak_pts:
            w = str(w).strip()
            if w:
                weak_counter[w] += 1
                knowledge_counter[w] += 1

        paper_errors: list[dict] = []
        dims = it.get("dimensions") or it.get("error_questions") or []
        for d in dims:
            if not isinstance(d, dict):
                continue
            status = str(d.get("status") or "")
            label = str(d.get("label") or d.get("expr") or "")
            reason = str(d.get("reason") or d.get("detail") or d.get("reason_snippet") or "")
            is_err = status in (MATH_ERROR_STATUSES if subject == "math" else ENGLISH_ERROR_STATUSES)
            if subject == "math" and status == "过程不规范":
                is_err = True
            if is_err or d.get("is_error"):
                pattern_key = status or "错题"
                if label:
                    pattern_key = f"{pattern_key}·{_clip(label, 40)}"
                error_pattern_counter[pattern_key] += 1
                for t in _extract_math_reason_tags(reason):
                    knowledge_counter[t] += 1
                paper_errors.append(
                    {
                        "label": _clip(label, 60),
                        "status": status,
                        "reason": _clip(reason, 200),
                    }
                )

        per_paper.append(
            {
                "file_name": fn,
                "score_percent": score_f,
                "overall_label": overall,
                "weak_points": list(weak_pts)[:8],
                "error_count": len(paper_errors),
                "errors": paper_errors[:6],
            }
        )

    top_weak = [{"tag": k, "count": v} for k, v in weak_counter.most_common(12)]
    top_patterns = [{"pattern": k, "count": v} for k, v in error_pattern_counter.most_common(15)]
    top_knowledge = [{"name": k, "count": v} for k, v in knowledge_counter.most_common(15)]

    avg_score = round(sum(score_list) / len(score_list), 1) if score_list else None

    suggestions: list[str] = []
    if top_weak:
        suggestions.append(f"建议针对「{top_weak[0]['tag']}」安排 1～2 课时专项巩固与当堂小测。")
    if top_patterns:
        suggestions.append(f"错题高发类型：{top_patterns[0]['pattern']}（共 {top_patterns[0]['count']} 次），可归类讲解共性步骤。")
    if avg_score is not None and avg_score < 70:
        suggestions.append("本批整体得分偏低，宜先回顾基础概念再推进变式训练。")
    elif avg_score is not None and avg_score >= 90:
        suggestions.append("整体掌握较好，可适当增加拓展变式与开放性思考题。")
    if not suggestions:
        suggestions.append("本批暂无明显薄弱集中项，可维持当前教学节奏并关注个别错题。")

    return {
        "subject": subject,
        "paper_count": len(items),
        "success_count": len(items),
        "avg_score_percent": avg_score,
        "status_distribution": dict(status_counter),
        "weak_knowledge_ranked": top_weak,
        "error_patterns": top_patterns,
        "knowledge_points": top_knowledge,
        "teaching_suggestions": suggestions,
        "papers": per_paper,
    }


def _rule_learning_report(stats: dict, *, group_name: str = "", grade_level: str = "") -> dict:
    paper_count = int(stats.get("paper_count") or 0)
    is_single = paper_count == 1
    scope = group_name or ("本份作业" if is_single else "本批作业")
    lines = [
        "## 学情分析报告",
        "",
        f"- **批改范围**：{scope}",
    ]
    if is_single:
        lines.append("- **类型**：单份作业")
    else:
        lines.append(f"- **份数**：{paper_count} 份")
    if grade_level:
        lines.append(f"- **年级/学段**：{grade_level}")
    if stats.get("avg_score_percent") is not None:
        lines.append(f"- **平均得分率**：{stats['avg_score_percent']}%")

    lines.extend(["", "### 整体情况"])
    dist = stats.get("status_distribution") or {}
    if dist:
        for k, v in dist.items():
            lines.append(f"- {k}：{v} 份")
    else:
        lines.append("- 已汇总各卷得分与错题信息。")

    lines.extend(["", "### 高频薄弱知识点"])
    weak = stats.get("weak_knowledge_ranked") or []
    if weak:
        for w in weak[:8]:
            lines.append(f"- **{w['tag']}**：出现 {w['count']} 次")
    else:
        lines.append("- 暂未标记明显薄弱知识点。")

    lines.extend(["", "### 错题模式"])
    patterns = stats.get("error_patterns") or []
    if patterns:
        for p in patterns[:8]:
            lines.append(f"- {p['pattern']}（{p['count']} 次）")
    else:
        lines.append("- 以正确题为主，错题模式不明显。" if is_single else "- 本批以正确题为主，错题模式不明显。")

    lines.extend(["", "### 教学建议"])
    for s in stats.get("teaching_suggestions") or []:
        lines.append(f"- {s}")

    return {
        "summary_md": "\n".join(lines),
        "error_patterns": patterns,
        "weak_knowledge_ranked": weak,
        "teaching_suggestions": stats.get("teaching_suggestions") or [],
    }


def _rule_knowledge_variants(stats: dict, *, subject: str, grade_level: str = "") -> dict:
    paper_count = int(stats.get("paper_count") or 0)
    is_single = paper_count == 1
    knowledge = list(stats.get("knowledge_points") or stats.get("weak_knowledge_ranked") or [])
    patterns = stats.get("error_patterns") or []
    if is_single and not knowledge and patterns:
        for p in patterns[:6]:
            pat = p.get("pattern") if isinstance(p, dict) else str(p)
            label = pat.split("·", 1)[-1].strip() if "·" in pat else pat
            if label:
                knowledge.append({"name": label[:48], "tag": label[:48], "count": p.get("count", 1) if isinstance(p, dict) else 1})

    summary = []
    for k in knowledge[:10]:
        name = k.get("name") or k.get("tag") or "综合"
        cnt = k.get("count", 0)
        summary.append(
            {
                "name": name,
                "frequency": cnt,
                "mastery_hint": "需巩固" if cnt >= 2 else ("本卷薄弱" if is_single else "偶发"),
                "typical_errors": [],
            }
        )

    variants = []
    seen: set[str] = set()
    limit = 4 if is_single else 6

    def _add_variant(name: str, variation_type: str, stem: str) -> None:
        key = name[:40]
        if key in seen or len(variants) >= (4 if is_single else 8):
            return
        seen.add(key)
        variants.append(
            {
                "knowledge_point": name,
                "difficulty": "中等",
                "variation_type": variation_type,
                "stem": stem,
                "answer_hint": "对照本卷错题订正要点完成。" if is_single else "对照本批错题中的正确步骤与订正要点完成。",
            }
        )

    for k in knowledge[:limit]:
        name = k.get("name") or k.get("tag") or ("本份知识点" if is_single else "本批知识点")
        _add_variant(
            name,
            "数值变式" if subject == "math" else "句型变式",
            f"请围绕「{name}」设计一题{'计算' if subject == 'math' else '表达'}练习（课堂可手写补充具体题干）。",
        )

    for p in patterns:
        if len(variants) >= (4 if is_single else 8):
            break
        pat = p.get("pattern") if isinstance(p, dict) else str(p)
        label = pat.split("·", 1)[-1].strip() if "·" in pat else pat
        if not label:
            continue
        cnt = p.get("count", 1) if isinstance(p, dict) else 1
        _add_variant(
            label[:48],
            "纠错变式" if subject == "math" else "表达变式",
            f"针对「{label}」类错题设计一题巩固练习（{'本卷' if is_single else '本批'}出现 {cnt} 次）。",
        )

    if is_single:
        intro = "基于本份作业的错题与薄弱点整理的变形题建议；可运行 AI 深度分析生成更具体题干。"
    else:
        intro = f"本批（{paper_count} 份）涉及知识点已按出现频次整理；变式题可在课堂由教师据学情微调难度。"
    if grade_level:
        intro = f"面向{grade_level}：" + intro

    return {
        "intro": intro,
        "knowledge_summary": summary,
        "variant_problems": variants,
    }


def _extract_json_object(text: str) -> dict | None:
    if not text:
        return None
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            return None
    return None


def _call_text_llm(system: str, user: str) -> str | None:
    if not get_dashscope_api_key():
        logging.warning("DASHSCOPE_API_KEY 未配置，跳过文本 LLM")
        return None
    configure_dashscope()
    try:
        resp = Generation.call(
            model=TEXT_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            result_format="message",
            temperature=0.3,
            max_tokens=4096,
        )
        if resp.status_code == HTTPStatus.OK:
            return resp.output.choices[0].message.content
        logging.error("Generation API %s: %s", resp.status_code, getattr(resp, "message", resp))
        return None
    except Exception as e:
        logging.error("Generation 调用异常: %s", e)
        return None


def _enrich_with_llm(
    subject: str,
    stats: dict,
    *,
    grade_level: str = "",
    teacher_note: str = "",
    group_name: str = "",
) -> tuple[dict, dict]:
    """在规则报告基础上用 LLM 润色学情报告并生成变式题 JSON。"""
    learning = _rule_learning_report(stats, group_name=group_name, grade_level=grade_level)
    variants = _rule_knowledge_variants(stats, subject=subject, grade_level=grade_level)

    payload = json.dumps(
        {
            "subject": subject,
            "grade_level": grade_level,
            "teacher_note": _clip(teacher_note, 400),
            "group_name": group_name,
            "stats": {
                "paper_count": stats.get("paper_count"),
                "avg_score_percent": stats.get("avg_score_percent"),
                "weak_knowledge_ranked": stats.get("weak_knowledge_ranked", [])[:10],
                "error_patterns": stats.get("error_patterns", [])[:10],
                "papers": stats.get("papers", [])[:12],
            },
        },
        ensure_ascii=False,
    )

    paper_count = int(stats.get("paper_count") or 0)
    is_single = paper_count == 1
    subj_cn = "数学" if subject == "math" else "英语作文"
    system = (
        f"你是{subj_cn}教研员，根据{'一份' if is_single else '一批'}已批改作业的聚合数据输出 JSON，不要输出 markdown 代码块外的说明。"
        "必须只返回一个 JSON 对象，包含 learning_report 与 knowledge_variants 两个字段。"
    )
    variant_req = (
        "变式题 2～4 道，紧扣本份作业错题与薄弱点，题干具体可练习，符合年级水平。"
        if is_single
        else "变式题 4～8 道，覆盖本批高频薄弱点，题干具体可练习，符合年级水平。"
    )
    user = f"""根据以下{'单份' if is_single else '批量'}批改聚合数据，生成学情分析与变式题建议。

数据：
{payload}

请返回 JSON，结构如下：
{{
  "learning_report": {{
    "summary_md": "Markdown 学情报告（含整体、薄弱点、错题模式、教学建议）",
    "error_patterns": [{{"pattern": "模式名", "count": 数字, "description": "说明"}}],
    "weak_knowledge_ranked": [{{"tag": "知识点", "count": 数字, "analysis": "简要分析"}}],
    "teaching_suggestions": ["建议1", "建议2"]
  }},
  "knowledge_variants": {{
    "intro": "一段话总结本批涉及的知识点",
    "knowledge_summary": [{{"name": "知识点", "frequency": 数字, "mastery_hint": "掌握情况", "typical_errors": ["典型错因"]}}],
    "variant_problems": [{{"knowledge_point": "知识点", "difficulty": "基础|中等|挑战", "variation_type": "变式类型", "stem": "题干", "answer_hint": "答案要点"}}]
  }}
}}

要求：
1. {variant_req}
2. 错题模式要归纳共性（如运算顺序、分数通分、时态一致等），不要只罗列文件名。
3. {"针对这一名学生/这一份作业给出可操作的巩固建议。" if is_single else "结合本批整体情况给出教学建议。"}
4. 使用中文。"""

    raw = _call_text_llm(system, user)
    if not raw:
        return learning, variants

    parsed = _extract_json_object(raw)
    if not isinstance(parsed, dict):
        return learning, variants

    lr = parsed.get("learning_report")
    if isinstance(lr, dict):
        if lr.get("summary_md"):
            learning["summary_md"] = lr["summary_md"]
        if lr.get("error_patterns"):
            learning["error_patterns"] = lr["error_patterns"]
        if lr.get("weak_knowledge_ranked"):
            learning["weak_knowledge_ranked"] = lr["weak_knowledge_ranked"]
        if lr.get("teaching_suggestions"):
            learning["teaching_suggestions"] = lr["teaching_suggestions"]

    kv = parsed.get("knowledge_variants")
    if isinstance(kv, dict):
        if kv.get("intro"):
            variants["intro"] = kv["intro"]
        if kv.get("knowledge_summary"):
            variants["knowledge_summary"] = kv["knowledge_summary"]
        if kv.get("variant_problems"):
            variants["variant_problems"] = kv["variant_problems"]

    return learning, variants


def generate_batch_insights(
    subject: str,
    items: list[dict],
    *,
    grade_level: str = "",
    teacher_note: str = "",
    group_name: str = "",
    use_llm: bool = True,
) -> dict[str, Any]:
    stats = aggregate_batch_items(subject, items)
    if use_llm and stats.get("paper_count", 0) > 0:
        learning, variants = _enrich_with_llm(
            subject,
            stats,
            grade_level=grade_level,
            teacher_note=teacher_note,
            group_name=group_name,
        )
    else:
        learning = _rule_learning_report(stats, group_name=group_name, grade_level=grade_level)
        variants = _rule_knowledge_variants(stats, subject=subject, grade_level=grade_level)

    return {
        "ok": True,
        "stats": stats,
        "learning_report": learning,
        "knowledge_variants": variants,
    }
