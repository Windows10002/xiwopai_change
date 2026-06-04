import { useSearchParams } from "react-router-dom";
import { Download } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { parseTermScopeParam } from "@/components/molecules/AcademicTermScopeBar";
import { downloadAnalyticsBriefing } from "@/lib/analyticsBriefExport";
import { downloadWorkspaceGradesCsv } from "@/lib/workspaceGradesExport";
import { parseAnalyticsSubject, type AnalyticsSubjectFilter } from "@/lib/classAnalyticsInsights";
import type { GradingHistoryEntry } from "@/lib/gradingHistory";

const SUBJECT_OPTIONS: { value: AnalyticsSubjectFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "math", label: "数学" },
  { value: "english", label: "英语" },
  { value: "chinese", label: "语文" },
];

type ClassAnalyticsToolStripProps = {
  historyEntries: GradingHistoryEntry[];
};

/** 学情视图共用：学科筛选 + 导出简报 */
export function ClassAnalyticsToolStrip({ historyEntries }: ClassAnalyticsToolStripProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const subject = parseAnalyticsSubject(searchParams.get("subject"));
  const termScope = parseTermScopeParam(searchParams.get("term"));

  const setSubject = (next: AnalyticsSubjectFilter) => {
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("subject");
    else params.set("subject", next);
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/[0.06] bg-white/80 px-3 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.65rem] font-bold text-ink-muted">学科筛选</span>
        {SUBJECT_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setSubject(o.value)}
            className={`rounded-full px-3 py-1 text-caption font-bold transition ${
              subject === o.value ? "bg-primary text-white shadow-sm" : "bg-surface-page text-ink-muted ring-1 ring-black/[0.06]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={historyEntries.length === 0}
          onClick={() =>
            downloadAnalyticsBriefing(historyEntries, {
              termScope,
              subject: parseAnalyticsSubject(searchParams.get("subject")),
            })
          }
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-3 text-caption font-bold text-[#006D41] shadow-sm transition hover:border-primary/30 disabled:opacity-50"
        >
          <Download className="h-4 w-4" {...CUTE_ICON} aria-hidden />
          导出学情简报
        </button>
        <button
          type="button"
          onClick={() => void downloadWorkspaceGradesCsv().catch(() => {})}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-violet-200/80 bg-violet-50/80 px-3 text-caption font-bold text-violet-900 shadow-sm transition hover:border-violet-300"
        >
          <Download className="h-4 w-4" {...CUTE_ICON} aria-hidden />
          导出作业成绩
        </button>
      </div>
    </div>
  );
}
