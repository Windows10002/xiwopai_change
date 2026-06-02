import type { ErrorRegionPct, GradingResultDetail } from "@/types/grading";
import { buildScoringStrategyDetail } from "@/lib/scoringStrategyText";
import { apiFetch, parseApiJson } from "@/lib/apiClient";

type ApiGradePayload = {
  ok: boolean;
  message?: string;
  subject?: string;
  image_url?: string;
  result?: Record<string, unknown>;
};

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** 与后端 sanitize_reason_text 对齐：去掉「本地复核」等不宜给学生看的元信息 */
function sanitizeMathReasonForUi(raw: string): string {
  let t = raw.trim();
  if (!t) return "";
  t = t.replace(/[（(]?\s*订正提示[：:][^）)]*?[）)]/g, "");
  t = t.replace(/订正提示[：:][^。]*[。]?/g, "");
  t = t.replace(/末步结果与标准答案不一致[^。]*[。]?/g, "");
  t = t.replace(/已按规则计为错误[^。]*[。]?/g, "");
  t = t.replace(/保留部分过程分[^。]*[。]?/g, "");
  t = t.replace(/本地复核[^。！？\n；;]*[。！？\n；;]?/g, "");
  t = t.replace(/复核[:：][^。！？\n；;]*[。！？\n；;]?/g, "");
  t = t.replace(/说明[:：][^。！？\n；;]*[。！？\n；;]?/g, "");
  t = t.replace(/作为[^。！？；;]{0,40}(?:模型|AI)[^。！？；;]*[。！？；;]/g, "");
  t = t.replace(/(?:OCR|识别器|置信度)[^。！？；;]*[。！？；;]/g, "");
  if (t.includes("【错误原因】") || t.includes("【正确步骤】")) {
    t = t.replace(/[ \t\f\v]{2,}/g, " ");
    t = t.replace(/\n{3,}/g, "\n\n").trim();
  } else {
    t = t.replace(/\s+/g, " ").trim();
  }
  return t;
}

const BOILER_STRENGTH = /^第 \d+ 题：过程正确，每步成立，结果正确\.?$/;

/** 后端常见泛化亮点句（与亮点 Tab 展示模板区分） */
const GENERIC_STRENGTH_REASON =
  /过程(?:正确|完整)|每步成立|结果正确|书写规范|推导完整|运算顺序|符号处理/;

