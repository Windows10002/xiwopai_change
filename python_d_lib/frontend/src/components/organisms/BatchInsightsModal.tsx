import { useCallback, useMemo, useState, type ReactNode } from "react";
import { BarChart3, BookOpen, Copy, Loader2, Sparkles } from "lucide-react";

import { AppDialog, APP_DIALOG_PANEL, APP_DIALOG_PANEL_TITLE } from "@/components/molecules/AppDialog";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { MathPrettyText } from "@/components/atoms/MathPrettyText";
import type { BatchInsightsResponse } from "@/lib/gradingBatchInsights";
import {
  aggregateBatchLocally,
  buildBatchInsightItems,
  fetchBatchInsights,
} from "@/lib/gradingBatchInsights";
import type { GradingResultDetail } from "@/types/grading";

type BatchInsightsModalProps = {
  open: boolean;
  onClose: () => void;
  subject: "math" | "english";
  subjectLabel: string;
  entries: Array<{ fileName: string; detail: GradingResultDetail }>;
  gradeLevel?: string;
  teacherNote?: string;
  groupName?: string;
};

type TabId = "report" | "variants";

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-3">
      <p className="text-caption font-bold text-ink">{title}</p>
      
      <div className="mt-1.5 space-y-1 text-small leading-relaxed text-ink-muted">{children}</div>
    </div>
  );
}

