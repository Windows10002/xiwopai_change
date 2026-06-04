import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { Navigate, useSearchParams } from "react-router-dom";

import { AppLink } from "@/components/atoms/AppLink";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { AcademicTermScopeBar, parseTermScopeParam } from "@/components/molecules/AcademicTermScopeBar";
import { ClassAnalyticsToolStrip } from "@/components/molecules/ClassAnalyticsToolStrip";
import { ClassAnalyticsWorkspaceNote } from "@/components/molecules/ClassAnalyticsWorkspaceNote";
import { GradingHistoryEmbeddedPanel } from "@/components/molecules/GradingHistorySidePanel";
import { BatchInsightsModal } from "@/components/organisms/BatchInsightsModal";
import { ClassOverviewPanel } from "@/components/organisms/ClassOverviewPanel";
import { StudentAnalyticsPanel } from "@/components/organisms/StudentAnalyticsPanel";
import { WeakKnowledgeTrendPanel } from "@/components/organisms/WeakKnowledgeTrendPanel";
import { filterEntriesBySubject, parseAnalyticsSubject } from "@/lib/classAnalyticsInsights";
import { scoringPipelineSubject } from "@/lib/gradeSubject";
import { withAuthSlot } from "@/lib/authSlot";
import {
  TeacherWorkbenchLayout,
  WorkbenchSideNavButton,
} from "@/components/organisms/TeacherWorkbenchLayout";
import { filterGradingHistoryByScope } from "@/lib/academicTerm";
import {
  entriesForGroup,
  groupToInsightEntries,
  listClassGroups,
  type ClassGroupSummary,
} from "@/lib/classAnalytics";
import { aggregateBatchLocally } from "@/lib/gradingBatchInsights";
import { GRADING_HISTORY_CHANGED, loadGradingHistory, type GradingHistoryEntry } from "@/lib/gradingHistory";
import {
  CLASS_ANALYTICS_MODULE,
  CLASS_ANALYTICS_TAB_ORDER,
  CLASS_ANALYTICS_VIEWS,
  classAnalyticsMobileTitle,
  parseClassAnalyticsTab,
  rememberClassAnalyticsTab,
  tabUsesAnalyticsToolbar,
  type ClassAnalyticsTab,
} from "@/lib/workbench/classAnalyticsNav";

const SUBJECT_LABEL = { math: "数学", english: "英语", chinese: "语文", mixed: "混合" } as const;

