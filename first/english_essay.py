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
dashscope.api_key = os.getenv("DASHSCOPE_API_KEY", "sk-bd9f8ad136bc435e8414a14478a565f4")

ENG_FOLDER = "img_english"
OUTPUT_EXCEL = "希沃智教_英语作文深度批改报告.xlsx"
OUTPUT_REPORT = "学情分析报告.txt"

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

# ================= 2. 核心 Prompt =================
PROMPT_SYSTEM = """
你是一位拥有20年教龄的资深英语教研员，也是本次"希沃智教"比赛的阅卷专家。
你的任务是对图片中的手写英语作文进行深度批改。

【手写划改识别（极其重要，先于一切批改）】
1. 凡被横线、斜线、叉号、涂改液、橡皮擦淡影、杂乱涂抹明显划掉的单词或短语，一律视为作废，**不得**当作学生最终作答。
2. 若划掉词上方/行间另有清晰补写（如划掉 sports 后在上方写 after-class activity），以补写为准还原有效句子；无补写则直接删除被划内容。
3. 先在心里还原「有效全文」recognized_text（只含最终有效英文，不含划掉内容），再据此打分、写评语、列 errors；禁止把划掉内容写进 recognized_text 或 errors[].original。
4. errors 中 original 必须是学生**有效作答**的摘录（可含其真实拼写/语法错误），correction 是建议改写；**禁止**因学生已划掉某词仍按该词判错（如已划掉 sports 却写 original 含 sports）。
5. 划改笔画、涂改痕迹**不是**标点：不要把删除线误读成分号、句号等（如 best 后的涂改线不得写成 best.;）。
6. 句末仅有涂抹/划改、句子本身语法与用词已正确时，**不得**为该句生成 errors 条目（典型误报：「She is thirteen years old.」「She can swim well and run fast.」句末涂改但句意无误）。
7. **禁止无意义订正**：errors[].original 与 errors[].correction 必须有实质差异；若改后与有效作答相同或仅差涂改痕迹/标点，**不要**输出该条。禁止 original 与 correction 完全一致仍列入订正。
8. 示例：卷面「Among all ~~sports~~（上方补写 after-class activity）, I love basketball the best.」→ recognized_text 为「Among all after-class activity, I love basketball the best.」；若 best 用法不当，original 应摘录有效句而非含 sports 的旧句。

【题目与扣题（老师提供题目时极其重要）】
若用户消息中附有「作文题目」文字或题目图片，你必须先归纳题意与写作要求，再批改学生作文：
1. **Content (内容分)** 须对照题目：是否扣题、要点是否写全、有无偏题/跑题/只写无关内容。
2. 明显偏题或遗漏核心要点时，内容分应明显扣分，并在 personal_comment（简体中文）中说明偏题或漏点之处。
3. 扣题但语言有错时，仍可在 errors 中列语言问题，但不要因偏题而虚构学生没写的「正确要点」。

请严格遵守以下【核心评分标准】：
1. **多维度打分（过程分）**：不要只给一个总分。请分别给出：
   - Content (内容分): 是否涵盖所有要点？逻辑是否通顺？**是否扣题？**(满分6)
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

【errors 与 weak_points 分工（面向「订正」展示，极其重要）】
1. **errors** 是学生订正区的主内容：须列出 3～8 条（至少 1 条）真实错误或可优化点；每条必须含：
   - original：学生有效原句（完整一句或关键分句，来自 recognized_text）；
   - correction：建议改写句（**必须与 original 有实质差异**）；
   - reason：一两句说明错在哪或为何这样改；
   - tag：知识点标签。
2. **weak_points** 仅从 errors 的 tag 去重汇总，**禁止**只输出 weak_points 而不写 errors；**禁止**用标签代替逐句原/改。
3. 凡在评语或 weak_points 中提到的语法/用词/标点问题，都必须在 errors 中有对应 original+correction 条目。

【输出语言（面向中国师生，极其重要）】
1. **必须使用简体中文**：personal_comment（总评）、highlights 每一条、errors[].reason（订正说明）。
2. **必须保留英文**：recognized_text、errors[].original、errors[].correction（学生作文原句与改写句）。
3. **禁止**用英文写总评/亮点；禁止 "Dear student"、整段英文信格式；可在中文评语中引用英文原词或短语举例。
4. highlights 示例（中文）：「全文结构清晰，从课堂学习到课外活动层层递进。」勿写 "The essay has a clear structure..."。

请**仅**输出一个标准的 JSON 对象，不要包含任何 Markdown 标记或额外解释。格式如下：
{
    "student_id": "从文件名推断，或默认为Student A",
    "recognized_text": "按划改规则还原后的有效英文全文（不含任何被划掉内容）",
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
    "highlights": ["用简体中文写亮点1", "用简体中文写亮点2"],
    "weak_points": ["[词汇搭配]", "[时态-过去式]"],
    "personal_comment": "用简体中文写极具针对性的、有温度的总评，可引用作文中的英文词句举例..."
}
"""