/** 由题干粗判年级段与难度（启发式，供亮点展示用） */
function inferMathQuestionDifficulty(exprRaw: string): { gradeText: string; difficulty: string } {
  const raw = String(exprRaw ?? "").trim();
  const s = raw.replace(/\s+/g, "").replace(/÷/g, "/").toLowerCase();
  if (!s || s === "本题") {
    return { gradeText: "小学段", difficulty: "中等" };
  }
  const parenCount = (s.match(/\(/g) || []).length;
  const mulDiv = (s.match(/[×*x/]/g) || []).length;
  const addSub = (s.match(/[+\-]/g) || []).length;
  const digitRuns = s.match(/\d+/g) ?? [];
  const maxDigits = digitRuns.length ? Math.max(...digitRuns.map((d) => d.length)) : 0;

  let score = 0;
  if (parenCount >= 1) score += 2;
  if (parenCount >= 2) score += 1;
  if (mulDiv >= 2) score += 2;
  if (mulDiv >= 1) score += 1;
  if (addSub >= 3) score += 1;
  if (maxDigits >= 3) score += 1;

  if (score <= 2) {
    return { gradeText: "约 1～2 年级", difficulty: "基础" };
  }
  if (score <= 4) {
    return { gradeText: "约 3～4 年级", difficulty: "中等" };
  }
  if (score <= 6) {
    return { gradeText: "约 5～6 年级", difficulty: "偏高" };
  }
  return { gradeText: "小高或衔接", difficulty: "挑战" };
}

function isGenericStrengthReason(t: string): boolean {
  const s = t.trim();
  if (s.length < 8) return true;
  return GENERIC_STRENGTH_REASON.test(s) && s.length < 100;
}

/** 是否允许进入「亮点」表扬（须满分档且结果分到位，排除未作答/过程对结果错） */
function mathQuestionEligibleForHighlight(q: Record<string, unknown>): boolean {
  const st = String(q.status ?? "").trim();
  if (st !== "正确") return false;
  const rs = Number(q.result_score);
  const total = Number(q.total_score);
  if (Number.isFinite(rs) && rs < 2) return false;
  if (Number.isFinite(total) && total < 9) return false;
  const reason = String(q.reason ?? "");
  if (/过程正确、结果错误|解题逻辑错误|未作答|未识别到有效/.test(reason)) return false;
  return true;
}

/** 数学「亮点」：突出过程表扬（不再附带年级推断长句） */
function buildMathStrengthLine(id: string, expr: string, reasonRaw: string): string {
  const reason = sanitizeMathReasonForUi(reasonRaw);
  const { difficulty } = inferMathQuestionDifficulty(String(expr ?? ""));
  const processPraise =
    reason && !isGenericStrengthReason(reason)
      ? `解题过程表现突出：${truncate(reason, 150)}`
      : "书写工整、关键步骤交代清楚，运算顺序与推导过程处理得很好，值得点名表扬。";
  return `第 ${id} 题：${processPraise}本题难度「${difficulty}」。`;
}

/** 将后端 reason 格式化为「订正」列表中一条（含四段标签时换行展示） */
function formatMathImprovementLine(id: string | number, status: string, reason: string): string {
  const head = `第 ${id} 题（${status}）`;
  if (reason.includes("【错误原因】")) {
    return `${head}\n${reason}`;
  }
  return `${head}：${reason}`;
}

function compactStrengths(strengths: string[]): string[] {
  if (strengths.length < 3) return strengths;
  const boiler = strengths.filter((s) => BOILER_STRENGTH.test(s.trim()));
  if (boiler.length < strengths.length - 1) return strengths;
  return ["本次多数题目推导完整、结果正确，具体表扬见总评；逐题得分见右侧列表。"];
}

/** 多题亮点文案完全一致时合并为一条，避免逐题重复 */
function dedupeIdenticalMathStrengths(strengths: string[]): string[] {
  if (strengths.length <= 1) return strengths;
  const bodyOf = (s: string) => s.replace(/^第\s*\d+\s*题[:：]\s*/, "").trim();
  const bodies = strengths.map(bodyOf);
  const first = bodies[0];
  if (first && bodies.every((b) => b === first)) {
    return [`以下 ${strengths.length} 题亮点相同，合并展示：${first}`];
  }
  return strengths;
}

/**
 * 数学判分以服务端 math_correct.normalize_question 为准（含题干纠错、等号链验算）。
 * 前端不再根据 expected_answer / student_answer 字符串二次改判，避免出现
 * 「评语写过程结果正确 + 订正提示末步不一致」的自相矛盾展示。
 */
function reconcileMathQuestions(questions: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return questions;
}

/** 总评补充：书写整洁、细心验算、薄弱点等维度（避免与已有总评重复堆砌） */
function augmentMathPersonalComment(
  comment: string,
  questions: Array<Record<string, unknown>>,
  weak: string[],
): string | undefined {
  const t = comment.trim();
  if (!t) return undefined;
  if (/书写|字迹|卷面|细心|验算|草稿|对齐|习惯/.test(t)) return t;
  const err = questions.filter((q) => String(q.status ?? "").trim() === "错误").length;
  const ok = Math.max(0, questions.length - err);
  const tail =
    (t.endsWith("。") || t.endsWith("！") || t.endsWith("？") ? "" : "。") +
    ` 卷面与习惯：可关注字迹工整、少涂改、按步骤对齐书写；订正时建议口述或笔算验算一遍，培养细心检查的习惯。` +
    (questions.length > 0 && err > 0 && ok > 0
      ? ` 本次共 ${questions.length} 题，其中 ${ok} 题整体思路正确，${err} 题仍有运算或格式上的问题，请结合右侧分项列表中的得分构成逐项对照。`
      : questions.length > 0 && err > 0
        ? ` 本次共 ${questions.length} 题，请结合右侧分项列表与「订正」对照错因并重做易错步骤。`
        : "") +
    (weak.length ? ` 薄弱点归纳：${weak.slice(0, 4).join("、")}。` : "");
  return (t + tail).slice(0, 480);
}

/** 分项列表「分数解析」：只展示得分构成，不写订正长文（订正在「订正」Tab） */
function buildMathDimensionScoreComposition(
  q: Record<string, unknown>,
  value: number,
  max: number,
  status: string,
): string {
  const ps = Number(q.process_score);
  const rs = Number(q.result_score);
  const ss = Number(q.structure_score);
  const ok = [ps, rs, ss].every((n) => Number.isFinite(n) && n >= 0);
  if (ok) {
    return `分数构成（满分 ${max}）：过程分 ${ps}/6，结果分 ${rs}/3，规范分 ${ss}/1；本题合计 ${value}/${max} 分。批改状态：${status}。`;
  }
  return `本题合计 ${value}/${max} 分。批改状态：${status}。`;
}

/** 数学：后端 math_correct.process_image 返回结构 → UI 展示模型 */
export function mapMathResult(raw: Record<string, unknown>): GradingResultDetail {
  const rawQuestions = (raw.questions as Array<Record<string, unknown>>) ?? [];
  const questions = reconcileMathQuestions(rawQuestions);

  const recomputedPct =
    questions.length > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              (questions.reduce((s, q) => s + Number(q.total_score ?? 0), 0) / questions.length) * 10,
            ),
          ),
        )
      : null;

  const avg =
    recomputedPct != null
      ? recomputedPct
      : typeof raw.score_pct === "number"
        ? raw.score_pct
        : typeof raw.process_score_avg === "number"
          ? raw.process_score_avg
          : Number.parseInt(String(raw.score ?? "0").replace(/%|\/10|\/100/g, ""), 10) || 0;
  const pct = Math.min(100, Math.max(0, Number.isFinite(avg) ? avg : 0));

  const dims =
    questions.length > 0
      ? questions.map((q, i) => {
          const st = String(q.status ?? "").trim();
          const rawScore = Number(q.total_score ?? Number.NaN);
          const pctStep = Number.isFinite(rawScore)
            ? rawScore * 10
            : st === "正确"
              ? 100
              : st === "过程不规范"
                ? 85
                : st === "未作答"
                  ? 0
                  : st === "错误"
                    ? 0
                    : 0;
          const value = Math.min(10, Math.max(0, Math.round(pctStep / 10)));
          const id = q.id ?? i + 1;
          const expr = truncate(String(q.expr ?? "本题"), 36);
          const composition = buildMathDimensionScoreComposition(q, value, 10, st || "—");
          return {
            key: `q-${id}-${i}`,
            label: `第 ${id} 题 · ${expr}`,
            value,
            max: 10,
            status: st || undefined,
            detail: composition,
          };
        })
      : [
          {
            key: "overall",
            label: "整体过程分（均值）",
            value: Math.round(pct / 10),
            max: 10,
          },
        ];

  const errorRegions: ErrorRegionPct[] = [];

  const strengths: string[] = [];
  const improvements: string[] = [];
  questions.forEach((q, i) => {
    let st = String(q.status ?? "").trim();
    const reasonRaw = String(q.reason ?? "").trim();
    const contradictory =
      /结果正确|最终结果正确/.test(reasonRaw) &&
      /订正提示|末步[^。]{0,24}标准答案[^。]{0,12}不一致|已按规则计为错误/.test(reasonRaw);
    const reason = sanitizeMathReasonForUi(reasonRaw);
    if (!reason) return;
    const idRaw = q.id;
    const id = idRaw != null && idRaw !== "" ? String(idRaw) : String(i + 1);
    const expr = String(q.expr ?? "");
    const claimsCorrect =
      /结果正确|最终结果正确/.test(reason) &&
      /平方根|立方根|绝对值|√|sqrt|正确计算|合并后得|合并后保留/.test(reason);
    if (st === "错误" && (claimsCorrect || contradictory)) {
      st = "正确";
    }
    if (mathQuestionEligibleForHighlight({ ...q, status: st })) {
      strengths.push(buildMathStrengthLine(id, expr || "本题", reasonRaw));
      return;
    }
    if (!reason) return;
    if (st === "错误" && claimsCorrect) {
      strengths.push(buildMathStrengthLine(id, expr || "本题", reason));
      return;
    }
    improvements.push(formatMathImprovementLine(id, st, reason));
  });

  const wp = (raw.weak_points as string[]) ?? [];

  const comment = String(raw.comments ?? raw.personal_comment ?? "").trim();
  const summaryText = augmentMathPersonalComment(comment, questions, wp);
  if (strengths.length === 0 && comment) strengths.push(comment);
  if (strengths.length === 0 && !comment) strengths.push("已完成批改，请查看分项与薄弱知识点。");

  if (improvements.length === 0 && wp.length) improvements.push(...wp.map((w) => `薄弱知识点：${w}`));
  if (improvements.length === 0 && questions.some((q) => String(q.status ?? "").trim() === "错误"))
    improvements.push("存在错题，请对照题目原因逐项订正。");

  const overall = String(raw.overall_result ?? "").trim();

  const finalStrengths = dedupeIdenticalMathStrengths(compactStrengths(strengths));

  return {
    scorePercent: pct,
    overallLabel: overall ? `数学作业 · ${overall}` : "数学作业 · 综合评分",
    dimensionSectionTitle: "分项得分（按题目）",
    dimensions: dims,
    errorRegions,
    summaryText,
    feedback: {
      strengths: finalStrengths.slice(0, 12),
      improvements: improvements.slice(0, 20),
    },
    weakKnowledgeTags: wp,
  };
}

