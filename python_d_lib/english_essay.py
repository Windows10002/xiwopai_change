import os
import re
import json
import logging
import pandas as pd
import base64
import textwrap
from pathlib import Path
from http import HTTPStatus
import dashscope
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill
from colorama import init, Fore, Style



# ================= 1. 基础配置 =================
init(autoreset=True)

# 请替换为你的有效 API Key，或设置环境变量 DASHSCOPE_API_KEY
dashscope.api_key = os.getenv("DASHSCOPE_API_KEY", "sk-5d1b92362694429f81c2eb03d6988e3e")

ENG_FOLDER = "img_english"
OUTPUT_EXCEL = "希沃智教_英语作文深度批改报告.xlsx"
OUTPUT_REPORT = "学情分析报告.txt"

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

# ================= 2. 核心 Prompt =================
PROMPT_SYSTEM = """
你是一位拥有20年教龄的资深英语教研员，也是本次"希沃智教"比赛的阅卷专家。
你的任务是对图片中的手写英语作文进行深度批改。

请严格遵守以下【核心评分标准】：
1. **多维度打分（过程分）**：不要只给一个总分。请分别给出：
   - Content (内容分): 是否涵盖所有要点？逻辑是否通顺？(满分6)
   - Language (语言分): 语法、拼写、词汇高级度。(满分6)
   - Structure (结构分): 开头结尾、连接词、分段。(满分3)
   - Total (总分): 三项之和 (满分15)。
2. **个性化评语（核心要求）**：
   - **禁止**使用"Good job"、"Keep working hard"等空洞模板。
   - **必须**结合学生作文的具体内容（例如："你在第二段关于环保的建议很有创意，但是..."）。
   - 语气要像真人老师：如果学生字写得乱，要委婉提醒；如果用了高级句型但错了，要鼓励并纠正。
3. **知识点诊断**：
   - 指出每一个错误时，必须打上【知识点标签】（如：[定语从句]、[时态-过去式]、[词汇搭配]、[主谓一致]）。
   - 总结该生的"薄弱知识图谱"。

请**仅**输出一个标准的 JSON 对象，不要包含任何 Markdown 标记或额外解释。格式如下：
{
    "student_id": "从文件名推断，或默认为Student A",
    "scores": {
        "content": 4,
        "language": 3,
        "structure": 2,
        "total": 9
    },
    "errors": [
        {
            "original": "...",
            "correction": "...",
            "reason": "...",
            "tag": "[语法-时态]"
        }
    ],
    "highlights": ["亮点1", "亮点2"],
    "weak_points": ["标签1", "标签2"],
    "personal_comment": "这里写极具针对性的、有温度的评语..."
}
"""


def _teacher_context_suffix_english(grade_level: str, teacher_note: str) -> str:
    g = (grade_level or "").strip()
    n = (teacher_note or "").strip()
    if not g and not n:
        return ""
    parts = ["\n\n【任课教师补充说明（请纳入批改语境；若与作文内容明显无关仍以作文与图片为准）】"]
    if g:
        parts.append(
            f"学生所在年级（老师填写）：{g}。请按该学段常见词汇与句法难度调整语言维度扣分尺度与评语用语，避免用明显超纲的学术写作标准苛求学生。"
        )
    if n:
        parts.append(
            f"老师备注 / 学情说明：{n}\n请结合以上内容辅助判断内容要点掌握、常见错误类型与努力方向，并在个性化评语与薄弱点中酌情呼应。"
        )
    return "\n".join(parts)


# ================= 3. 核心处理函数 =================

def get_image_mime_type(image_path):
    """根据文件扩展名返回正确的 MIME 类型"""
    ext = Path(image_path).suffix.lower()
    mime_types = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.bmp': 'image/bmp',
                  '.webp': 'image/webp'}
    return mime_types.get(ext, 'image/jpeg')


