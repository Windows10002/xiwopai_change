import { useCallback, useMemo, useState } from "react";
import { BarChart3, RefreshCw, Sparkles, UserRound } from "lucide-react";

import { SimpleLineChart } from "@/components/molecules/SimpleLineChart";
import { SimpleRadarChart } from "@/components/molecules/SimpleRadarChart";

import { Navbar } from "@/components/atoms/Navbar";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { BatchInsightsModal } from "@/components/organisms/BatchInsightsModal";
import { loadGradingHistory } from "@/lib/gradingHistory";
import {
  filterHistoryByStudent,
  formatStudentDate,
  historyToInsightEntries,
  listStudentProfiles,
  type SubjectFilter,
  UNLABELED_STUDENT_KEY,
} from "@/lib/studentLearningAnalytics";

const SUBJECT_LABEL = { all: "全部学科", math: "数学", english: "英语" } as const;

export function StudentAnalyticsPage() {
  const [historyVersion, setHistoryVersion] = useState(0);
  const profiles = useMemo(() => listStudentProfiles(loadGradingHistory()), [historyVersion]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>("all");
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [teacherNote, setTeacherNote] = useState("");

  const activeKey = selectedKey ?? profiles[0]?.key ?? null;
  const activeProfile = profiles.find((p) => p.key === activeKey) ?? null;

  const entries = useMemo(() => {
    if (!activeKey) return [];
    return filterHistoryByStudent(activeKey, subjectFilter);
  }, [activeKey, subjectFilter, historyVersion]);

  const insightEntries = useMemo(() => historyToInsightEntries(entries), [entries]);

  const trendPoints = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.createdAt - b.createdAt);
    return sorted.slice(-12).map((e, i) => ({
      label: `${i + 1}`,
      value: e.detail.scorePercent,
    }));
  }, [entries]);

  const radarAxes = useMemo(() => {
    if (subjectFilter === "english" && entries.length > 0) {
      const dims = entries[0]?.detail.dimensions ?? [];
      const content = dims.find((d) => /内容/i.test(d.label));
      const lang = dims.find((d) => /语言/i.test(d.label));
      const struct = dims.find((d) => /结构/i.test(d.label));
      if (content || lang || struct) {
        return [
          { label: "内容", value: content?.value ?? 0, max: content?.max ?? 6 },
          { label: "语言", value: lang?.value ?? 0, max: lang?.max ?? 6 },
          { label: "结构", value: struct?.value ?? 0, max: struct?.max ?? 3 },
        ].filter((a) => a.max > 0);
      }
    }
    if (entries.length > 0) {
      const latest = entries[0].detail.dimensions;
      const ok = latest.filter((d) => d.status === "正确").length;
      const half = latest.filter((d) => d.status === "过程不规范").length;
      const bad = latest.filter((d) => d.status === "错误" || d.status === "未作答").length;
      const total = latest.length || 1;
      return [
        { label: "正确", value: ok, max: total },
        { label: "不规范", value: half, max: total },
        { label: "错题", value: bad, max: total },
      ];
    }
    return [];
  }, [entries, subjectFilter]);

  const analysisSubject = useMemo((): "math" | "english" => {
    if (subjectFilter === "math" || subjectFilter === "english") return subjectFilter;
    if (activeProfile && activeProfile.mathCount >= activeProfile.englishCount) return "math";
    return "math";
  }, [subjectFilter, activeProfile]);

  const refresh = useCallback(() => setHistoryVersion((v) => v + 1), []);

  return (
    <div className="page-bg-hero-stunning relative flex min-h-screen flex-col">
      <div className="relative z-10 flex flex-1 flex-col">
        <Navbar />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-ink">学生个性化学情分析</h1>
              <p className="mt-2 max-w-2xl text-small text-ink-muted">
                汇总同一学生在多次批改中的薄弱点、错题模式与得分变化，生成个性化辅导建议与分层变式题。批改时请填写「学生姓名」以便归类。
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-4 text-small font-bold text-ink-muted shadow-sm hover:border-primary/30 hover:text-ink"
            >
              <RefreshCw className="h-4 w-4" {...CUTE_ICON} aria-hidden />
              刷新列表
            </button>
          </div>

          <div className="grid min-h-[28rem] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-black/[0.08] bg-white/95 p-3 shadow-card ring-1 ring-white/80">
              <p className="px-2 py-1 text-caption font-bold text-ink-muted">学生列表</p>
              {profiles.length === 0 ? (
                <p className="px-2 py-6 text-center text-caption text-ink-muted">暂无批改历史，请先完成批改并填写学生姓名。</p>
              ) : (
                <ul className="mt-2 max-h-[min(60vh,28rem)] space-y-1 overflow-y-auto">
                  {profiles.map((p) => (
                    <li key={p.key}>
                      <button
                        type="button"
                        onClick={() => setSelectedKey(p.key)}
                        className={`flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition ${
                          p.key === activeKey
                            ? "bg-primary-tint ring-1 ring-primary/25"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <span className="flex items-center gap-2 text-small font-bold text-ink">
                          <UserRound className="h-4 w-4 shrink-0 text-primary" {...CUTE_ICON} aria-hidden />
                          {p.displayName}
                        </span>
                        <span className="mt-1 text-caption text-ink-muted">
                          {p.paperCount} 份 · 均分 {p.avgScorePercent != null ? `${p.avgScorePercent}%` : "—"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            <section className="rounded-2xl border border-black/[0.08] bg-white/95 p-5 shadow-card ring-1 ring-white/80 md:p-6">
              {!activeProfile ? (
                <p className="py-12 text-center text-small text-ink-muted">请选择左侧学生</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/[0.06] pb-4">
                    <div>
                      <h2 className="text-xl font-extrabold text-ink">{activeProfile.displayName}</h2>
                      <p className="mt-1 text-caption text-ink-muted">
                        数学 {activeProfile.mathCount} 份 · 英语 {activeProfile.englishCount} 份
                        {activeProfile.gradeLevel ? ` · ${activeProfile.gradeLevel}` : ""}
                        {activeProfile.key === UNLABELED_STUDENT_KEY ? " · 建议在批改时填写姓名" : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(["all", "math", "english"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSubjectFilter(s)}
                          className={`rounded-full px-3 py-1.5 text-caption font-bold transition ${
                            subjectFilter === s
                              ? "bg-primary text-white"
                              : "border border-black/[0.08] bg-white text-ink-muted"
                          }`}
                        >
                          {SUBJECT_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {trendPoints.length >= 2 ? (
                    <div className="mt-4 rounded-2xl border border-black/[0.06] bg-surface-page/50 p-4">
                      <p className="text-caption font-bold text-ink-muted">得分率趋势（时间序）</p>
                      <SimpleLineChart points={trendPoints} className="mt-3" />
                    </div>
                  ) : null}

                  {radarAxes.length >= 3 ? (
                    <div className="mt-4 rounded-2xl border border-black/[0.06] bg-surface-page/50 p-4">
                      <p className="text-caption font-bold text-ink-muted">维度雷达（最近一次）</p>
                      <SimpleRadarChart axes={radarAxes} className="mt-3" />
                    </div>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-primary-tint/80 px-3 py-3 text-center ring-1 ring-primary/15">
                      <p className="text-caption text-ink-muted">当前筛选份数</p>
                      <p className="text-2xl font-black text-ink">{entries.length}</p>
                    </div>
                    <div className="rounded-xl bg-sky-50 px-3 py-3 text-center ring-1 ring-sky-100">
                      <p className="text-caption text-ink-muted">平均得分率</p>
                      <p className="text-2xl font-black text-sky-800">
                        {entries.length
                          ? `${Math.round((entries.reduce((a, e) => a + e.detail.scorePercent, 0) / entries.length) * 10) / 10}%`
                          : "—"}
                      </p>
                    </div>
                    <div className="col-span-2 rounded-xl bg-amber-50 px-3 py-3 text-center ring-1 ring-amber-100 sm:col-span-1">
                      <p className="text-caption text-ink-muted">最近批改</p>
                      <p className="text-small font-bold text-amber-950">
                        {entries[0] ? formatStudentDate(entries[0].createdAt) : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1.5 block text-caption font-bold text-ink">教师补充说明（选填）</label>
                    <textarea
                      value={teacherNote}
                      onChange={(e) => setTeacherNote(e.target.value.slice(0, 400))}
                      rows={2}
                      placeholder="例如：该生近期计算粗心；家长希望加强应用题审题……"
                      className="w-full rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-small text-ink outline-none focus:border-primary/35 focus:ring-2 focus:ring-primary/15"
                    />
                  </div>

                  <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-black/[0.06] bg-surface-page/50 p-3">
                    {entries.length === 0 ? (
                      <li className="text-caption text-ink-muted">该筛选下暂无作业记录</li>
                    ) : (
                      entries.map((e) => (
                        <li key={e.id} className="flex flex-wrap justify-between gap-2 text-caption">
                          <span className="font-semibold text-ink">
                            {SUBJECT_LABEL[e.subject]} · {e.fileName}
                          </span>
                          <span className="text-ink-muted">
                            {e.detail.scorePercent}% · {formatStudentDate(e.createdAt)}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>

                  <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={insightEntries.length === 0}
                      onClick={() => setInsightsOpen(true)}
                      className="btn-brand-primary inline-flex min-h-11 flex-1 items-center justify-center gap-2 text-small disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                      AI 个性化学情分析
                    </button>
                    <button
                      type="button"
                      disabled={insightEntries.length === 0}
                      onClick={() => setInsightsOpen(true)}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-white px-4 text-small font-bold text-[#006D41] disabled:opacity-50"
                    >
                      <BarChart3 className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                      查看 / 导出报告
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        </main>
      </div>

      {activeProfile && insightEntries.length > 0 ? (
        <BatchInsightsModal
          open={insightsOpen}
          onClose={() => setInsightsOpen(false)}
          subject={analysisSubject}
          subjectLabel={SUBJECT_LABEL[analysisSubject]}
          entries={insightEntries}
          gradeLevel={activeProfile.gradeLevel}
          teacherNote={teacherNote}
          groupName={activeProfile.displayName}
          analysisMode="student_personalized"
          studentName={activeProfile.key === UNLABELED_STUDENT_KEY ? "" : activeProfile.displayName}
          dialogTitle={`${activeProfile.displayName} · 个性化学情`}
        />
      ) : null}
    </div>
  );
}
