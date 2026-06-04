import { useMemo, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Users } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { SimpleLineChart } from "@/components/molecules/SimpleLineChart";
import { SimpleRadarChart } from "@/components/molecules/SimpleRadarChart";
import {
  classOverviewStats,
  classScoreTrendPoints,
  classWeakRadarAxes,
  filterEntriesBySubject,
  parseAnalyticsSubject,
} from "@/lib/classAnalyticsInsights";
import type { GradingHistoryEntry } from "@/lib/gradingHistory";

type ClassOverviewPanelProps = {
  historyEntries: GradingHistoryEntry[];
};

/** 班级学情：整体得分趋势 + 维度雷达 */
export function ClassOverviewPanel({ historyEntries }: ClassOverviewPanelProps) {
  const [searchParams] = useSearchParams();
  const subject = parseAnalyticsSubject(searchParams.get("subject"));

  const entries = useMemo(
    () => filterEntriesBySubject(historyEntries, subject),
    [historyEntries, subject],
  );

  const stats = useMemo(() => classOverviewStats(entries), [entries]);
  const trend = useMemo(() => classScoreTrendPoints(entries), [entries]);
  const radar = useMemo(() => classWeakRadarAxes(entries, subject), [entries, subject]);

  if (entries.length === 0) {
    return (
      <div className="glass-panel rounded-2xl py-16 text-center">
        <p className="text-small font-semibold text-ink">暂无本机批改数据</p>
        <p className="mt-1 text-caption text-ink-muted">完成批改后，可在此查看班级整体趋势</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-small text-ink-muted">
        汇总当前学期范围内、所选学科的全部批改记录，展示班级整体得分走势与薄弱维度分布。
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="批改份数" value={String(stats.paperCount)} />
        <StatCard label="平均得分率" value={stats.avgScore != null ? `${stats.avgScore}%` : "—"} />
        <StatCard
          label="涉及学生"
          value={String(stats.studentCount)}
          icon={<Users className="h-4 w-4 text-primary" {...CUTE_ICON} aria-hidden />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-panel rounded-2xl p-4 md:p-5">
          <h3 className="text-small font-extrabold text-ink">得分走势</h3>
          <p className="mt-0.5 text-caption text-ink-muted">按批改时间先后展示最近若干次得分率</p>
          <SimpleLineChart className="mt-4" points={trend} height={160} />
        </section>
        <section className="glass-panel rounded-2xl p-4 md:p-5">
          <h3 className="text-small font-extrabold text-ink">维度分布</h3>
          <p className="mt-0.5 text-caption text-ink-muted">薄弱知识点频次或最近一份作业的答题结构</p>
          <SimpleRadarChart className="mt-2" axes={radar} size={220} />
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl bg-primary-tint/70 px-3 py-3 text-center ring-1 ring-primary/15">
      {icon ? <div className="mb-1 flex justify-center">{icon}</div> : null}
      <p className="text-caption text-ink-muted">{label}</p>
      <p className="text-2xl font-black tabular-nums text-ink">{value}</p>
    </div>
  );
}