def analyze_image(image_path, *, grade_level="", teacher_note=""):
    """调用大模型并返回结构化数据 - 修复版"""
    try:
        with open(image_path, "rb") as f:
            image_data = f.read()
        base64_data = base64.b64encode(image_data).decode('utf-8')
        mime_type = get_image_mime_type(image_path)

        # 关键修复：添加 "data:" 前缀
        image_url = f"data:{mime_type};base64,{base64_data}"

        extra = _teacher_context_suffix_english(grade_level, teacher_note)
        messages = [{
            "role": "user",
            "content": [
                {"image": image_url},  # 使用完整的 data URL
                {"text": PROMPT_SYSTEM + extra}
            ]
        }]

        resp = dashscope.MultiModalConversation.call(
            model="qwen-vl-max",
            messages=messages,
            timeout=120
        )

        if resp.status_code == HTTPStatus.OK:
            content = resp.output.choices[0].message.content[0]["text"]
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                json_str = re.sub(r'^```json\s*', '', json_match.group())
                json_str = re.sub(r'\s*```$', '', json_str)
                return json.loads(json_str)
            else:
                logging.error(f"未检测到JSON格式，原始内容: {content[:200]}")
                return None
        else:
            logging.error(f"API 调用失败 - 状态码: {resp.status_code}, 错误: {resp.message}")
            return None
    except json.JSONDecodeError as e:
        logging.error(f"JSON 解析失败: {e}")
        return None
    except Exception as e:
        logging.error(f"处理文件 {image_path} 异常: {e}")
        import traceback
        traceback.print_exc()
        return None


def generate_class_analysis(results):
    """汇总全班数据，生成知识点薄弱分析"""
    all_tags = []
    for r in results:
        for err in r.get('errors', []):
            if isinstance(err, dict) and 'tag' in err:
                all_tags.append(err['tag'])

    tag_counts = pd.Series(all_tags).value_counts() if all_tags else pd.Series()
    avg_score = sum(r['scores']['total'] for r in results) / len(results)

    report_lines = [
        "========================================",
        " 希沃智教 - 班级英语学情分析报告",
        "========================================",
        f"📝 批改总数: {len(results)} 人",
        f"📈 平均分: {avg_score:.2f} / 15",
        "",
        "🔥 全班高频薄弱知识点 (Top 5):",
    ]

    if not tag_counts.empty:
        for tag, count in tag_counts.head(5).items():
            report_lines.append(f"   - {tag}: {count} 人次犯错")
    else:
        report_lines.append("   暂无数据")

    report_lines.append("\n💡 教学建议:")
    if not tag_counts.empty:
        report_lines.append(f"   建议针对【{tag_counts.index[0]}】进行专项突击训练。")
    else:
        report_lines.append("   继续保持当前教学节奏，基础掌握良好。")

    return "\n".join(report_lines)


def export_to_excel(results, class_report):
    """生成精美的 Excel 报告"""
    export_data = []
    for r in results:
        scores = r.get('scores', {})
        error_details = [f"{e['tag']}:{e['original']}->{e['correction']}" for e in r.get('errors', []) if
                         isinstance(e, dict)]

        export_data.append({
            "文件名": r.get('filename', ''),
            "总分": scores.get('total', 0),
            "内容分": scores.get('content', 0),
            "语言分": scores.get('language', 0),
            "结构分": scores.get('structure', 0),
            "薄弱知识点": ", ".join(r.get('weak_points', [])),
            "个性化评语": r.get('personal_comment', ""),
            "错误详情": "; ".join(error_details)
        })

    df_export = pd.DataFrame(export_data)

    with pd.ExcelWriter(OUTPUT_EXCEL, engine='openpyxl') as writer:
        df_export.to_excel(writer, index=False, sheet_name="批改详情")
        workbook = writer.book
        worksheet = writer.sheets["批改详情"]

        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="4F81BD", end_color="4F81BD", fill_type="solid")
        for cell in worksheet[1]:
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")

        worksheet.column_dimensions['A'].width = 20
        worksheet.column_dimensions['B'].width = 8
        worksheet.column_dimensions['G'].width = 60

    print(f"\n{Fore.GREEN}✅ Excel 报告已保存: {OUTPUT_EXCEL}")

    with open(OUTPUT_REPORT, "w", encoding="utf-8") as f:
        f.write(class_report)
    print(f"✅ 学情报告已保存: {OUTPUT_REPORT}")


