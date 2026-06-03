import type { GradingResultDetail } from "@/types/grading";

const key = (subject: string) => `grading_live_draft_v1_${subject}`;

export type GradingLiveDraftItem = {
  historyEntryId: string;
  fileName: string;
  detail: GradingResultDetail;
  imageUrl?: string;
};

export type GradingLiveDraft = {
  /** 与 Flask 同源的预览地址，如 /uploads/xxx.jpg */
  imageUrl: string;
  /** 对应 `saveGradingHistoryEntry` 的 id，用于刷新后从 IndexedDB 恢复原图 */
  historyEntryId?: string;
  detail: GradingResultDetail;
  step: number;
  fileName: string;
  savedAt: number;
  /** 文件夹/多图批改：每条记录独立存图，刷新后可切换预览 */
  batchItems?: GradingLiveDraftItem[];
  currentIndex?: number;
  groupKey?: string;
  groupName?: string;
};

export function saveGradingLiveDraft(subject: string, draft: GradingLiveDraft): void {
  try {
    sessionStorage.setItem(key(subject), JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function loadGradingLiveDraft(subject: string): GradingLiveDraft | null {
  try {
    const raw = sessionStorage.getItem(key(subject));
    if (!raw) return null;
    const o = JSON.parse(raw) as GradingLiveDraft;
    if (!o?.detail) return null;
    if (!o.imageUrl && !o.historyEntryId && !(o.batchItems?.length)) return null;
    return o;
  } catch {
    return null;
  }
}

export function clearGradingLiveDraft(subject: string): void {
  try {
    sessionStorage.removeItem(key(subject));
  } catch {
    /* ignore */
  }
}
