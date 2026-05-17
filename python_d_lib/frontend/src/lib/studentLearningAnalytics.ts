import type { GradingHistoryEntry } from "@/lib/gradingHistory";
import { loadGradingHistory } from "@/lib/gradingHistory";
import type { GradingResultDetail } from "@/types/grading";

export const UNLABELED_STUDENT_KEY = "__unlabeled__";

export type StudentProfile = {
  key: string;
  displayName: string;
  paperCount: number;
  mathCount: number;
  englishCount: number;
  avgScorePercent: number | null;
  latestAt: number;
  gradeLevel?: string;
  entryIds: string[];
};

export type SubjectFilter = "all" | "math" | "english";

export function normalizeStudentKey(name: string | undefined): { key: string; displayName: string } {
  const t = (name ?? "").trim();
  if (!t) return { key: UNLABELED_STUDENT_KEY, displayName: "未标注学生" };
  return { key: t.toLowerCase(), displayName: t };
}

export function listStudentProfiles(entries: GradingHistoryEntry[] = loadGradingHistory()): StudentProfile[] {
  const map = new Map<string, StudentProfile>();

  for (const e of entries) {
    const { key, displayName } = normalizeStudentKey(e.studentName);
    let p = map.get(key);
    if (!p) {
      p = {
        key,
        displayName,
        paperCount: 0,
        mathCount: 0,
        englishCount: 0,
        avgScorePercent: null,
        latestAt: 0,
        gradeLevel: e.gradeLevel,
        entryIds: [],
      };
      map.set(key, p);
    }
    p.paperCount += 1;
    if (e.subject === "math") p.mathCount += 1;
    else p.englishCount += 1;
    p.entryIds.push(e.id);
    if (e.createdAt > p.latestAt) {
      p.latestAt = e.createdAt;
      if (e.gradeLevel) p.gradeLevel = e.gradeLevel;
    }
  }

  for (const p of map.values()) {
    const scores: number[] = [];
    for (const id of p.entryIds) {
      const ent = entries.find((x) => x.id === id);
      if (ent) scores.push(ent.detail.scorePercent);
    }
    if (scores.length) {
      p.avgScorePercent = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.key === UNLABELED_STUDENT_KEY) return 1;
    if (b.key === UNLABELED_STUDENT_KEY) return -1;
    return b.latestAt - a.latestAt;
  });
}

export function filterHistoryByStudent(
  studentKey: string,
  subject: SubjectFilter = "all",
  entries: GradingHistoryEntry[] = loadGradingHistory(),
): GradingHistoryEntry[] {
  return entries
    .filter((e) => {
      const { key } = normalizeStudentKey(e.studentName);
      if (key !== studentKey) return false;
      if (subject !== "all" && e.subject !== subject) return false;
      return true;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function historyToInsightEntries(
  entries: GradingHistoryEntry[],
): Array<{ fileName: string; detail: GradingResultDetail }> {
  return entries.map((e) => ({
    fileName: e.groupName ? `${e.groupName} · ${e.fileName}` : e.fileName,
    detail: e.detail,
  }));
}

export function formatStudentDate(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