def _strip_invalidated_english_text(text: str) -> str:
    """去掉模型可能带入的划改说明、作废片段，保留有效英文作答。"""
    if not text:
        return ""
    invalid_markers = (
        "划掉", "划去", "涂掉", "涂改", "擦掉", "作废", "错写", "废弃",
        "×掉", "叉掉", "删除", "删去", "抹掉", "被划", "划线", "划除",
        "擦除", "重写前", "修改前", "无效痕迹", "原写", "先写", "旧词",
    )
    keep_markers = ("最终", "最后", "改正", "改成", "保留", "未划掉", "有效")
    lines = []
    for raw_line in str(text).splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if "改为" in line or "改成" in line:
            parts = re.split(r"改为|改成", line, maxsplit=1)
            line = parts[-1].strip(" ：:，,。") or line
        if any(m in line for m in invalid_markers) and not any(m in line for m in keep_markers):
            continue
        line = re.sub(r"（?[^，。；;]*?(?:划掉|划去|涂掉|涂改|擦掉|作废|错写|废弃|被划|划除|修改前)[^，。；;]*?）?", "", line)
        line = re.sub(r"\[[^\]]*?(?:划掉|划去|涂改|作废|无效)[^\]]*?\]", "", line).strip()
        line = re.sub(r"~~([^~]+)~~", "", line)
        line = re.sub(r"\s{2,}", " ", line).strip()
        if line:
            lines.append(line)
    return "\n".join(lines).strip()


def _clean_english_sentence_fragment(text: str) -> str:
    """清理订正条目中误识别的涂改标点、划改说明。"""
    if not text:
        return ""
    t = _strip_invalidated_english_text(str(text))
    t = re.sub(r"[（(][^）)]*?(?:划掉|划去|涂改|作废|被划|上方补写|补写)[^）)]*?[）)]", "", t)
    t = re.sub(r"\s*;\s*$", "", t)
    t = re.sub(r"([.!?])\s*;\s*$", r"\1", t)
    t = re.sub(r"\s{2,}", " ", t).strip()
    return t


