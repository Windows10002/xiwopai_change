import type { GradingHistoryEntry } from "@/lib/gradingHistory";
import { historyToInsightEntries } from "@/lib/studentLearningAnalytics";
import { aggregateBatchLocally } from "@/lib/gradingBatchInsights";
import { listStudentProfiles, UNLABELED_STUDENT_KEY } from "@/lib/studentLearningAnalytics";

export type AnalyticsSubjectFilter = "all" | "math" | "english" | "chinese";

export function parseAnalyticsSubject(raw: string | null): AnalyticsSubjectFilter {
  if (raw === "math" || raw === "english" || raw === "chinese") return raw;
  return "all";
}

export function filterEntriesBySubject(
  entries: GradingHistoryEntry[],
  subject: AnalyticsSubjectFilter,
): GradingHistoryEntry[] {
  if (subject === "all") return entries;
  if (subject === "chinese") return entries.filter((e) => e.subject === "chinese");
  return entries.filter((e) => e.subject === subject);
}

export function classOverviewStats(entries: GradingHistoryEntry[]) {
  const profiles = listStudentProfiles(entries);
  const scores = entries.map((e) => e.detail.scorePercent);
  const avg =
    scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
  return {
    paperCount: entries.length,
    studentCount: profiles.filter((p) => p.key !== UNLABELED_STUDENT_KEY).length,
    avgScore: avg,
  };
}

export function classScoreTrendPoints(entries: GradingHistoryEntry[], maxPoints = 12) {
  const sorted = [...entries].sort((a, b) => a.createdAt - b.createdAt);
  const slice = sorted.slice(-maxPoints);
  return slice.map((e, i) => {
    const d = new Date(e.createdAt);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    return { label: slice.length <= 6 ? label : `${i + 1}`, value: e.detail.scorePercent };
  });
}

export function classWeakRadarAxes(entries: GradingHistoryEntry[], subject: AnalyticsSubjectFilter) {
  const batchSubject: "math" | "english" =
    subject === "english" ? "english" : subject === "chinese" ? "math" : "math";
  const filtered =
    subject === "all"
      ? entries
      : subject === "chinese"
        ? entries.filter((e) => e.subject === "chinese")
        : entries.filter((e) => e.subject === subject);
  if (filtered.length === 0) return [];

  const insight = historyToInsightEntries(filtered);
  const local = aggregateBatchLocally(batchSubject, insight);
  const weak = local.stats?.weak_knowledge_ranked ?? [];
  if (weak.length >= 3) {
    return weak.slice(0, 6).map((w) => ({
      label: w.tag.length > 8 ? `${w.tag.slice(0, 8)}…` : w.tag,
      value: w.count,
      max: Math.max(...weak.map((x) => x.count), 1),
    }));
  }

  const latest = filtered[0]?.detail.dimensions ?? [];
  if (latest.length >= 3) {
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
}

export type WeakTagRow = {
  tag: string;
  count: number;
  share: number;
  subject: "math" | "english" | "chinese";
};

export function weakKnowledgeRanking(
  entries: GradingHistoryEntry[],
  limit = 12,
  subjectFilter: AnalyticsSubjectFilter = "all",
): WeakTagRow[] {
  const filtered =
    subjectFilter === "all" ? entries : entries.filter((e) => e.subject === subjectFilter);
  const map = new Map<string, { count: number; subject: WeakTagRow["subject"] }>();
  for (const e of filtered) {
    const subj = e.subject === "english" ? "english" : e.subject === "chinese" ? "chinese" : "math";
    for (const t of e.detail.weakKnowledgeTags ?? []) {
      const tag = t.trim();
      if (!tag) continue;
      const key = `${subj}::${tag}`;
      const prev = map.get(key);
      map.set(key, { count: (prev?.count ?? 0) + 1, subject: subj });
    }
  }
  const subjectTotal: Record<WeakTagRow["subject"], number> = {
    math: filtered.filter((e) => e.subject === "math").length || 0,
    english: filtered.filter((e) => e.subject === "english").length || 0,
    chinese: filtered.filter((e) => e.subject === "chinese").length || 0,
  };
  return [...map.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([key, { count, subject }]) => {
      const tag = key.split("::").slice(1).join("::");
      const denom = subjectTotal[subject] || filtered.length || 1;
      return { tag, count, share: Math.round((count / denom) * 100), subject };
    });
}

export function weakKnowledgeBySubject(entries: GradingHistoryEntry[]) {
  return {
    math: weakKnowledgeRanking(entries, 8, "math"),
    english: weakKnowledgeRanking(entries, 8, "english"),
    chinese: weakKnowledgeRanking(entries, 8, "chinese"),
  };
}

export function weakTagTrendSeries(
  entries: GradingHistoryEntry[],
  tag: string,
  subject: WeakTagRow["subject"],
) {
  const sorted = [...entries]
    .filter((e) => e.subject === subject)
    .sort((a, b) => a.createdAt - b.createdAt);
  if (sorted.length < 2) return [];

  const bucketCount = Math.min(6, Math.max(2, Math.ceil(sorted.length / 3)));
  const bucketSize = Math.max(1, Math.ceil(sorted.length / bucketCount));
  const buckets: GradingHistoryEntry[][] = [];
  for (let i = 0; i < sorted.length; i += bucketSize) {
    buckets.push(sorted.slice(i, i + bucketSize));
  }

  return buckets.map((bucket, bi) => {
    let c = 0;
    for (const e of bucket) {
      if ((e.detail.weakKnowledgeTags ?? []).some((t) => t.trim() === tag)) c += 1;
    }
    const start = bucket[0];
    const d = start ? new Date(start.createdAt) : new Date();
    const label = buckets.length <= 4 ? `${d.getMonth() + 1}/${d.getDate()}` : `段${bi + 1}`;
    return { label, value: c };
  });
}