function BatchOverviewCards({
  paperCount,
  avgScore,
  weakTags,
}: {
  paperCount: number;
  avgScore: number | null;
  weakTags: string[];
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="rounded-xl bg-primary-tint/80 px-3 py-3 text-center ring-1 ring-primary/15">
        <p className="text-caption text-ink-muted">份数</p>
        <p className="text-2xl font-black tabular-nums text-ink">{paperCount}</p>
      </div>
      <div className="rounded-xl bg-sky-50 px-3 py-3 text-center ring-1 ring-sky-100">
        <p className="text-caption text-ink-muted">平均得分率</p>
        <p className="text-2xl font-black tabular-nums text-sky-800">{avgScore != null ? `${avgScore}%` : "—"}</p>
      </div>
      <div className="col-span-2 rounded-xl bg-amber-50/90 px-3 py-3 ring-1 ring-amber-100 sm:col-span-1">
        <p className="text-caption font-bold text-amber-950/80">薄弱点 TOP</p>
        {weakTags.length === 0 ? (
          <p className="mt-1 text-caption text-ink-muted">暂无标签</p>
        ) : (
          <ul className="mt-1 space-y-0.5 text-left text-[0.65rem] font-semibold text-amber-950">
            {weakTags.slice(0, 3).map((t) => (
              <li key={t} className="truncate">
                · {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BatchAnalyticsPanel({ historyEntries }: { historyEntries: GradingHistoryEntry[] }) {
  const [version, setVersion] = useState(0);
  const groups = useMemo(() => listClassGroups(historyEntries), [version, historyEntries]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [subject, setSubject] = useState<"math" | "english" | "chinese">("math");
  const [insightsOpen, setInsightsOpen] = useState(false);

  const activeKey = selectedKey ?? groups[0]?.groupKey ?? null;
  const activeGroup = groups.find((g) => g.groupKey === activeKey) ?? null;

  const entries = useMemo(() => {
    if (!activeKey) return [];
    return entriesForGroup(activeKey, historyEntries);
  }, [activeKey, version, historyEntries]);

  const insightEntries = useMemo(() => {
    if (!activeKey) return [];
    return groupToInsightEntries(activeKey, subject, historyEntries);
  }, [activeKey, subject, version, historyEntries]);

  const localSummary = useMemo(() => {
    if (insightEntries.length === 0) return null;
    const batchSubject = subject === "english" ? "english" : "math";
    return aggregateBatchLocally(batchSubject, insightEntries);
  }, [insightEntries, subject]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const weakTags = localSummary?.stats?.weak_knowledge_ranked?.map((w) => w.tag) ?? [];

  return (
    <>
      <div className="grid min-h-[24rem] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <aside className="glass-panel rounded-2xl p-3">
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <p className="text-caption font-bold text-ink-muted">单次列表</p>
            <button
              type="button"
              onClick={refresh}
              title="刷新"
              aria-label="刷新"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] bg-white/80 text-ink-muted hover:border-primary/30"
            >
              <RefreshCw className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
            </button>
          </div>
          {groups.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <p className="text-caption text-ink-muted">暂无批改历史</p>
              <AppLink
                to="/math"
                className="btn-brand-primary mt-4 inline-flex min-h-9 items-center px-4 text-caption"
              >
                去数学批改
              </AppLink>
            </div>
          ) : (
            <ul className="mt-2 max-h-[min(60vh,28rem)] space-y-1 overflow-y-auto">
              {groups.map((g: ClassGroupSummary) => (
                <li key={g.groupKey}>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(g.groupKey)}
                    className={`flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition ${
                      g.groupKey === activeKey ? "bg-primary-tint ring-1 ring-primary/25" : "hover:bg-white/60"
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

        <section className="glass-panel rounded-2xl p-5 md:p-6">
          {!activeGroup ? (
            <p className="py-12 text-center text-small text-ink-muted">请选择左侧批次</p>
          ) : (
            <>
              <h2 className="text-xl font-extrabold text-ink">{activeGroup.groupName}</h2>
              <p className="mt-1 text-caption text-ink-muted">
                共 {activeGroup.paperCount} 份 · 最近 {formatDate(activeGroup.latestAt)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(["math", "english", "chinese"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSubject(s)}
                    className={`rounded-full px-3 py-1.5 text-caption font-bold ${
                      subject === s ? "bg-primary text-white" : "border border-black/[0.08] bg-white/80 text-ink-muted"
                    }`}
                  >
                    {SUBJECT_LABEL[s]}（{entries.filter((e) => e.subject === s).length}）
                  </button>
                ))}
              </div>
              {insightEntries.length > 0 ? (
                <BatchOverviewCards
                  paperCount={insightEntries.length}
                  avgScore={localSummary?.stats?.avg_score_percent ?? null}
                  weakTags={weakTags}
                />
              ) : (
                <p className="mt-4 rounded-xl bg-white/50 px-3 py-2 text-caption text-ink-muted">
                  当前学科下暂无答卷，请切换学科或重新批改。
                </p>
              )}
              <button
                type="button"
                disabled={insightEntries.length === 0}
                onClick={() => setInsightsOpen(true)}
                className="btn-brand-primary mt-6 inline-flex min-h-11 items-center gap-2 px-5 text-small disabled:opacity-50"
              >
                <BarChart3 className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                AI 深度学情分析（{insightEntries.length} 份）
              </button>
            </>
          )}
        </section>
      </div>

      {activeGroup && insightEntries.length > 0 ? (
        <BatchInsightsModal
          open={insightsOpen}
          onClose={() => setInsightsOpen(false)}
          subject={scoringPipelineSubject(subject)}
          subjectLabel={SUBJECT_LABEL[subject]}
          entries={insightEntries}
          groupName={activeGroup.groupName}
          dialogTitle={`${activeGroup.groupName} · 批次学情`}
        />
      ) : null}
    </>
  );
}

export function ClassAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [historyVersion, setHistoryVersion] = useState(0);
  useEffect(() => {
    const onHist = () => setHistoryVersion((v) => v + 1);
    window.addEventListener(GRADING_HISTORY_CHANGED, onHist);
    return () => window.removeEventListener(GRADING_HISTORY_CHANGED, onHist);
  }, []);
  const viewTab: ClassAnalyticsTab = parseClassAnalyticsTab(searchParams.get("tab"));
  const termScope = parseTermScopeParam(searchParams.get("term"));
  const legacyTasksSource = searchParams.get("source") === "tasks";

  const scopedHistory = useMemo(() => {
    void historyVersion;
    return filterGradingHistoryByScope(loadGradingHistory(), termScope);
  }, [termScope, historyVersion]);

  const setViewTab = (next: ClassAnalyticsTab) => {
    rememberClassAnalyticsTab(next);
    const params = new URLSearchParams(searchParams);
    params.delete("source");
    if (next === "class") params.delete("tab");
    else params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  const taskFilter = searchParams.get("task")?.trim() ?? "";

  const subjectFilter = parseAnalyticsSubject(searchParams.get("subject"));
  const filteredHistory = useMemo(
    () => filterEntriesBySubject(scopedHistory, subjectFilter),
    [scopedHistory, subjectFilter],
  );

  const mobileTitle = classAnalyticsMobileTitle(viewTab);

  if (legacyTasksSource) {
    return <Navigate to={withAuthSlot("/workspace")} replace />;
  }

  const navPillClass = (active: boolean) =>
    `shrink-0 rounded-xl px-3 py-1.5 text-caption font-bold ${
      active ? "bg-brand text-white" : "bg-white/90 text-ink-muted ring-1 ring-black/[0.06]"
    }`;

  const sideNav = (
    <>
      {CLASS_ANALYTICS_TAB_ORDER.map((tab) => (
        <WorkbenchSideNavButton
          key={tab}
          active={viewTab === tab}
          label={CLASS_ANALYTICS_VIEWS[tab].label}
          title={CLASS_ANALYTICS_VIEWS[tab].description}
          onClick={() => setViewTab(tab)}
        />
      ))}
    </>
  );

  const mobileSideNav = (
    <>
      {CLASS_ANALYTICS_TAB_ORDER.map((tab) => (
        <button
          key={tab}
          type="button"
          title={CLASS_ANALYTICS_VIEWS[tab].description}
          onClick={() => setViewTab(tab)}
          className={navPillClass(viewTab === tab)}
        >
          {CLASS_ANALYTICS_VIEWS[tab].label}
        </button>
      ))}
    </>
  );

  return (
    <TeacherWorkbenchLayout
      moduleTitle={CLASS_ANALYTICS_MODULE.title}
      moduleSubtitle={CLASS_ANALYTICS_MODULE.subtitle}
      mobileTitle={mobileTitle}
      headerSlot={<AcademicTermScopeBar compact />}
      onRefresh={() => setHistoryVersion((v) => v + 1)}
      sideNav={
        <>
          <div className="hidden md:contents">{sideNav}</div>
          <div className="contents md:hidden">{mobileSideNav}</div>
        </>
      }
    >
      <div className="mb-4 md:hidden">
        <AcademicTermScopeBar className="glass-panel rounded-xl p-3" />
      </div>
      {taskFilter ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-teal-200/80 bg-teal-50/80 px-3 py-2 text-caption text-teal-950">
          <span>
            已按任务筛选本机学情：<strong>{taskFilter}</strong>
          </span>
          <button
            type="button"
            className="font-bold text-brand hover:underline"
            onClick={() => {
              const params = new URLSearchParams(searchParams);
              params.delete("task");
              setSearchParams(params, { replace: true });
            }}
          >
            查看全部
          </button>
          <AppLink to="/workspace" className="font-bold text-brand hover:underline">
            返回作业管理
          </AppLink>
        </div>
      ) : null}
      {tabUsesAnalyticsToolbar(viewTab) ? (
        <ClassAnalyticsToolStrip historyEntries={scopedHistory} />
      ) : null}
      {viewTab === "history" ? (
        <GradingHistoryEmbeddedPanel historyEntries={scopedHistory} />
      ) : viewTab === "batch" ? (
        <BatchAnalyticsPanel historyEntries={filteredHistory} />
      ) : viewTab === "class" ? (
        <ClassOverviewPanel historyEntries={scopedHistory} />
      ) : viewTab === "weak" ? (
        <WeakKnowledgeTrendPanel historyEntries={scopedHistory} />
      ) : (
        <StudentAnalyticsPanel historyEntries={filteredHistory} taskFilter={taskFilter} />
      )}
      <ClassAnalyticsWorkspaceNote />
    </TeacherWorkbenchLayout>
  );
}
