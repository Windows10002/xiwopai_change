import type { GradingResultDetail } from "@/types/grading";

const STORAGE_KEY = "grading_history_v1";
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 400;

export type GradingHistoryEntry = {
  id: string;
  createdAt: number;
  subject: "math" | "english";
  fileName: string;
  /** 教师批改时标注的学生姓名，用于个性化学情汇总 */
  studentName?: string;
  /** 批改时选择的年级/学段 */
  gradeLevel?: string;
  detail: GradingResultDetail;
  /** 本地 JPEG 缩略图 data URL，体积尽量控制以便 localStorage */
  thumbDataUrl?: string;
  /** 同一次「文件夹批量批改」共用同一 key，用于历史列表合并展示 */
  groupKey?: string;
  /** 文件夹上传时由 webkitRelativePath 推断的文件夹名，用于历史列表标题 */
  groupName?: string;
  groupIndex?: number;
  groupSize?: number;
};

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function prune(entries: GradingHistoryEntry[]): GradingHistoryEntry[] {
  const now = Date.now();
  const minTs = now - MAX_AGE_MS;
  return entries
    .filter((e) => e.createdAt >= minTs)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_ENTRIES);
}

export function loadGradingHistory(): GradingHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return prune(parsed as GradingHistoryEntry[]);
  } catch {
    return [];
  }
}

export function saveGradingHistoryEntry(
  entry: Omit<GradingHistoryEntry, "id" | "createdAt"> & { id?: string; createdAt?: number }
): GradingHistoryEntry {
  const full: GradingHistoryEntry = {
    id: entry.id ?? randomId(),
    createdAt: entry.createdAt ?? Date.now(),
    subject: entry.subject,
    fileName: entry.fileName,
    detail: entry.detail,
    thumbDataUrl: entry.thumbDataUrl,
    groupKey: entry.groupKey,
    groupName: entry.groupName,
    groupIndex: entry.groupIndex,
    groupSize: entry.groupSize,
  };
  const prev = loadGradingHistory().filter((e) => e.id !== full.id);
  const next = prune([full, ...prev]);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    const withoutThumb: GradingHistoryEntry = { ...full, thumbDataUrl: undefined };
    const nextNoThumb = prune([withoutThumb, ...prev]);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextNoThumb));
    } catch {
      const trimmed = nextNoThumb.slice(0, Math.floor(MAX_ENTRIES / 2));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch {
        /* ignore quota */
      }
    }
  }
  return full;
}

export function deleteGradingHistoryEntry(id: string): void {
  const next = loadGradingHistory().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/** 删除同一文件夹批量批改产生的全部条目，返回被删 id */
export function deleteGradingHistoryGroup(groupKey: string): string[] {
  const prev = loadGradingHistory();
  const removed = prev.filter((e) => e.groupKey === groupKey).map((e) => e.id);
  const next = prev.filter((e) => e.groupKey !== groupKey);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return removed;
}

export type HistoryRowSingle = { type: "single"; entry: GradingHistoryEntry };
export type HistoryRowGroup = {
  type: "group";
  groupKey: string;
  items: GradingHistoryEntry[];
  createdAt: number;
  groupName?: string;
};
export type HistoryDisplayRow = HistoryRowSingle | HistoryRowGroup;

/** 将带 groupKey 的条目合并为一条「文件夹批改」展示行 */
export function buildGroupedHistoryRows(entries: GradingHistoryEntry[]): HistoryDisplayRow[] {
  const groupMap = new Map<string, GradingHistoryEntry[]>();
  const singles: GradingHistoryEntry[] = [];
  for (const e of entries) {
    if (e.groupKey) {
      const arr = groupMap.get(e.groupKey) ?? [];
      arr.push(e);
      groupMap.set(e.groupKey, arr);
    } else {
      singles.push(e);
    }
  }
  const rows: HistoryDisplayRow[] = [];
  for (const [gk, items] of groupMap) {
    items.sort((a, b) => (a.groupIndex ?? 0) - (b.groupIndex ?? 0));
    const createdAt = Math.max(...items.map((i) => i.createdAt));
    const groupName = items[0]?.groupName?.trim();
    rows.push({ type: "group", groupKey: gk, items, createdAt, groupName: groupName || undefined });
  }
  for (const e of singles) {
    rows.push({ type: "single", entry: e });
  }
  rows.sort((a, b) => {
    const ta = a.type === "group" ? a.createdAt : a.entry.createdAt;
    const tb = b.type === "group" ? b.createdAt : b.entry.createdAt;
    return tb - ta;
  });
  return rows;
}

export function clearGradingHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** 仅移除某一学科的历史，其它学科记录保留；返回被移除条目的 id（便于同步清理 IndexedDB 原图） */
export function clearGradingHistoryForSubject(subject: "math" | "english"): string[] {
  const prev = loadGradingHistory();
  const removed = prev.filter((e) => e.subject === subject).map((e) => e.id);
  const next = prev.filter((e) => e.subject !== subject);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return removed;
}