def _normalize_for_error_compare(text: str) -> str:
    """用于判断原句与改句是否实质相同（忽略大小写、首尾标点、多余空白）。"""
    t = _clean_english_sentence_fragment(text).lower()
    t = re.sub(r"[^\w\s'-]", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _errors_are_equivalent(original: str, correction: str) -> bool:
    """原/改无实质差异时不应展示订正（多为句末涂改误报）。"""
    o = _normalize_for_error_compare(original)
    c = _normalize_for_error_compare(correction)
    if not o and not c:
        return True
    return o == c


def _sync_weak_points_from_errors(data: dict) -> dict:
    """薄弱标签仅来自有效订正条目的 tag，避免订正区只剩标签无原/改句。"""
    errors = data.get("errors") or []
    tags = []
    for err in errors:
        if not isinstance(err, dict):
            continue
        tag = str(err.get("tag") or "").strip()
        if tag and tag not in tags:
            tags.append(tag)
    if tags:
        data["weak_points"] = tags
    return data


def _filter_meaningless_english_errors(errors: list) -> list:
    """去掉原句与改句相同、或改句为空的无效订正条目。"""
    kept = []
    for err in errors or []:
        if not isinstance(err, dict):
            continue
        orig = _clean_english_sentence_fragment(str(err.get("original") or ""))
        corr = _clean_english_sentence_fragment(str(err.get("correction") or ""))
        err["original"] = orig
        err["correction"] = corr
        if not corr.strip():
            logging.info("已过滤订正（改句为空）: %s", orig[:60])
            continue
        if _errors_are_equivalent(orig, corr):
            logging.info("已过滤无意义订正（原/改相同）: %s", orig[:60])
            continue
        kept.append(err)
    return kept


def _sanitize_english_essay_result(data: dict) -> dict:
    """后处理：确保订正 original 不含划改残留，并规范 recognized_text。"""
    if not isinstance(data, dict):
        return data
    rt = data.get("recognized_text")
    if isinstance(rt, str) and rt.strip():
        data["recognized_text"] = _strip_invalidated_english_text(rt)
    errors = data.get("errors") or []
    for err in errors:
        if not isinstance(err, dict):
            continue
        for key in ("original", "correction"):
            if key in err and err[key] is not None:
                err[key] = _clean_english_sentence_fragment(str(err[key]))
        if err.get("reason") is not None:
            err["reason"] = str(err["reason"]).strip()
    data["errors"] = _filter_meaningless_english_errors(
        [e for e in errors if isinstance(e, dict)]
    )
    data = _sync_weak_points_from_errors(data)
    if not data.get("errors") and data.get("weak_points"):
        logging.warning("模型返回了 weak_points 但无有效 errors，订正区将无法展示原/改句")
    comment = data.get("personal_comment")
    if isinstance(comment, str):
        data["personal_comment"] = comment.strip()
    hl = data.get("highlights")
    if isinstance(hl, list):
        data["highlights"] = [str(h).strip() for h in hl if str(h).strip()]
    return data


def _teacher_context_suffix_english(
    grade_level: str,
    teacher_note: str,
    essay_prompt: str = "",
    answer_key: str = "",
    scoring_rubric: str = "",
    *,
    has_answer_key_image: bool = False,
) -> str:
    g = (grade_level or "").strip()
    n = (teacher_note or "").strip()
    p = (essay_prompt or "").strip()
    ak = (answer_key or "").strip()
    rub = (scoring_rubric or "").strip()
    if not g and not n and not p and not ak and not rub and not has_answer_key_image:
        return ""
    parts = ["\n\n【任课教师补充说明（请纳入批改语境；若与作文内容明显无关仍以作文与图片为准）】"]
    if p:
        parts.append(
            f"【作文题目（文字，老师填写）】\n{p}\n"
            "请按本题要求判断学生是否扣题、要点是否齐全，并在内容分与总评中体现；明显偏题须明确指出。"
        )
    if has_answer_key_image:
        parts.append(
            "【参考答案 / 范文要点】已在前一张附图中给出，请对照要点判断内容是否覆盖、表述是否合理，"
            "并在内容分与总评中体现。"
        )
    elif ak:
        parts.append(
            "【参考答案 / 范文要点（老师提供，选填）】\n"
            f"{ak}\n"
            "请对照要点判断内容是否覆盖、表述是否合理，并在内容分与总评中体现；勿将参考答案照抄进评语。"
        )
    if rub:
        parts.append(f"【评分细则】\n{rub}\n请在各维度评分时尽量按细则把握。")
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


def _image_to_data_url(image_path: str) -> str:
    with open(image_path, "rb") as f:
        image_data = f.read()
    base64_data = base64.b64encode(image_data).decode("utf-8")
    mime_type = get_image_mime_type(image_path)
    return f"data:{mime_type};base64,{base64_data}"


def analyze_image(
    image_path,
    *,
    grade_level="",
    teacher_note="",
    essay_prompt="",
    essay_prompt_image="",
    answer_key="",
    answer_key_image="",
    scoring_rubric="",
):
    """调用大模型并返回结构化数据 - 修复版"""
    try:
        image_url = _image_to_data_url(image_path)
        extra = _teacher_context_suffix_english(
            grade_level,
            teacher_note,
            essay_prompt,
            answer_key,
            scoring_rubric,
            has_answer_key_image=bool((answer_key_image or "").strip() and os.path.isfile(answer_key_image)),
        )
        content = []
        prompt_img = (essay_prompt_image or "").strip()
        if prompt_img and os.path.isfile(prompt_img):
            content.append({"image": _image_to_data_url(prompt_img)})
            content.append({
                "text": "【上图】为本次考试的作文题目或写作要求。请先读懂题意与要点，再批改下一张图中的学生手写作文。"
            })
        ak_img = (answer_key_image or "").strip()
        if ak_img and os.path.isfile(ak_img):
            content.append({"image": _image_to_data_url(ak_img)})
            content.append({
                "text": "【上图】为教师提供的参考答案或范文要点，请先阅读再批改下一张学生作文。"
            })
        content.append({"image": image_url})
        content.append({"text": PROMPT_SYSTEM + extra})
        messages = [{"role": "user", "content": content}]

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
                return _sanitize_english_essay_result(json.loads(json_str))
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
def process_image(
    image_path: str,
    *,
    grade_level: str = "",
    teacher_note: str = "",
    essay_prompt: str = "",
    essay_prompt_image: str = "",
    answer_key: str = "",
    scoring_rubric: str = "",
) -> dict:
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

    data = analyze_image(
        image_path,
        grade_level=grade_level,
        teacher_note=teacher_note,
        essay_prompt=essay_prompt,
        essay_prompt_image=essay_prompt_image,
        answer_key=answer_key,
        scoring_rubric=scoring_rubric,
    )
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
        "recognized_text": data.get("recognized_text", ""),
        "ocr_note": "手写英文已识别（已忽略划改/涂改作废内容），并完成内容 / 语言 / 结构过程性评分。",
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