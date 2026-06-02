import { useCallback, useMemo, useState } from "react";
import { BarChart3, RefreshCw, UserRound } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { Navbar } from "@/components/atoms/Navbar";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { BatchInsightsModal } from "@/components/organisms/BatchInsightsModal";
import { StudentAnalyticsPanel } from "@/components/organisms/StudentAnalyticsPanel";
import {
  entriesForGroup,
  groupToInsightEntries,
  listClassGroups,
  type ClassGroupSummary,
} from "@/lib/classAnalytics";
import { loadGradingHistory } from "@/lib/gradingHistory";

const SUBJECT_LABEL = { math: "数学", english: "英语", mixed: "混合" } as const;

type AnalyticsTab = "class" | "student";

function ClassGroupAnalyticsPanel() {
  const [version, setVersion] = useState(0);
  const groups = useMemo(() => listClassGroups(loadGradingHistory()), [version]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [subject, setSubject] = useState<"math" | "english">("math");
  const [insightsOpen, setInsightsOpen] = useState(false);

  const activeKey = selectedKey ?? groups[0]?.groupKey ?? null;
  const activeGroup = groups.find((g) => g.groupKey === activeKey) ?? null;

  const entries = useMemo(() => {
    if (!activeKey) return [];
    return entriesForGroup(activeKey);
  }, [activeKey, version]);

  const insightEntries = useMemo(() => {
    if (!activeKey) return [];
    return groupToInsightEntries(activeKey, subject);
  }, [activeKey, subject, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <p className="max-w-2xl text-small text-ink-muted">
        按文件夹批次或单次批改分组汇总平均分与薄弱点，支持 AI 深度学情分析与导出（数据来自本机批改历史）。
      </p>

      <div className="mt-4 grid min-h-[24rem] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-black/[0.08] bg-white/95 p-3 shadow-card">
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <p className="text-caption font-bold text-ink-muted">批次 / 分组</p>
            <button
              type="button"
              onClick={refresh}
              title="刷新"
              aria-label="刷新"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-ink-muted hover:border-primary/30"
            >
              <RefreshCw className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
            </button>
          </div>
          {groups.length === 0 ? (
            <p className="px-2 py-8 text-center text-caption text-ink-muted">暂无历史。请先完成文件夹批量批改。</p>
          ) : (
            <ul className="mt-2 max-h-[min(60vh,28rem)] space-y-1 overflow-y-auto">
              {groups.map((g: ClassGroupSummary) => (
                <li key={g.groupKey}>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(g.groupKey)}
                    className={`flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition ${
                      g.groupKey === activeKey ? "bg-primary-tint ring-1 ring-primary/25" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-small font-bold text-ink">{g.groupName}</span>
                    <span className="mt-1 text-caption text-ink-muted">
                      {g.paperCount} 份 · {SUBJECT_LABEL[g.subject]} · 均分 {g.avgScorePercent ?? "—"}%
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="rounded-2xl border border-black/[0.08] bg-white/95 p-5 shadow-card md:p-6">
          {!activeGroup ? (
            <p className="py-12 text-center text-small text-ink-muted">请选择左侧分组</p>
          ) : (
            <>
              <h2 className="text-xl font-extrabold text-ink">{activeGroup.groupName}</h2>
              <p className="mt-1 text-caption text-ink-muted">
                共 {activeGroup.paperCount} 份 · 最近 {formatDate(activeGroup.latestAt)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(["math", "english"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSubject(s)}
                    className={`rounded-full px-3 py-1.5 text-caption font-bold ${
                      subject === s ? "bg-primary text-white" : "border border-black/[0.08] bg-white text-ink-muted"
                    }`}
                  >
                    {s === "math" ? "数学" : "英语"}（{entries.filter((e) => e.subject === s).length}）
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={insightEntries.length === 0}
                onClick={() => setInsightsOpen(true)}
                className="btn-brand-primary mt-6 inline-flex min-h-11 items-center gap-2 px-5 text-small disabled:opacity-50"
              >
                <BarChart3 className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                班级 AI 学情分析（{insightEntries.length} 份）
              </button>
            </>
          )}
        </section>
      </div>

      {activeGroup && insightEntries.length > 0 ? (
        <BatchInsightsModal
          open={insightsOpen}
          onClose={() => setInsightsOpen(false)}
          subject={subject}
          subjectLabel={subject === "math" ? "数学" : "英语"}
          entries={insightEntries}
          groupName={activeGroup.groupName}
          dialogTitle={`${activeGroup.groupName} · 班级学情`}
        />
      ) : null}
    </>
  );
}

export function ClassAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: AnalyticsTab = searchParams.get("tab") === "student" ? "student" : "class";

  const setTab = (next: AnalyticsTab) => {
    setSearchParams(next === "student" ? { tab: "student" } : {}, { replace: true });
  };

  return (
    <div className="page-bg-hero-stunning relative flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">班级看板</h1>
          <p className="mt-2 max-w-2xl text-small text-ink-muted">
            班级批次分析与学生个性化学情已合并于此，便于统一查看与导出。
          </p>
        </div>

        <div
          className="inline-flex w-fit rounded-full border border-black/[0.08] bg-white/95 p-1 shadow-sm"
          role="tablist"
          aria-label="看板视图"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "class"}
            onClick={() => setTab("class")}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-small font-bold transition ${
              tab === "class" ? "bg-primary text-white shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            <BarChart3 className="h-4 w-4" {...CUTE_ICON} aria-hidden />
            班级批次
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "student"}
            onClick={() => setTab("student")}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-small font-bold transition ${
              tab === "student" ? "bg-primary text-white shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            <UserRound className="h-4 w-4" {...CUTE_ICON} aria-hidden />
            学生学情
          </button>
        </div>

        {tab === "class" ? <ClassGroupAnalyticsPanel /> : <StudentAnalyticsPanel />}
      </main>
    </div>
  );
}
