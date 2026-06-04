import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { SimpleLineChart } from "@/components/molecules/SimpleLineChart";
import {
  filterEntriesBySubject,
  parseAnalyticsSubject,
  weakKnowledgeBySubject,
  weakKnowledgeRanking,
  weakTagTrendSeries,
  type WeakTagRow,
} from "@/lib/classAnalyticsInsights";
import type { GradingHistoryEntry } from "@/lib/gradingHistory";

const SUBJECT_BADGE = {
  math: { label: "数学", className: "bg-sky-100 text-sky-900 ring-sky-200/80" },
  english: { label: "英语", className: "bg-indigo-100 text-indigo-900 ring-indigo-200/80" },
  chinese: { label: "语文", className: "bg-amber-100 text-amber-950 ring-amber-200/80" },
} as const;

type WeakKnowledgeTrendPanelProps = {
  historyEntries: GradingHistoryEntry[];
};

/** 薄弱趋势：按学科分开展示排行，可选查看频次走势 */
export function WeakKnowledgeTrendPanel({ historyEntries }: WeakKnowledgeTrendPanelProps) {
  const [searchParams] = useSearchParams();
  const subjectFilter = parseAnalyticsSubject(searchParams.get("subject"));
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const entries = useMemo(
    () => filterEntriesBySubject(historyEntries, subjectFilter),
    [historyEntries, subjectFilter],
  );

  const bySubject = useMemo(() => weakKnowledgeBySubject(entries), [entries]);
  const singleList = useMemo(
    () => (subjectFilter === "all" ? [] : weakKnowledgeRanking(entries, 12, subjectFilter)),
    [entries, subjectFilter],
  );

  const focusRow = useMemo((): WeakTagRow | null => {
    if (!focusKey) return null;
    const all =
      subjectFilter === "all"
        ? [...bySubject.math, ...bySubject.english, ...bySubject.chinese]
        : singleList;
    return all.find((r) => `${r.subject}::${r.tag}` === focusKey) ?? null;
  }, [focusKey, bySubject, singleList, subjectFilter]);

  const trendPoints = useMemo(() => {
    if (!focusRow || entries.length < 3) return [];
    return weakTagTrendSeries(entries, focusRow.tag, focusRow.subject);
  }, [focusRow, entries]);

  const hasTrend = trendPoints.length >= 2 && trendPoints.some((p) => p.value > 0);

  if (entries.length === 0) {
    return (
      <div className="glass-panel rounded-2xl py-16 text-center">
        <p className="text-small font-semibold text-ink">暂无薄弱点数据</p>
        <p className="mt-1 text-caption text-ink-muted">请先完成批改，或切换学科筛选查看其它记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-small text-ink-muted">
        统计所选学科范围内批改记录的薄弱知识点；「全部」时分数学 / 英语 / 语文三栏展示，避免混排。
      </p>

      {subjectFilter === "all" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <WeakRankCard
            title="数学薄弱点"
            rows={bySubject.math}
            entryCount={entries.filter((e) => e.subject === "math").length}
            focusKey={focusKey}
            onFocus={setFocusKey}
          />
          <WeakRankCard
            title="英语薄弱点"
            rows={bySubject.english}
            entryCount={entries.filter((e) => e.subject === "english").length}
            focusKey={focusKey}
            onFocus={setFocusKey}
          />
          <WeakRankCard
            title="语文薄弱点"
            rows={bySubject.chinese}
            entryCount={entries.filter((e) => e.subject === "chinese").length}
            focusKey={focusKey}
            onFocus={setFocusKey}
          />
        </div>
      ) : (
        <WeakRankCard
          title={
            subjectFilter === "math" ? "数学薄弱点" : subjectFilter === "english" ? "英语薄弱点" : "语文薄弱点"
          }
          rows={singleList}
          entryCount={entries.length}
          focusKey={focusKey}
          onFocus={setFocusKey}
        />
      )}

      {focusRow && hasTrend ? (
        <section className="glass-panel rounded-2xl p-4 md:p-5">
          <h3 className="text-small font-extrabold text-ink">
            频次走势 · {SUBJECT_BADGE[focusRow.subject].label} · {focusRow.tag}
          </h3>
          <p className="mt-0.5 text-caption text-ink-muted">按时间分段统计该知识点出现次数（需至少 3 条同学科记录）</p>
          <SimpleLineChart className="mt-4" points={trendPoints} height={140} unit="次" scale="count" />
        </section>
      ) : focusRow ? (
        <p className="text-caption text-ink-muted">该知识点记录较少，暂无法绘制走势（需更多同学科批改记录）</p>
      ) : (
        <p className="text-caption text-ink-muted">点击排行中的知识点可查看频次走势</p>
      )}
    </div>
  );
}

function WeakRankCard({
  title,
  rows,
  entryCount,
  focusKey,
  onFocus,
}: {
  title: string;
  rows: WeakTagRow[];
  entryCount: number;
  focusKey: string | null;
  onFocus: (key: string | null) => void;
}) {
  return (
    <section className="glass-panel rounded-2xl p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-small font-extrabold text-ink">{title}</h3>
        <span className="text-[0.65rem] text-ink-muted">{entryCount} 份批改</span>
      </div>
      {entryCount === 0 ? (
        <p className="mt-4 text-caption text-ink-muted">该学科暂无批改记录</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-caption text-ink-muted">暂无薄弱知识点标注</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {rows.map((row, i) => {
            const key = `${row.subject}::${row.tag}`;
            const active = focusKey === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onFocus(active ? null : key)}
                  className={`w-full rounded-xl px-2.5 py-2 text-left transition ${
                    active ? "bg-primary-tint ring-1 ring-primary/25" : "hover:bg-black/[0.03]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-caption">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="shrink-0 font-bold text-ink-muted">{i + 1}.</span>
                      <span className={`shrink-0 rounded px-1 py-0.5 text-[0.6rem] font-bold ring-1 ${SUBJECT_BADGE[row.subject].className}`}>
                        {SUBJECT_BADGE[row.subject].label}
                      </span>
                      <span className="truncate font-semibold text-ink">{row.tag}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-ink-muted">
                      {row.count} 次 · {row.share}%
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/[0.06]">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, (row.count / Math.max(...rows.map((r) => r.count), 1)) * 100)}%` }}
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
