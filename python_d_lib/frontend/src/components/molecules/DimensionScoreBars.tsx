import type { DimensionScore } from "@/types/grading";
import { QuestionLabel } from "@/components/atoms/QuestionLabel";
import { MathPrettyText } from "@/components/atoms/MathPrettyText";
import {
  findImprovementLineForQuestion,
  formatMathDimensionDetail,
  questionIdFromDimensionLabel,
  shouldHideDimensionDetailBecauseDuplicate,
} from "@/lib/gradingAnalysisDisplay";

type DimensionScoreBarsProps = {
  dimensions: DimensionScore[];
  /** 数学：与「订正」列表比对，重复则隐藏分项内解析 */
  improvements?: string[];
  subject?: "math" | "english";
  /** 逐题「判题有误」反馈（可选） */
  onQuestionFeedback?: (d: DimensionScore) => void;
};

const BAR_ACCENTS = [
  "bg-gradient-to-r from-emerald-500 to-primary",
  "bg-gradient-to-r from-teal-500 to-cyan-400",
  "bg-gradient-to-r from-sky-500 to-indigo-400",
  "bg-gradient-to-r from-amber-400 to-orange-400",
];

function statusMark(status?: string): { sym: string; cls: string } | null {
  if (!status) return null;
  if (status === "正确") return { sym: "✓", cls: "bg-emerald-600 text-white ring-emerald-700/30" };
  if (status === "错误" || status === "未作答") return { sym: "✗", cls: "bg-red-500 text-white ring-red-700/30" };
  if (status === "过程不规范") return { sym: "◐", cls: "bg-amber-500 text-white ring-amber-700/30" };
  return { sym: "·", cls: "bg-black/50 text-white" };
}

/**
 * 分项分数条形列表（步骤维度或内容 / 语言 / 结构），每条使用区分色。
 */
export function DimensionScoreBars({
  dimensions,
  improvements = [],
  subject = "math",
  onQuestionFeedback,
}: DimensionScoreBarsProps) {
  return (
    <ul className="flex flex-col gap-3">
      {dimensions.map((d, index) => {
        const pct = Math.round((d.value / d.max) * 100);
        const bar = BAR_ACCENTS[index % BAR_ACCENTS.length];
        const mark = statusMark(d.status);
        const qid = subject === "math" ? questionIdFromDimensionLabel(d.label) : null;
        const impLine =
          qid && improvements.length ? findImprovementLineForQuestion(improvements, qid) : undefined;
        const rawDetail = d.detail?.trim() ?? "";
        const hideDup =
          subject === "math" &&
          rawDetail &&
          shouldHideDimensionDetailBecauseDuplicate(rawDetail, impLine);
        const displayDetail =
          !rawDetail || hideDup ? "" : formatMathDimensionDetail(rawDetail);
        return (
          <li key={d.key}>
            <div className="mb-1 flex items-start justify-between gap-2 text-small">
              <span className="min-w-0 flex-1 font-medium leading-snug text-gray-700">
                {mark ? (
                  <span
                    className={`mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ring-2 ring-inset ${mark.cls}`}
                    title={d.status}
                    aria-hidden
                  >
                    {mark.sym}
                  </span>
                ) : null}
                <QuestionLabel label={d.label} className="[word-break:break-word]" />
              </span>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="tabular-nums text-ink-muted" title="本题得分 / 满分">
                  <span className="font-semibold text-ink">{d.value}</span>
                  <span className="mx-0.5 text-ink-subtle">/</span>
                  <span>{d.max}</span>
                  <span className="ml-0.5 text-[0.65rem] font-medium text-ink-subtle">分</span>
                </span>
                {onQuestionFeedback ? (
                  <button
                    type="button"
                    onClick={() => onQuestionFeedback(d)}
                    className="rounded-lg border border-amber-200/90 bg-amber-50/90 px-2 py-0.5 text-[0.62rem] font-bold leading-tight text-amber-950 shadow-sm transition hover:border-amber-400 hover:bg-amber-100"
                    title="若您认为本题判定或给分不合理，可提交说明供后续优化模型与规则"
                  >
                    判题有误反馈
                  </button>
                ) : null}
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {displayDetail ? (
              <div className="mt-2 rounded-xl border border-black/[0.05] bg-white/80 px-2.5 py-2 text-[0.72rem] leading-relaxed text-ink-muted [text-wrap:pretty]">
                <span className="whitespace-pre-wrap">
                  <MathPrettyText text={displayDetail} />
                </span>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