/** 英语订正单条：原句 / 改句 / 说明（订正 Tab 展示，不用薄弱标签顶替） */
function formatEnglishImprovementLine(e: Record<string, unknown>): string {
  const tag = String(e.tag ?? "").trim();
  const orig = truncate(String(e.original ?? ""), 120);
  const fix = truncate(String(e.correction ?? ""), 120);
  const reason = truncate(String(e.reason ?? ""), 100);
  const parts: string[] = [];
  if (orig) parts.push(`原：${orig}`);
  if (fix) parts.push(`改：${fix}`);
  if (reason) parts.push(`说明：${reason}`);
  const tail = parts.join("；");
  if (!tail) return tag || "请查看错误订正条目";
  return tag ? `${tag} ${tail}` : tail;
}

/** 英语：后端 english_essay.process_image 返回结构 → UI 展示模型 */
export function mapEnglishResult(raw: Record<string, unknown>): GradingResultDetail {
  const scores = (raw.scores as Record<string, number>) ?? {};
  const pctRaw = raw.score_pct;
  const pct =
    typeof pctRaw === "number"
      ? pctRaw
      : Math.min(
          100,
          Math.max(
            0,
            Math.round((((scores.total ?? 0) as number) / 15) * 100),
          ),
        );

  const dimensions = [
    {
      key: "content",
      label: "内容",
      value: Number(scores.content ?? 0),
      max: 6,
      detail: `内容维度 ${Number(scores.content ?? 0)}/6（作文总分 15 分制中的一项）。`,
    },
    {
      key: "language",
      label: "语言",
      value: Number(scores.language ?? 0),
      max: 6,
      detail: `语言维度 ${Number(scores.language ?? 0)}/6（作文总分 15 分制中的一项）。`,
    },
    {
      key: "structure",
      label: "结构",
      value: Number(scores.structure ?? 0),
      max: 3,
      detail: `结构维度 ${Number(scores.structure ?? 0)}/3（作文总分 15 分制中的一项）。`,
    },
  ];

  const highlights = (raw.highlights as string[]) ?? [];
  const weak = (raw.weak_points as string[]) ?? [];
  const errors = (raw.errors as Array<Record<string, unknown>>) ?? [];

  const strengths = highlights.length > 0 ? [...highlights] : [];
  const comment = String(raw.comments ?? "").trim();
  const summaryText = comment || undefined;
  if (strengths.length === 0 && comment) strengths.push(comment);
  if (strengths.length === 0) strengths.push("已完成作文批改，详见分项得分与错误订正。");

  // 订正 Tab 只展示逐句原/改；薄弱标签在下方「薄弱知识点」区，勿用 weak_points 顶替
  const improvements =
    errors.length > 0
      ? errors.slice(0, 16).map((e) => formatEnglishImprovementLine(e))
      : [];

  const errorRegions: ErrorRegionPct[] = [];

  return {
    scorePercent: Math.min(100, Math.max(0, pct)),
    overallLabel: "英语作文 · 多维过程分",
    dimensionSectionTitle: "分项得分（内容 / 语言 / 结构）",
    dimensions,
    errorRegions,
    summaryText,
    feedback: {
      strengths: strengths.slice(0, 12),
      improvements: improvements.slice(0, 16),
    },
    weakKnowledgeTags: weak,
  };
}

