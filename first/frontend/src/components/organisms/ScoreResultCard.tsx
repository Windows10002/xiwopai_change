import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  Lightbulb,
  ListChecks,
  Sparkles,
  BarChart3,
  AlertTriangle,
  BookOpen,
  MessagesSquare,
} from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { buildScoringStrategyModel, type ScoringStrategyModel } from "@/lib/scoringStrategyText";
import { submitGradingFeedback, traceToFeedbackFields, type GradingFeedbackTrace } from "@/lib/gradingFeedbackApi";
import { submitGradingDispute } from "@/lib/gradingDisputeApi";
import { useAppSession } from "@/hooks/useAppSession";
import {
  IpMascotLoading,
  IpMascotMagnifierEmpty,
  IpMascotPeaceGreat,
  IpMascotScratchHead,
  IpMascotTrophy,
} from "@/components/atoms/IpMascot";
import { AppDialog, APP_DIALOG_PANEL, APP_DIALOG_PANEL_TITLE } from "@/components/molecules/AppDialog";
import { DimensionScoreBars } from "@/components/molecules/DimensionScoreBars";
import { ScoreResultHero } from "@/components/molecules/ScoreResultHero";
import { MathPrettyText } from "@/components/atoms/MathPrettyText";
import { exportGradingDocx, exportGradingXlsx, type ExportFilterOptions } from "@/lib/exportGrading";
import type { BatchInsightsResponse } from "@/lib/gradingBatchInsights";
import {
  buildInsightEntriesFromResult,
  resolveBatchInsightsForExport,
} from "@/lib/gradingBatchInsights";
import { exportFilterFromPreferences } from "@/lib/userPreferences";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useIsStudentUi } from "@/hooks/useIsStudentUi";
import { canManageGrading } from "@/lib/rolePermissions";
import { formatMathImprovementBlock } from "@/lib/gradingAnalysisDisplay";
import type { DimensionScore, GradingResultDetail } from "@/types/grading";

export type { DimensionScore } from "@/types/grading";

type ScoreResultCardProps = {
  subject: "math" | "english";
  result: GradingResultDetail | null;
  isGrading?: boolean;
  /** 面包屑学科名，用于导出文件名与标题 */
  subjectTitle: string;
  /** 导出文件名主体（不含扩展名） */
  exportBaseName: string;
  /** 当前卷追溯：服务端上传路径、本地历史 id、批次下标等，写入反馈 JSONL */
  gradingFeedbackTrace?: GradingFeedbackTrace;
  /** 教师修正单题得分后回写结果（仅教师逐题反馈） */
  onDimensionUpdate?: (dimensionKey: string, patch: Partial<DimensionScore>) => void;
  /** 可生成学情/变式题的批改条目（单张或文件夹） */
  batchInsightEntries?: Array<{ fileName: string; detail: GradingResultDetail }>;
  cachedBatchInsights?: BatchInsightsResponse | null;
  onOpenBatchInsights?: () => void;
};

type InsightTab = "summary" | "strengths" | "improve";

function DimensionScoresPanel({
  dimensions,
  sectionTitle,
  subject,
  improvements,
  onQuestionFeedback,
  compactWhenMany,
}: {
  dimensions: GradingResultDetail["dimensions"];
  sectionTitle: string;
  subject: "math" | "english";
  improvements: string[];
  onQuestionFeedback?: (d: DimensionScore) => void;
  /** 分项较多时默认收起（来自设置） */
  compactWhenMany?: boolean;
}) {
  const many = dimensions.length > 14;
  const [open, setOpen] = useState(() => !(compactWhenMany && dimensions.length > 14));

  useEffect(() => {
    setOpen(!(compactWhenMany && dimensions.length > 14));
  }, [dimensions, compactWhenMany]);

  return (
    <div className="glass-tint rounded-2xl p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-caption font-bold uppercase tracking-wide text-ink-muted">
          <span className="inline-flex rounded-xl border border-white/40 bg-white/40 p-1.5 text-primary shadow-sm ring-1 ring-white/25 backdrop-blur-sm">
            <ListChecks className="h-4 w-4" {...CUTE_ICON} aria-hidden />
          </span>
          <span className="truncate">{sectionTitle}</span>
          <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[0.65rem] font-semibold normal-case text-ink-muted">
            {dimensions.length} 项
          </span>
        </h3>
        {many ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded-full border border-white/45 bg-white/40 px-3 py-1 text-[0.65rem] font-bold text-[#51c527] shadow-sm backdrop-blur-sm transition hover:border-primary/30 hover:bg-white/55"
          >
            {open ? "收起列表" : `展开全部`}
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
          <DimensionScoreBars
            dimensions={dimensions}
            subject={subject}
            improvements={improvements}
            onQuestionFeedback={onQuestionFeedback}
          />
        </div>
      ) : (
        <p className="rounded-xl border border-white/35 bg-white/35 px-3 py-3 text-center text-caption leading-relaxed text-ink-muted backdrop-blur-sm">
          共 <strong className="text-ink">{dimensions.length}</strong> 条分项，点击「展开全部」查看逐题得分与状态标记。
        </p>
      )}
    </div>
  );
}