# ================= 4. 主程序 =================
def main():
    folder = Path(ENG_FOLDER)
    if not folder.exists():
        print(f"{Fore.RED}❌ 未找到文件夹 {ENG_FOLDER}，请先放入图片。")
        return

    images = sorted(list(folder.glob("*.jpg")) + list(folder.glob("*.png")) + list(folder.glob("*.jpeg")))
    if not images:
        print(f"{Fore.RED}❌ 文件夹内无图片。")
        return

    print(f"{Fore.CYAN}🚀 启动希沃智教 AI 批改引擎...")
    print(f"📷 发现 {len(images)} 份待批改作业\n")

    results = []
    for img in images:
        print(f"{Fore.YELLOW}⏳ 正在批改: {img.name} ...")
        result = analyze_image(img)

        if result:
            result['filename'] = img.name
            results.append(result)

            # ================= 你要求的完整显示逻辑 =================
            scores = result.get('scores', {})
            print(f"\n{Fore.CYAN}{'=' * 70}")
            print(f" 文件: {img.name}")
            print(f"🏆 总分: {scores.get('total', 'N/A')}/15")
            print(f"   ├─ 内容分: {scores.get('content', 'N/A')}/6")
            print(f"   ├─ 语言分: {scores.get('language', 'N/A')}/6")
            print(f"   └─ 结构分: {scores.get('structure', 'N/A')}/3")

            print(f"\n💬 老师评语:")
            comment = result.get('personal_comment', 'N/A')
            for line in textwrap.wrap(comment, width=68):
                print(f"   {line}")

            print(f"\n⚠️  薄弱知识点:")
            for point in result.get('weak_points', []):
                print(f"   • {point}")

            print(f"\n✨ 亮点:")
            for highlight in result.get('highlights', []):
                print(f"   • {highlight}")

            print(f"{Fore.CYAN}{'=' * 70}{Style.RESET_ALL}\n")
            # ======================================================
        else:
            print(f"{Fore.RED}   ❌ 批改失败，请检查图片质量和 API 配置\n")

    if results:
        report = generate_class_analysis(results)
        print("\n" + report)
        export_to_excel(results, report)
    else:
        print(f"{Fore.RED}\n⚠️ 没有成功批改任何作业，请检查 API Key 或网络状态。")


# ===================== 给网页调用的接口 =====================
def process_image(image_path: str, *, grade_level: str = "", teacher_note: str = "") -> dict:
    """
    Flask / Web 统一入口：英语作文多维评分与诊断。
    """
    if not image_path:
        return {
            "error": True,
            "score": "—",
            "comments": "未收到图片路径",
            "weak_points": [],
            "scores": {},
            "errors": [],
            "highlights": [],
            "student_id": "",
            "details": [],
        }

    data = analyze_image(image_path, grade_level=grade_level, teacher_note=teacher_note)
    if not data:
        return {
            "error": True,
            "score": "—",
            "comments": "批改失败，请检查图片清晰度、网络或 API 配置后重试。",
            "weak_points": [],
            "scores": {},
            "errors": [],
            "highlights": [],
            "student_id": "",
            "details": [],
        }

    scores = data.get("scores") or {}
    total = scores.get("total")
    try:
        total_f = float(total)
        pct = round(total_f / 15.0 * 100)
    except (TypeError, ValueError):
        pct = 0

    return {
        "error": False,
        "score": f"{scores.get('total', '—')}/15",
        "score_pct": pct,
        "comments": data.get("personal_comment", ""),
        "weak_points": data.get("weak_points") or [],
        "scores": scores,
        "errors": data.get("errors") or [],
        "highlights": data.get("highlights") or [],
        "student_id": data.get("student_id", ""),
        "details": [],
        "ocr_note": "手写英文已由多模态模型识别，并完成内容 / 语言 / 结构过程性评分。",
    }


def english_predict(img_path):
    if not img_path:
        return "### ❌ 请上传图片"
    try:
        data = analyze_image(img_path)
        if not data:
            return "### ❌ 批改失败"

        s = data["scores"]
        md = f"# 📝 英语作文批改结果\n\n"
        md += f"### 总分：{s['total']}/15\n"
        md += f"- 内容分：{s['content']}/6\n"
        md += f"- 语言分：{s['language']}/6\n"
        md += f"- 结构分：{s['structure']}/3\n\n"

        md += f"### 💬 个性化评语\n\n{data['personal_comment']}\n\n"
        md += "### ✨ 作文亮点\n\n"
        for h in data.get("highlights", []):
            md += f"- {h}\n"
        md += "\n### ⚠️ 薄弱知识点\n\n"
        for w in data.get("weak_points", []):
            md += f"- {w}\n"
        md += "\n### ❌ 错误订正\n\n"
        for err in data.get("errors", []):
            md += f"**标签**：{err['tag']}\n"
            md += f"- 原句：{err['original']}\n"
            md += f"- 改正：{err['correction']}\n"
            md += f"- 原因：{err['reason']}\n\n---\n"
        return md
    except:
        return "### ❌ 批改异常"

def run(image_english):
    # 同样的，封装成函数并返回结果
    return {"score": 85, "essay_text": "..."}

if __name__ == "__main__":
    main()