export function BatchInsightsModal({
  open,
  onClose,
  subject,
  subjectLabel,
  entries,
  gradeLevel,
  teacherNote,
  groupName,
}: BatchInsightsModalProps) {
  const [tab, setTab] = useState<TabId>("report");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BatchInsightsResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const canAnalyze = entries.length > 0;

  const runAnalysis = useCallback(
    async (useLlm: boolean) => {
      if (!canAnalyze) return;
      setLoading(true);
      setError(null);
      try {
        if (useLlm) {
          const items = buildBatchInsightItems(subject, entries);
          const res = await fetchBatchInsights({
            subject,
            items,
            gradeLevel,
            teacherNote,
            groupName,
          });
          setData(res);
        } else {
          const local = aggregateBatchLocally(subject, entries);
          setData({
            ok: true,
            ...local,
            knowledge_variants: {
              intro: "本地汇总未生成变式题，请使用「AI 深度分析」。",
              knowledge_summary: (local.stats?.weak_knowledge_ranked ?? []).map((w) => ({
                name: w.tag,
                frequency: w.count,
                mastery_hint: w.count >= 2 ? "需巩固" : "偶发",
              })),
              variant_problems: [],
            },
          });
        }
        setTab("report");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "分析失败";
        const local = aggregateBatchLocally(subject, entries);
        setData({
          ok: true,
          ...local,
          knowledge_variants: {
            intro: `AI 不可用（${msg}），已展示本地统计。`,
            knowledge_summary: [],
            variant_problems: [],
          },
        });
        setError(`${msg} · 已展示本地汇总`);
        setTab("report");
      } finally {
        setLoading(false);
      }
    },
    [canAnalyze, subject, entries, gradeLevel, teacherNote, groupName],
  );

  const reportText = useMemo(() => data?.learning_report?.summary_md ?? "", [data]);

  const copyReport = async () => {
    if (!reportText) return;
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const variants = data?.knowledge_variants;
  const report = data?.learning_report;

  const tabBtn = (id: TabId, label: string, Icon: typeof BarChart3) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={[
        "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-caption font-bold transition",
        tab === id ? "bg-white/55 text-[#51c527] shadow-sm ring-1 ring-white/40" : "text-ink-muted hover:text-ink",
      ].join(" ")}
    >
      <Icon className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
      {label}
    </button>
  );

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="批量学情分析"
      subtitle={`${subjectLabel} · ${entries.length} 份已批改${groupName ? ` · ${groupName}` : ""}`}
      size="lg"
      zIndex={110}
      closeDisabled={loading}
      footer={
        data ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/[0.1] bg-white/80 px-4 text-small font-bold text-ink-muted"
              onClick={copyReport}
              disabled={!reportText}
            >
              <Copy className="h-4 w-4" {...CUTE_ICON} aria-hidden />
              {copied ? "已复制" : "复制报告"}
            </button>
            <button type="button" className="btn-brand-primary min-h-10 px-6 text-small" onClick={onClose}>
              完成
            </button>
          </div>
        ) : undefined
      }
    >
      {!data ? (
        <div className="space-y-4">
          <p className="text-small leading-relaxed text-ink-muted">
            汇总本批 <strong className="text-ink">{entries.length}</strong> 份作业的错题模式与薄弱知识点，并整理未来可练的变形题。
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={!canAnalyze || loading}
              onClick={() => runAnalysis(true)}
              className="btn-brand-primary inline-flex min-h-11 flex-1 items-center justify-center gap-2 text-small"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4" {...CUTE_ICON} aria-hidden />
              )}
              AI 深度分析
            </button>
            <button
              type="button"
              disabled={!canAnalyze || loading}
              onClick={() => runAnalysis(false)}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-white/80 px-4 text-small font-bold text-[#006D41]"
            >
              <BarChart3 className="h-4 w-4" {...CUTE_ICON} aria-hidden />
              快速本地汇总
            </button>
          </div>
          {error ? <p className="text-caption font-semibold text-amber-800">{error}</p> : null}
        </div>
      ) : (
        <div className="max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto overscroll-contain pr-1">
          {error ? (
            <p className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-3 py-2 text-caption text-amber-950">
              {error}
            </p>
          ) : null}
          {data.stats?.avg_score_percent != null ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className={`${APP_DIALOG_PANEL} text-center`}>
                <p className="text-caption text-ink-muted">平均得分率</p>
                <p className="text-2xl font-black tabular-nums text-[#51c527]">{data.stats.avg_score_percent}%</p>
              </div>
              <div className={`${APP_DIALOG_PANEL} text-center`}>
                <p className="text-caption text-ink-muted">批改份数</p>
                <p className="text-2xl font-black text-ink">{data.stats.paper_count}</p>
              </div>
              <div className={`${APP_DIALOG_PANEL} col-span-2 text-center sm:col-span-1`}>
                <p className="text-caption text-ink-muted">薄弱点种类</p>
                <p className="text-2xl font-black text-ink">{data.stats.weak_knowledge_ranked?.length ?? 0}</p>
              </div>
            </div>
          ) : null}
          <div className="flex rounded-xl border border-white/30 bg-white/25 p-1 backdrop-blur-sm">
            {tabBtn("report", "学情报告", BarChart3)}
            {tabBtn("variants", "知识点与变式", BookOpen)}
          </div>
          {tab === "report" ? (
            <div className={APP_DIALOG_PANEL}>
              <p className={APP_DIALOG_PANEL_TITLE}>学情分析报告</p>
              <div className="mt-3 whitespace-pre-wrap text-small leading-relaxed text-ink [text-wrap:pretty]">
                <MathPrettyText text={report?.summary_md ?? ""} />
              </div>
              {(report?.weak_knowledge_ranked?.length ?? 0) > 0 ? (
                <ReportSection title="薄弱知识点（按频次）">
                  <ul className="list-disc space-y-1 pl-4">
                    {report!.weak_knowledge_ranked!.map((w) => (
                      <li key={w.tag}>
                        <strong className="text-ink">{w.tag}</strong>
                        <span className="text-ink-muted"> · {w.count} 次</span>
                        {"analysis" in w && w.analysis ? (
                          <span className="block text-caption">{String(w.analysis)}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </ReportSection>
              ) : null}
              {(report?.error_patterns?.length ?? 0) > 0 ? (
                <ReportSection title="错题模式">
                  <ul className="list-disc space-y-1 pl-4">
                    {report!.error_patterns!.map((p) => (
                      <li key={p.pattern}>
                        <strong className="text-ink">{p.pattern}</strong>
                        <span className="text-ink-muted"> · {p.count} 次</span>
                        {"description" in p && p.description ? (
                          <span className="block text-caption">{String(p.description)}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </ReportSection>
              ) : null}
              {(report?.teaching_suggestions?.length ?? 0) > 0 ? (
                <ReportSection title="教学建议">
                  <ul className="list-disc space-y-1 pl-4">
                    {report!.teaching_suggestions!.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </ReportSection>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {variants?.intro ? (
                <p className="text-small leading-relaxed text-ink-muted">{variants.intro}</p>
              ) : null}
              {(variants?.knowledge_summary?.length ?? 0) > 0 ? (
                <div className={APP_DIALOG_PANEL}>
                  <p className={APP_DIALOG_PANEL_TITLE}>本批涉及知识点</p>
                  <ul className="mt-3 space-y-2">
                    {variants!.knowledge_summary!.map((k) => (
                      <li
                        key={k.name}
                        className="rounded-xl border border-primary/15 bg-white/40 px-3 py-2 text-small backdrop-blur-sm"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-bold text-ink">{k.name}</span>
                          <span className="text-caption text-ink-muted">
                            出现 {k.frequency} 次 · {k.mastery_hint ?? "—"}
                          </span>
                        </div>
                        {(k.typical_errors?.length ?? 0) > 0 ? (
                          <p className="mt-1 text-caption text-ink-muted">
                            典型错因：{k.typical_errors!.join("；")}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {(variants?.variant_problems?.length ?? 0) > 0 ? (
                <div className={APP_DIALOG_PANEL}>
                  <p className={APP_DIALOG_PANEL_TITLE}>变形题建议（可布置练习）</p>
                  <ol className="mt-3 list-decimal space-y-3 pl-5">
                    {variants!.variant_problems!.map((v, i) => (
                      <li key={`${v.knowledge_point}-${i}`} className="text-small leading-relaxed text-ink">
                        <p className="font-bold text-[#006D41]">
                          {v.knowledge_point}
                          <span className="ml-2 font-semibold text-ink-muted">
                            · {v.difficulty} · {v.variation_type}
                          </span>
                        </p>
                        <p className="mt-1 [text-wrap:pretty]">
                          <MathPrettyText text={v.stem} />
                        </p>
                        <p className="mt-1 text-caption text-ink-muted">
                          参考答案要点：<MathPrettyText text={v.answer_hint} />
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </AppDialog>
  );
}
