import { loadGradingHistory, type GradingHistoryEntry } from "@/lib/gradingHistory";

const DISMISSED_KEY = "wrong_book_dismissed_v1";
const CORRECTED_KEY = "wrong_book_corrected_v1";

const WRONG_STATUSES = new Set(["错误", "未作答"]);

export type WrongBookItem = {
  id: string;
  historyEntryId: string;
  subject: "math" | "english";
  createdAt: number;
  fileName: string;
  questionLabel: string;
  status: string;
  scoreText: string;
  detail?: string;
  weakKnowledgeTags: string[];
  groupName?: string;
  /** 学生已标记订正完成 */
  corrected?: boolean;
};

function loadDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

function loadCorrectedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CORRECTED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function saveCorrectedIds(ids: Set<string>) {
  try {
    localStorage.setItem(CORRECTED_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

export function markWrongBookCorrected(id: string) {
  const next = loadCorrectedIds();
  next.add(id);
  saveCorrectedIds(next);
}

export function unmarkWrongBookCorrected(id: string) {
  const next = loadCorrectedIds();
  next.delete(id);
  saveCorrectedIds(next);
}

export function dismissWrongBookItem(id: string) {
  const next = loadDismissedIds();
  next.add(id);
  saveDismissedIds(next);
}

export function restoreWrongBookItem(id: string) {
  const next = loadDismissedIds();
  next.delete(id);
  saveDismissedIds(next);
}

export function extractWrongBookItems(entries: GradingHistoryEntry[]): WrongBookItem[] {
  const items: WrongBookItem[] = [];
  for (const entry of entries) {
    for (const dim of entry.detail.dimensions) {
      const status = (dim.status ?? "").trim();
      if (!status || !WRONG_STATUSES.has(status)) continue;
      items.push({
        id: `${entry.id}:${dim.key}`,
        historyEntryId: entry.id,
        subject: entry.subject,
        createdAt: entry.createdAt,
        fileName: entry.fileName,
        questionLabel: dim.label,
        status,
        scoreText: `${dim.value}/${dim.max}`,
        detail: dim.detail,
        weakKnowledgeTags: entry.detail.weakKnowledgeTags ?? [],
        groupName: entry.groupName,
      });
    }
  }
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export function loadWrongBookItems(opts?: { includeCorrected?: boolean; tag?: string }): WrongBookItem[] {
  const dismissed = loadDismissedIds();
  const corrected = loadCorrectedIds();
  let items = extractWrongBookItems(loadGradingHistory())
    .filter((item) => !dismissed.has(item.id))
    .map((item) => ({ ...item, corrected: corrected.has(item.id) }));
  if (!opts?.includeCorrected) {
    items = items.filter((item) => !item.corrected);
  }
  if (opts?.tag?.trim()) {
    const t = opts.tag.trim().toLowerCase();
    items = items.filter((item) => item.weakKnowledgeTags.some((k) => k.toLowerCase().includes(t)));
  }
  return items;
}

export function listWrongBookTags(): string[] {
  const set = new Set<string>();
  for (const item of extractWrongBookItems(loadGradingHistory())) {
    for (const tag of item.weakKnowledgeTags) {
      const t = tag.trim();
      if (t) set.add(t);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

export function countWrongBookItems(): number {
  return loadWrongBookItems().length;
}

export function subjectLabelCn(subject: WrongBookItem["subject"]): string {
  return subject === "math" ? "数学" : "英语";
}

export function formatWrongBookDate(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