export function mapApiResultToDetail(subject: "math" | "english", raw: Record<string, unknown>): GradingResultDetail {
  return subject === "math" ? mapMathResult(raw) : mapEnglishResult(raw);
}

/** 选图后老师可选填，经 FormData 传给 `/api/grade` 以辅助模型批改 */
export type GradeRequestContext = {
  gradeLevel?: string;
  teacherNote?: string;
  /** 英语：题干文字（选填） */
  essayPromptText?: string;
  /** 英语：题目照片（选填） */
  essayPromptFile?: File;
  /** 可选：取消长时间批改 */
  signal?: AbortSignal;
};

const GRADE_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * 调用 Flask `/api/grade`：multipart field `file` + `subject`。
 */
export async function submitGrade(
  file: File,
  subject: "math" | "english",
  ctx?: GradeRequestContext,
): Promise<{
  detail: GradingResultDetail;
  imageUrl: string;
}> {
  const body = new FormData();
  body.append("file", file);
  body.append("subject", subject);
  const gl = ctx?.gradeLevel?.trim();
  const tn = ctx?.teacherNote?.trim();
  const ep = ctx?.essayPromptText?.trim();
  if (gl) body.append("grade_level", gl);
  if (tn) body.append("teacher_note", tn);
  if (ep) body.append("essay_prompt", ep);
  if (ctx?.essayPromptFile) body.append("prompt_file", ctx.essayPromptFile);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), GRADE_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  ctx?.signal?.addEventListener("abort", onAbort);

  try {
    const res = await apiFetch("/api/grade", {
      method: "POST",
      body,
      signal: ctx?.signal ?? controller.signal,
    });

    const json = await parseApiJson<ApiGradePayload & { result?: Record<string, unknown> }>(res);
    const raw = json.result;
    if (!raw || typeof raw !== "object") {
      throw new Error("响应缺少批改结果");
    }

    const detail = mapApiResultToDetail(subject, raw as Record<string, unknown>);
    detail.scoringStrategyDetail = buildScoringStrategyDetail(subject, detail);
    const imageUrl = json.image_url || "";
    return { detail, imageUrl };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("批改已取消或超时，请重试。");
    }
    throw e;
  } finally {
    window.clearTimeout(timeout);
    ctx?.signal?.removeEventListener("abort", onAbort);
  }
}