/**
 * 右侧评分卡片：综合分 + 分项 + 评语 + 薄弱知识点 + IP 情感化空状态 / 加载 / 结果顶栏。
 */
export function ScoreResultCard({
  subject,
  result,
  isGrading = false,
  subjectTitle,
  exportBaseName,
  gradingFeedbackTrace,
  onDimensionUpdate,
  batchInsightEntries = [],
  cachedBatchInsights = null,
  onOpenBatchInsights,
}: ScoreResultCardProps) {
  const prefs = useUserPreferences();
  const session = useAppSession();
  const canManage = canManageGrading(session);
  const isStudentUi = useIsStudentUi();
  const empty = result === null && !isGrading;
  const [insightTab, setInsightTab] = useState<InsightTab>(() => prefs.defaultInsightTab as InsightTab);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [scaleMaxInput, setScaleMaxInput] = useState("100");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormats, setExportFormats] = useState({ docx: true, xlsx: true });
  const [exportBusy, setExportBusy] = useState(false);
  const [exportOpts, setExportOpts] = useState<ExportFilterOptions>(() => exportFilterFromPreferences(prefs));
  const [feedbackUi, setFeedbackUi] = useState<null | { mode: "question"; dim: DimensionScore } | { mode: "whole_paper" }>(
    null,
  );
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackErr, setFeedbackErr] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [teacherEditValue, setTeacherEditValue] = useState("");

  /** 学情/导出用条目：优先父级传入；单张批改或无文件列表时用当前 result */
  const insightEntries = useMemo(() => {
    if (batchInsightEntries.length > 0) return batchInsightEntries;
    if (result) return buildInsightEntriesFromResult(result, exportBaseName);
    return [];
  }, [batchInsightEntries, result, exportBaseName]);
  const [teacherEditStatus, setTeacherEditStatus] = useState("正确");

  const strategyModel = useMemo((): ScoringStrategyModel | null => {
    if (!result) return null;
    return buildScoringStrategyModel(subject, result);
  }, [result, subject]);

  const summary = result?.summaryText?.trim() ?? "";
  const strengthItems = useMemo(() => {
    if (!result) return [];
    const raw = result.feedback.strengths;
    if (!summary) return raw;
    return raw.filter((t) => t.trim() !== summary.trim());
  }, [result, summary]);

  const hasHardIssues = useMemo(() => {
    if (!result) return false;
    if (result.feedback.improvements.length > 0) return true;
    return result.dimensions.some((d) => d.status === "错误" || d.status === "未作答");
  }, [result]);

  const safeExportName = useMemo(() => {
    const t = exportBaseName.trim().replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
    return t || "作业批改";
  }, [exportBaseName]);

  const scaleMaxParsed = useMemo(() => {
    const n = Number.parseFloat(scaleMaxInput.replace(/,/g, ".").trim());
    if (!Number.isFinite(n) || n <= 0) return 100;
    return Math.min(1000, Math.max(1, n));
  }, [scaleMaxInput]);

  const scaledScoreDisplay = useMemo(() => {
    if (!result) return null;
    if (Math.abs(scaleMaxParsed - 100) < 1e-6) return null;
    return (result.scorePercent / 100) * scaleMaxParsed;
  }, [result, scaleMaxParsed]);

  /** 弹窗内只读展示：与提交 payload 一致的追溯字段 */
  const feedbackTraceLines = useMemo(() => {
    const f = traceToFeedbackFields(gradingFeedbackTrace);
    const lines: string[] = [];
    if (f.image_ref) lines.push(`服务端截图 id（uploads 文件名）：${f.image_ref}`);
    if (f.history_entry_id) lines.push(`本地历史条目 id：${f.history_entry_id}`);
    if (f.local_file_name) lines.push(`原图文件名：${f.local_file_name}`);
    if (f.batch_total != null && f.batch_total > 1) {
      lines.push(`批次位置：第 ${(f.batch_index ?? 0) + 1} 张 / 共 ${f.batch_total} 张`);
    }
    return lines;
  }, [gradingFeedbackTrace]);

  const buildQuestionFeedbackPayload = (dim: DimensionScore, msg: string) => ({
    feedback_scope: "question" as const,
    subject,
    user_feedback: msg,
    client_ts: Date.now(),
    dimension_key: dim.key,
    dimension_label: dim.label,
    status: dim.status,
    value: dim.value,
    max: dim.max,
    detail_excerpt: (dim.detail ?? "").slice(0, 800),
    job_file_base: safeExportName,
    subject_title: subjectTitle,
    overall_label: result!.overallLabel,
    score_percent: result!.scorePercent,
    ...traceToFeedbackFields(gradingFeedbackTrace),
  });

  const handleTeacherSaveQuestionScore = () => {
    if (!result || !feedbackUi || feedbackUi.mode !== "question") return;
    const dim = feedbackUi.dim;
    const parsed = Number.parseFloat(teacherEditValue.replace(/,/g, ".").trim());
    if (!Number.isFinite(parsed)) {
      setFeedbackErr("请输入有效得分。");
      return;
    }
    const clamped = Math.min(dim.max, Math.max(0, Math.round(parsed * 10) / 10));
    onDimensionUpdate?.(dim.key, {
      value: clamped,
      status: subject === "math" ? teacherEditStatus : dim.status,
    });
    setFeedbackUi(null);
    setFeedbackText("");
    setFeedbackErr(null);
    setFeedbackToast("已更新本题得分。");
    window.setTimeout(() => setFeedbackToast(null), 4500);
  };

  const handleSubmitQuestionFeedback = async () => {
    const msg = feedbackText.trim();
    if (!result || !feedbackUi || feedbackUi.mode !== "question") return;
    if (canManage) {
      handleTeacherSaveQuestionScore();
      return;
    }
    if (msg.length < 8) {
      setFeedbackErr("请至少用 8 个字说明您认为错在哪里或应如何判。");
      return;
    }
    const dim = feedbackUi.dim;
    setFeedbackBusy(true);
    setFeedbackErr(null);
    try {
      await submitGradingDispute({
        ...buildQuestionFeedbackPayload(dim, msg),
        submitter_role: "student",
        student_grade: session?.studentGrade ?? null,
      });
      setFeedbackUi(null);
      setFeedbackText("");
      setFeedbackToast("已提交给任课教师，请等待审核；可在「设置」中查看进度。");
      window.setTimeout(() => setFeedbackToast(null), 5000);
    } catch (e) {
      setFeedbackErr(e instanceof Error ? e.message : "提交失败，请稍后重试。");
    } finally {
      setFeedbackBusy(false);
    }
  };

  const handleSubmitWholePaperFeedback = async () => {
    const msg = feedbackText.trim();
    if (!result || !feedbackUi || feedbackUi.mode !== "whole_paper") return;
    if (msg.length < 8) {
      setFeedbackErr("请至少用 8 个字说明整卷问题或改进建议。");
      return;
    }
    setFeedbackBusy(true);
    setFeedbackErr(null);
    try {
      if (canManage) {
        await submitGradingFeedback({
          feedback_scope: "whole_paper",
          subject,
          user_feedback: msg,
          client_ts: Date.now(),
          job_file_base: safeExportName,
          subject_title: subjectTitle,
          overall_label: result.overallLabel,
          score_percent: result.scorePercent,
          ...traceToFeedbackFields(gradingFeedbackTrace),
        });
        setFeedbackToast("感谢您的整卷反馈，已记录。");
      } else {
        await submitGradingDispute({
          feedback_scope: "whole_paper",
          subject,
          user_feedback: msg,
          client_ts: Date.now(),
          job_file_base: safeExportName,
          subject_title: subjectTitle,
          overall_label: result.overallLabel,
          score_percent: result.scorePercent,
          submitter_role: "student",
          student_grade: session?.studentGrade ?? null,
          ...traceToFeedbackFields(gradingFeedbackTrace),
        });
        setFeedbackToast("整卷申诉已提交给任课教师，请等待审核。");
      }
      setFeedbackUi(null);
      setFeedbackText("");
      window.setTimeout(() => setFeedbackToast(null), 5000);
    } catch (e) {
      setFeedbackErr(e instanceof Error ? e.message : "提交失败，请稍后重试。");
    } finally {
      setFeedbackBusy(false);
    }
  };

  useEffect(() => {
    setExportOpts(exportFilterFromPreferences(prefs));
  }, [
    prefs.exportDimensions,
    prefs.exportIncludeSummary,
    prefs.exportIncludeStrengths,
    prefs.exportIncludeImprovements,
    prefs.exportIncludeWeakTags,
  ]);

  useEffect(() => {
    if (result) {
      setInsightTab(prefs.defaultInsightTab as InsightTab);
      setScaleMaxInput("100");
    }
  }, [result, prefs.defaultInsightTab]);

  useEffect(() => {
    if (!result) setStrategyOpen(false);
  }, [result]);

  useEffect(() => {
    if (!result) {
      setFeedbackUi(null);
      setFeedbackText("");
      setFeedbackErr(null);
    }
  }, [result]);

  const tabBtn = (id: InsightTab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setInsightTab(id)}
      className={[
        "min-h-9 flex-1 rounded-lg px-2 py-2 text-[0.7rem] font-bold transition sm:px-3 sm:text-caption",
        insightTab === id ? "bg-white/55 text-[#51c527] shadow-sm ring-1 ring-white/40 backdrop-blur-sm" : "text-ink-muted hover:text-ink",
      ].join(" ")}
    >
      {label}
    </button>
  );

  return (
    <section
      className={`glass-panel relative flex min-h-[320px] flex-1 flex-col rounded-card md:min-h-0 md:h-full ${isStudentUi ? "animate-bounce-in stagger-2" : ""}`}
    >
      <header className="flex shrink-0 flex-col gap-3 border-b border-white/30 px-5 py-4 md:px-6">
        <div>
          <h2 className="text-small font-bold text-ink">批改结果</h2>
          <p className="mt-0.5 text-caption text-ink-muted">图像识别 · 过程性评分</p>
        </div>
        {result && !isGrading ? (
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {onOpenBatchInsights ? (
              <button
                type="button"
                onClick={onOpenBatchInsights}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/45 bg-white/40 px-3 py-1.5 text-[0.65rem] font-bold text-[#006D41] shadow-sm backdrop-blur-sm transition hover:border-primary/30 hover:bg-white/55 sm:text-caption"
                title={
                  cachedBatchInsights
                    ? "已生成学情，可导出到 Word/Excel"
                    : insightEntries.length > 1
                      ? "汇总本批错题模式、薄弱点并生成变形题"
                      : "分析本份作业错题与薄弱点，并生成变形题"
                }
              >
                <BarChart3 className="h-4 w-4 shrink-0" {...CUTE_ICON} aria-hidden />
                学情分析与变式题
              </button>
            ) : null}
            {prefs.showQuestionFeedback ? (
              <button
                type="button"
                onClick={() => {
                  setFeedbackUi({ mode: "whole_paper" });
                  setFeedbackText("");
                  setFeedbackErr(null);
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/45 bg-white/40 px-3 py-1.5 text-[0.65rem] font-bold text-amber-950 shadow-sm backdrop-blur-sm transition hover:border-amber-300 hover:bg-amber-50/40 sm:text-caption"
                title="对整卷批改总体意见、多题系统性误判等，一条说明即可（会附带当前卷截图 id）"
              >
                <MessagesSquare className="h-4 w-4 shrink-0" {...CUTE_ICON} aria-hidden />
                整卷反馈
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setExportOpts(exportFilterFromPreferences(prefs));
                setExportFormats({ docx: true, xlsx: true });
                setExportOpen(true);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/50 bg-white/55 px-3 py-1.5 text-[0.65rem] font-bold text-ink shadow-sm backdrop-blur-sm transition hover:border-primary/35 hover:bg-white/70 hover:text-[#006D41] sm:text-caption"
            >
              <Download className="h-4 w-4 shrink-0" {...CUTE_ICON} aria-hidden />
              导出 Word / Excel
            </button>
          </div>
        ) : null}
      </header>

      <div
        className={[
          "flex min-h-0 flex-1 flex-col px-5 py-6 md:px-6",
          isGrading ? "min-h-[min(52vh,26rem)] md:min-h-0" : "",
        ].join(" ")}
      >
        {isGrading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <IpMascotLoading />
            <div className="max-w-xs shrink-0">
              <p className="text-body font-bold text-ink">正在批改...</p>
              <p className="mt-2 text-small leading-relaxed text-ink-muted">
                π 正在眨眼看你写的每一笔，结合分项维度生成评语与薄弱知识点
              </p>
            </div>
          </div>
        ) : empty ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-tile border border-dashed border-white/40 bg-white/25 px-4 py-10 text-center backdrop-blur-sm">
            <IpMascotMagnifierEmpty />
            <p className="mt-4 text-small font-semibold text-gray-700">还没有批改结果哦</p>
            <p className="mt-1 max-w-xs text-caption leading-relaxed text-ink-subtle">
              上传作业并点击「开始批改」后，我会拿着放大镜帮你总结得分与建议～
            </p>
          </div>
        ) : (
          <div
            key={result ? `result-${result.scorePercent}-${result.overallLabel}` : "pending"}
            className="animate-score-reveal flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto"
          >
            {hasHardIssues ? (
              <div className="flex items-center gap-4 rounded-tile glass-tint-warm px-4 py-3">
                <IpMascotScratchHead />
                <p className="text-left text-small font-semibold leading-snug text-amber-950">
                  没关系，我们一起看看哪里还可以加强～
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-4 rounded-tile glass-tint px-4 py-3">
                <IpMascotTrophy />
                <p className="text-left text-small font-semibold leading-snug text-[#006D41]">
                  太棒了！这次做得很好！
                </p>
              </div>
            )}

            <ScoreResultHero
              scorePercent={result!.scorePercent}
              onOpenScoringStrategy={() => setStrategyOpen(true)}
              scaledScoreDisplay={scaledScoreDisplay}
              scaleMax={scaleMaxParsed}
              scaleMaxInput={scaleMaxInput}
              onScaleMaxInputChange={setScaleMaxInput}
            />

            {feedbackToast ? (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl border border-primary/20 bg-white/35 px-3 py-2.5 text-caption font-semibold text-[#51c527] shadow-sm backdrop-blur-sm"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" {...CUTE_ICON} aria-hidden />
                {feedbackToast}
              </div>
            ) : null}

            <DimensionScoresPanel
              dimensions={result!.dimensions}
              sectionTitle={result!.dimensionSectionTitle}
              subject={subject}
              improvements={result!.feedback.improvements}
              compactWhenMany={prefs.compactDimensionList}
              onQuestionFeedback={
                prefs.showQuestionFeedback
                  ? (d) => {
                      setFeedbackUi({ mode: "question", dim: d });
                      setFeedbackText("");
                      setFeedbackErr(null);
                      setTeacherEditValue(String(d.value));
                      setTeacherEditStatus(d.status ?? "正确");
                    }
                  : undefined
              }
            />

            <div className="glass-tint rounded-[1.35rem] p-3 sm:p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex rounded-xl border border-white/40 bg-white/40 p-1.5 text-primary shadow-sm ring-1 ring-white/25 backdrop-blur-sm">
                  <Sparkles className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                </span>
                <h3 className="text-small font-extrabold text-ink">总评与详情</h3>
              </div>

              <div className="flex rounded-xl border border-white/30 bg-white/25 p-1 backdrop-blur-sm">{tabBtn("summary", "总评")}{tabBtn("strengths", "亮点")}{tabBtn("improve", "订正")}</div>

              <div className="mt-3 min-h-[8rem] rounded-xl border border-white/35 bg-white/35 p-3 shadow-sm backdrop-blur-sm sm:p-4">
                {insightTab === "summary" ? (
                  summary ? (
                    <div className="max-h-56 overflow-y-auto text-small leading-relaxed text-ink [text-wrap:pretty]">
                      <MathPrettyText text={summary} />
                    </div>
                  ) : (
                    <p className="text-caption text-ink-muted">本次未单独生成总评段落，请查看「亮点」与「订正」或左侧题目得分。</p>
                  )
                ) : null}
                {insightTab === "strengths" ? (
                  <ul className="max-h-56 space-y-2 overflow-y-auto">
                    {strengthItems.length ? (
                      strengthItems.map((t, index) => (
                        <li
                          key={`${index}-${t}`}
                          className="flex gap-2 rounded-xl border border-primary/15 bg-white/30 px-3 py-2 text-small leading-relaxed text-slate-700 backdrop-blur-sm"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#006D41]" {...CUTE_ICON} aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="font-bold text-[#006D41]">{index + 1}.</span>{" "}
                            <span className="whitespace-pre-wrap [text-wrap:pretty]">
                              <MathPrettyText text={t} />
                            </span>
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="text-caption text-ink-muted">暂无单独列出的要点。</li>
                    )}
                  </ul>
                ) : null}
                {insightTab === "improve" ? (
                  <ul className="max-h-56 space-y-2 overflow-y-auto">
                    {result!.feedback.improvements.length === 0 ? (
                      <li className="text-caption text-ink-muted">暂无订正建议。</li>
                    ) : (
                      result!.feedback.improvements.map((t, index) => (
                        <li
                          key={`${index}-${t}`}
                          className="flex gap-2 rounded-xl border border-amber-200/40 bg-amber-50/30 px-3 py-2 text-small leading-relaxed text-slate-700 backdrop-blur-sm"
                        >
                          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" {...CUTE_ICON} aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="font-bold text-amber-800">{index + 1}.</span>{" "}
                            <span className="whitespace-pre-wrap [text-wrap:pretty]">
                              <MathPrettyText text={subject === "math" ? formatMathImprovementBlock(t) : t} />
                            </span>
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-caption font-bold uppercase tracking-wide text-ink-muted">薄弱知识点</h3>
              {result!.weakKnowledgeTags.length === 0 ? (
                <div className="flex flex-col items-center rounded-tile border border-dashed border-primary/25 bg-[#f4fcf0]/30 px-4 py-8 text-center backdrop-blur-sm">
                  <IpMascotPeaceGreat />
                  <p className="mt-3 text-small font-semibold text-[#006D41]">太棒了！没有薄弱知识点</p>
                  <p className="mt-1 max-w-xs text-caption text-ink-muted">本次作答暂未标记明显薄弱项，继续保持～</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {result!.weakKnowledgeTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-primary/25 bg-[#f4fcf0]/35 px-3 py-1.5 text-caption font-semibold text-[#006D41] backdrop-blur-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {exportOpen && result ? (
        <AppDialog
          open
          onClose={() => setExportOpen(false)}
          title="导出批改结果"
          subtitle="可多选 Word / Excel 格式，并勾选要写入文件的附加内容"
          titleId="export-dialog-title"
          backdropLabel="关闭导出"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-black/[0.1] bg-white px-4 text-small font-bold text-ink-muted transition hover:bg-black/[0.04]"
                onClick={() => setExportOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                disabled={exportBusy || (!exportFormats.docx && !exportFormats.xlsx)}
                className="btn-brand-primary min-h-10 px-6 text-small disabled:opacity-60"
                onClick={async () => {
                  if (!exportFormats.docx && !exportFormats.xlsx) {
                    window.alert("请至少选择一种导出格式。");
                    return;
                  }
                  setExportBusy(true);
                  try {
                    const insights = resolveBatchInsightsForExport(
                      subject,
                      insightEntries,
                      cachedBatchInsights,
                      exportOpts.includeLearningReport,
                      exportOpts.includeVariants,
                    );
                    if (exportFormats.docx) {
                      await exportGradingDocx(result, subjectTitle, safeExportName, exportOpts, insights);
                    }
                    if (exportFormats.xlsx) {
                      await exportGradingXlsx(result, subjectTitle, safeExportName, exportOpts, insights);
                    }
                    setExportOpen(false);
                  } catch (e) {
                    console.error(e);
                    window.alert("导出失败，请确认已安装依赖：npm install");
                  } finally {
                    setExportBusy(false);
                  }
                }}
              >
                {exportBusy ? "导出中…" : "开始导出"}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className={APP_DIALOG_PANEL}>
              <p className={APP_DIALOG_PANEL_TITLE}>导出格式（可多选）</p>
              <div className="mt-3 space-y-2">
                {(
                  [
                    ["docx", "Word 文档 (.docx)"],
                    ["xlsx", "Excel 表格 (.xlsx)"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className={[
                      "flex min-h-10 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-small font-semibold transition",
                      exportFormats[key]
                        ? "border-primary/35 bg-primary-tint/80 text-[#006D41] ring-1 ring-primary/20"
                        : "border-black/[0.1] bg-white text-ink-muted hover:border-primary/25",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-black/[0.2] text-[#51c527] focus:ring-brand"
                      checked={exportFormats[key]}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setExportFormats((prev) => {
                          const next = { ...prev, [key]: checked };
                          if (!next.docx && !next.xlsx) return prev;
                          return next;
                        });
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className={APP_DIALOG_PANEL}>
              <p className={APP_DIALOG_PANEL_TITLE}>分项列表</p>
              <select
                className="mt-2 w-full rounded-lg border border-black/[0.1] bg-white px-3 py-2 text-small font-semibold text-ink outline-none ring-primary/20 focus:ring-2"
                value={exportOpts.dimensions}
                onChange={(e) =>
                  setExportOpts((o) => ({
                    ...o,
                    dimensions: e.target.value as ExportFilterOptions["dimensions"],
                  }))
                }
              >
                <option value="all">全部题目</option>
                <option value="errors">仅错题（错误 / 未作答）</option>
                <option value="correct">仅正确与过程不规范</option>
              </select>
            </div>
            <div className={APP_DIALOG_PANEL}>
              <p className={APP_DIALOG_PANEL_TITLE}>附加内容</p>
              <div className="mt-3 space-y-2">
                {(
                  [
                    ["includeSummary", "总评段落"],
                    ["includeStrengths", "亮点与要点"],
                    ["includeImprovements", "订正与加强建议"],
                    ["includeWeakTags", "薄弱知识点"],
                    ["includeLearningReport", insightEntries.length > 1 ? "学情分析报告（本批）" : "学情分析报告（本份）"],
                    ["includeVariants", "知识点与变形题"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 text-small text-ink">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-black/[0.2] text-[#51c527] focus:ring-brand"
                      checked={exportOpts[key]}
                      onChange={(e) => setExportOpts((o) => ({ ...o, [key]: e.target.checked }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </AppDialog>
      ) : null}

      {strategyOpen && strategyModel ? (
        <AppDialog
          open
          onClose={() => setStrategyOpen(false)}
          title="给分策略详情"
          subtitle={strategyModel.headline}
          titleId="scoring-strategy-title"
          describedById="scoring-strategy-body"
          size="lg"
          backdropLabel="关闭给分策略"
        >
          <div id="scoring-strategy-body" className="space-y-4">
              {strategyModel.subject === "math" ? (
                <>
                  <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary-tint/70 via-white to-emerald-50/90 p-4 shadow-inner ring-1 ring-primary/10 sm:p-5">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-caption font-bold uppercase tracking-wide text-ink-muted">加权得分率</p>
                        <p className="mt-1 max-w-[14rem] text-[0.7rem] leading-snug text-ink-muted sm:max-w-none">
                          各题按过程分/结果分/规范分折算为 0–10 再换算为百分率，与首页「得分率」一致；不等于「正确题数÷总题数」。
                        </p>
                      </div>
                      <p className="text-4xl font-black tabular-nums leading-none text-ink-navActive sm:text-[2.75rem]">
                        {strategyModel.stats.pct}
                        <span className="text-2xl font-extrabold text-teal-700/90">%</span>
                      </p>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/[0.07]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#51c527] via-primary to-[#9ee070] shadow-[0_0_12px_rgba(81,197,39,0.22)] transition-[width] duration-500 ease-out"
                        style={{ width: `${Math.min(100, Math.max(0, strategyModel.stats.pct))}%` }}
                      />
                    </div>
                    {strategyModel.stats.statusCorrectSharePct != null ? (
                      <p className="mt-3 rounded-xl border border-white/40 bg-white/35 px-3 py-2.5 text-center text-[0.7rem] leading-relaxed text-ink-muted backdrop-blur-sm">
                        「正确」判定条数占比{" "}
                        <strong className="tabular-nums text-ink">{strategyModel.stats.statusCorrectSharePct}%</strong>（
                        {strategyModel.stats.ok}/{strategyModel.stats.total}），仅按状态计数；错题、过程不规范题仍可有部分分，故通常
                        <strong className="text-ink">与加权得分率不同</strong>。
                      </p>
                    ) : null}
                    <p className="mt-3 text-center text-caption text-ink-muted">
                      分项共 <strong className="text-ink">{strategyModel.stats.total}</strong> 条
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                      <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 px-2 py-3 text-center shadow-sm backdrop-blur-sm">
                        <p className="text-2xl font-black tabular-nums text-emerald-700">{strategyModel.stats.ok}</p>
                        <p className="mt-1 text-[0.65rem] font-bold leading-tight text-emerald-800/90">正确</p>
                      </div>
                      <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 px-2 py-3 text-center shadow-sm backdrop-blur-sm">
                        <p className="text-2xl font-black tabular-nums text-amber-800">{strategyModel.stats.half}</p>
                        <p className="mt-1 text-[0.65rem] font-bold leading-tight text-amber-900/85">过程不规范</p>
                      </div>
                      <div className="rounded-xl border border-red-200/60 bg-red-50/40 px-2 py-3 text-center shadow-sm backdrop-blur-sm">
                        <p className="text-2xl font-black tabular-nums text-red-700">{strategyModel.stats.bad}</p>
                        <p className="mt-1 text-[0.65rem] font-bold leading-tight text-red-800/90">错误 / 未作答</p>
                      </div>
                    </div>
                  </div>

                  <ul className="mt-5 space-y-3">
                    {(
                      [
                        { sec: strategyModel.sections[0], Icon: Sparkles, tone: "from-white via-primary-tint/50 to-[#eaf6e4]/40" },
                        { sec: strategyModel.sections[1], Icon: BarChart3, tone: "from-white via-primary-tint/50 to-[#eaf6e4]/40" },
                        { sec: strategyModel.sections[2], Icon: AlertTriangle, tone: "from-white via-primary-tint/50 to-[#eaf6e4]/40" },
                      ] as const
                    ).map(({ sec, Icon, tone }, idx) => (
                      <li
                        key={sec.key}
                        className={`rounded-2xl border border-primary/12 bg-gradient-to-br ${tone} p-4 shadow-sm ring-1 ring-primary/8 sm:p-4`}
                      >
                        <div className="flex gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/50 text-primary shadow-sm ring-1 ring-white/40 backdrop-blur-sm">
                            <Icon className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-2">
                              <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md bg-black/[0.06] px-1.5 text-[0.65rem] font-black text-ink-muted">
                                {idx + 1}
                              </span>
                              <h4 className="text-small font-extrabold text-ink">{sec.title}</h4>
                            </div>
                            <ul className="mt-3 space-y-2.5">
                              {sec.bullets.map((line, bi) => (
                                <li key={`${sec.key}-b-${bi}`} className="flex gap-2.5 text-caption leading-relaxed text-ink-muted">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden />
                                  <span className="min-w-0 text-ink/90 [text-wrap:pretty]">{line}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-sky-50/80 via-white to-primary-tint/50 p-4 shadow-inner ring-1 ring-primary/10 sm:p-5">
                    <p className="text-caption font-bold text-ink-muted">综合得分率</p>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <p className="text-4xl font-black tabular-nums text-ink-navActive">{strategyModel.pct}%</p>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/[0.07]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 via-primary to-emerald-400"
                        style={{ width: `${Math.min(100, Math.max(0, strategyModel.pct))}%` }}
                      />
                    </div>
                  </div>
                  <ul className="mt-5 space-y-3">
                    {(
                      [
                        { sec: strategyModel.sections[0], Icon: BookOpen, tone: "from-white via-primary-tint/50 to-[#eaf6e4]/40" },
                        { sec: strategyModel.sections[1], Icon: ListChecks, tone: "from-white via-primary-tint/50 to-[#eaf6e4]/40" },
                      ] as const
                    ).map(({ sec, Icon, tone }, idx) => (
                      <li
                        key={sec.key}
                        className={`rounded-2xl border border-primary/12 bg-gradient-to-br ${tone} p-4 shadow-sm ring-1 ring-primary/8 sm:p-4`}
                      >
                        <div className="flex gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/50 text-primary shadow-sm ring-1 ring-white/40 backdrop-blur-sm">
                            <Icon className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-2">
                              <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md bg-black/[0.06] px-1.5 text-[0.65rem] font-black text-ink-muted">
                                {idx + 1}
                              </span>
                              <h4 className="text-small font-extrabold text-ink">{sec.title}</h4>
                            </div>
                            <ul className="mt-3 space-y-2.5">
                              {sec.bullets.map((line, bi) => (
                                <li key={`${sec.key}-b-${bi}`} className="flex gap-2.5 text-caption leading-relaxed">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden />
                                  <span className="min-w-0 text-ink/90 [text-wrap:pretty]">{line}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
          </div>
        </AppDialog>
      ) : null}

      {feedbackUi && result ? (
        <AppDialog
          open
          onClose={() => {
            if (!feedbackBusy) {
              setFeedbackUi(null);
              setFeedbackText("");
              setFeedbackErr(null);
            }
          }}
          title={
            feedbackUi.mode === "whole_paper"
              ? "整卷反馈"
              : canManage
                ? "修正本题得分"
                : "判题有误反馈"
          }
          subtitle={
            feedbackUi.mode === "whole_paper"
              ? canManage
                ? "对整卷批改的总体意见、多题系统性误判、得分尺度等，一条说明即可。提交时会附带当前卷追溯信息。"
                : "对整卷批改的总体意见将提交给任课教师审核；确认后会用于优化判题逻辑。"
              : canManage
                ? "教师可直接修改本题得分与判定状态，修改后立即反映在右侧分项与综合分。"
                : "若您认为本题判定或给分不合理，请说明情况并提交给任课教师；教师确认后将用于优化判题逻辑。"
          }
          titleId="grading-feedback-title"
          closeDisabled={feedbackBusy}
          backdropLabel="关闭反馈"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={feedbackBusy}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-black/[0.1] bg-white px-4 text-small font-bold text-ink-muted transition hover:bg-black/[0.03] disabled:opacity-50"
                onClick={() => {
                  setFeedbackUi(null);
                  setFeedbackText("");
                  setFeedbackErr(null);
                }}
              >
                取消
              </button>
              <button
                type="button"
                disabled={feedbackBusy}
                onClick={() =>
                  void (feedbackUi.mode === "whole_paper" ? handleSubmitWholePaperFeedback() : handleSubmitQuestionFeedback())
                }
                className="btn-brand-primary min-h-10 px-6 text-small disabled:opacity-60"
              >
                {feedbackBusy
                  ? "提交中…"
                  : feedbackUi.mode === "question" && canManage
                    ? "保存得分"
                    : canManage
                      ? "提交反馈"
                      : "提交申诉"}
              </button>
            </div>
          }
        >
            <div className="space-y-4">
              {feedbackTraceLines.length > 0 ? (
                <div className={`${APP_DIALOG_PANEL} !from-sky-50/80 text-[0.65rem] leading-relaxed text-sky-950 sm:text-caption`}>
                  <p className="font-bold text-sky-950">将随反馈一并提交的追溯信息</p>
                  <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-sky-900/90">
                    {feedbackTraceLines.map((line, i) => (
                      <li key={i} className="[text-wrap:pretty]">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className={`${APP_DIALOG_PANEL} text-[0.65rem] leading-relaxed text-ink-muted sm:text-caption`}>
                  当前未解析到服务端截图 id（需批改接口返回 <code className="rounded bg-black/[0.06] px-1">/uploads/</code>{" "}
                  路径）且无本地历史 id；仍可提交文字说明。
                </p>
              )}
              {feedbackUi.mode === "question" ? (
                <div className={`${APP_DIALOG_PANEL} text-caption leading-relaxed text-ink`}>
                  <p className="font-bold text-ink">{feedbackUi.dim.label}</p>
                  <p className="mt-1 text-ink-muted">
                    当前判定：<span className="font-semibold text-ink">{feedbackUi.dim.status ?? "—"}</span>
                    <span className="mx-2 text-ink-subtle">|</span>
                    得分：
                    <span className="font-mono font-semibold text-ink">
                      {feedbackUi.dim.value}/{feedbackUi.dim.max}
                    </span>
                  </p>
                </div>
              ) : null}
              {!(feedbackUi.mode === "question" && canManage) ? (
                            <div className={APP_DIALOG_PANEL}>
                <label htmlFor="grading-feedback-text" className="mb-1.5 block text-small font-bold text-ink">
                  您的说明（至少 8 字）
                </label>
                <textarea
                  id="grading-feedback-text"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value.slice(0, 2000))}
                  rows={5}
                  maxLength={2000}
                  placeholder={
                    feedbackUi.mode === "whole_paper"
                      ? "例：整卷过程分偏严；第 2、5 题笔迹潦草但可辨认应为半对；英语作文主题句漏判等。"
                      : "例：第 3 题学生最后一步应为 105，卷面可辨认；不应判为错误。或：过程分过低，中间脱式前两步成立。"
                  }
                  className="w-full resize-y rounded-xl border border-black/[0.1] bg-white px-3 py-2.5 text-small leading-relaxed text-ink shadow-sm outline-none transition placeholder:text-ink-subtle focus:border-primary/35 focus:ring-2 focus:ring-primary/15"
                />
                <p className="mt-1 text-[0.65rem] text-ink-muted">{feedbackText.trim().length}/2000（需已启动后端）</p>
              </div>
              ) : null}
              {feedbackUi.mode === "question" && canManage ? (
                <div className={`space-y-3 ${APP_DIALOG_PANEL}`}>
                  <div>
                    <label htmlFor="teacher-edit-score" className="mb-1 block text-small font-bold text-ink">
                      本题得分（满分 {feedbackUi.dim.max}）
                    </label>
                    <input
                      id="teacher-edit-score"
                      type="number"
                      min={0}
                      max={feedbackUi.dim.max}
                      step={0.5}
                      value={teacherEditValue}
                      onChange={(e) => setTeacherEditValue(e.target.value)}
                      className="w-full rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-small font-mono text-ink shadow-sm outline-none focus:border-primary/35 focus:ring-2 focus:ring-primary/15"
                    />
                  </div>
                  {subject === "math" ? (
                    <div>
                      <label htmlFor="teacher-edit-status" className="mb-1 block text-small font-bold text-ink">
                        判定状态
                      </label>
                      <select
                        id="teacher-edit-status"
                        value={teacherEditStatus}
                        onChange={(e) => setTeacherEditStatus(e.target.value)}
                        className="w-full rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-small text-ink outline-none focus:border-primary/35 focus:ring-2 focus:ring-primary/15"
                      >
                        <option value="正确">正确</option>
                        <option value="过程不规范">过程不规范</option>
                        <option value="错误">错误</option>
                        <option value="未作答">未作答</option>
                      </select>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {feedbackErr ? <p className="text-caption font-semibold text-red-600">{feedbackErr}</p> : null}
            </div>
        </AppDialog>
      ) : null}

    </section>
  );
}
