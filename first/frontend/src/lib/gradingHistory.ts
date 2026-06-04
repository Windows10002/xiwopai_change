import type { GradingResultDetail } from "@/types/grading";

const STORAGE_KEY = "grading_history_v1";
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 400;

export const GRADING_HISTORY_CHANGED = "grading-history-changed";

const GRADING_HISTORY_BROADCAST = "seewo-pi-grading-history-v1";

let gradingHistoryBroadcast: BroadcastChannel | null = null;

function getGradingHistoryBroadcast(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!gradingHistoryBroadcast) gradingHistoryBroadcast = new BroadcastChannel(GRADING_HISTORY_BROADCAST);
  return gradingHistoryBroadcast;
}

function emitHistoryChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(GRADING_HISTORY_CHANGED));
  try {
    getGradingHistoryBroadcast()?.postMessage({ t: Date.now() });
  } catch {
    /* ignore */
  }
}

/** 订阅本机批改历史变更（含其它标签页的批改/错题同步） */
export function subscribeGradingHistoryChanged(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = () => onChange();
  window.addEventListener(GRADING_HISTORY_CHANGED, handler);

  const ch = getGradingHistoryBroadcast();
  const onMessage = () => onChange();
  ch?.addEventListener("message", onMessage);

  const onFocus = () => onChange();
  window.addEventListener("focus", onFocus);

  return () => {
    window.removeEventListener(GRADING_HISTORY_CHANGED, handler);
    ch?.removeEventListener("message", onMessage);
    window.removeEventListener("focus", onFocus);
  };
}

export type GradingHistoryEntry = {
  id: string;
  createdAt: number;
  subject: "math" | "english" | "chinese";
  fileName: string;
  /** 重命名后的展示标题（优先于 fileName） */
  displayTitle?: string;
  /** 关联任务/文件夹名称 */
  assignmentTitle?: string;
  /** 作业管理任务 id（服务端） */
  assignmentId?: string;
  /** 学生提交 id（服务端，与 workspace 同步） */
  submissionId?: string;
  /** 任务班级名快照 */
  className?: string;
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
    displayTitle: entry.displayTitle,
    assignmentTitle: entry.assignmentTitle,
    assignmentId: entry.assignmentId,
    submissionId: entry.submissionId,
    className: entry.className,
    studentName: entry.studentName,
    gradeLevel: entry.gradeLevel,
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
  emitHistoryChanged();
  return full;
}

export function historyEntryTitle(entry: GradingHistoryEntry): string {
  return entry.displayTitle?.trim() || entry.fileName;
}

export function updateGradingHistoryEntry(
  id: string,
  patch: Partial<
    Pick<
      GradingHistoryEntry,
      | "fileName"
      | "displayTitle"
      | "assignmentTitle"
      | "assignmentId"
      | "submissionId"
      | "className"
      | "studentName"
      | "gradeLevel"
      | "detail"
    >
  >,
): GradingHistoryEntry | null {
  const prev = loadGradingHistory();
  const idx = prev.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  const next = [...prev];
  next[idx] = { ...next[idx]!, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prune(next)));
  } catch {
    return null;
  }
  emitHistoryChanged();
  return next[idx]!;
}

export function deleteGradingHistoryEntry(id: string): boolean {
  const next = prune(loadGradingHistory().filter((e) => e.id !== id));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emitHistoryChanged();
    return true;
  } catch {
    return false;
  }
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
  emitHistoryChanged();
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

/** 从列表行取代表条目（用于按学科跳转批改页） */
export function historyEntryFromRow(row: HistoryDisplayRow): GradingHistoryEntry | undefined {
  return row.type === "single" ? row.entry : row.items[0];
}

/** 同一文件夹批改组内的全部记录（按 groupIndex 排序） */
export function loadGradingHistoryGroup(groupKey: string, subject?: GradingHistoryEntry["subject"]): GradingHistoryEntry[] {
  return loadGradingHistory()
    .filter((e) => e.groupKey === groupKey && (!subject || e.subject === subject))
    .sort((a, b) => (a.groupIndex ?? 0) - (b.groupIndex ?? 0) || a.createdAt - b.createdAt);
}

/** 打开历史时：单条返回自身，文件夹批改返回整组 */
export function entriesForHistoryApply(entry: GradingHistoryEntry): GradingHistoryEntry[] {
  if (!entry.groupKey) return [entry];
  const group = loadGradingHistoryGroup(entry.groupKey, entry.subject);
  return group.length ? group : [entry];
}

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
  emitHistoryChanged();
}

/** 仅移除某一学科的历史，其它学科记录保留；返回被移除条目的 id（便于同步清理 IndexedDB 原图） */
export function clearGradingHistoryForSubject(subject: "math" | "english" | "chinese"): string[] {
  const prev = loadGradingHistory();
  const removed = prev.filter((e) => e.subject === subject).map((e) => e.id);
  const next = prev.filter((e) => e.subject !== subject);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  emitHistoryChanged();
  return removed;
}
