import type { GradingHistoryEntry } from "@/lib/gradingHistory";
import { loadGradingHistory } from "@/lib/gradingHistory";
import type { GradingResultDetail } from "@/types/grading";
import { buildBatchInsightItems } from "@/lib/gradingBatchInsights";

export type ClassGroupSummary = {
  groupKey: string;
  groupName: string;
  subject: "math" | "english" | "mixed";
  paperCount: number;
  avgScorePercent: number | null;
  latestAt: number;
  entryIds: string[];
};

export function listClassGroups(entries: GradingHistoryEntry[] = loadGradingHistory()): ClassGroupSummary[] {
  const map = new Map<string, ClassGroupSummary>();

  for (const e of entries) {
    const gk = e.groupKey ?? `single:${e.id}`;
    const gn = e.groupName ?? e.fileName;
    let g = map.get(gk);
    if (!g) {
      g = {
        groupKey: gk,
        groupName: gn,
        subject: e.subject,
        paperCount: 0,
        avgScorePercent: null,
        latestAt: 0,
        entryIds: [],
      };
      map.set(gk, g);
    }
    g.paperCount += 1;
    g.entryIds.push(e.id);
    if (e.subject !== g.subject && g.subject !== "mixed") g.subject = "mixed";
    if (e.createdAt > g.latestAt) {
      g.latestAt = e.createdAt;
      g.groupName = gn;
    }
  }

  for (const g of map.values()) {
    const scores: number[] = [];
    for (const id of g.entryIds) {
      const ent = entries.find((x) => x.id === id);
      if (ent) scores.push(ent.detail.scorePercent);
    }
    if (scores.length) {
      g.avgScorePercent = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    }
  }

  return [...map.values()]
    .filter((g) => g.paperCount >= 1)
    .sort((a, b) => b.latestAt - a.latestAt);
}

export function entriesForGroup(
  groupKey: string,
  entries: GradingHistoryEntry[] = loadGradingHistory(),
): GradingHistoryEntry[] {
  return entries.filter((e) => (e.groupKey ?? `single:${e.id}`) === groupKey).sort((a, b) => b.createdAt - a.createdAt);
}

export function groupToInsightEntries(
  groupKey: string,
  subject: "math" | "english",
  entries: GradingHistoryEntry[] = loadGradingHistory(),
): Array<{ fileName: string; detail: GradingResultDetail }> {
  const rows = entriesForGroup(groupKey, entries).filter((e) => e.subject === subject);
  return rows.map((e) => ({
    fileName: e.fileName,
    detail: e.detail,
  }));
}

export function groupInsightPayload(
  subject: "math" | "english",
  items: Array<{ fileName: string; detail: GradingResultDetail }>,
) {
  return buildBatchInsightItems(subject, items);
}
