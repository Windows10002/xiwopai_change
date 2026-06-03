import { saveGradingHistoryEntry, loadGradingHistory } from "@/lib/gradingHistory";
import { submissionToDetail, type WorkspaceSubmission } from "@/lib/workspaceApi";

const SYNCED_KEY = "seewo_pi_wrongbook_synced_submissions_v1";

function loadSyncedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SYNCED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function saveSyncedIds(ids: Set<string>) {
  try {
    localStorage.setItem(SYNCED_KEY, JSON.stringify([...ids].slice(-500)));
  } catch {
    /* ignore */
  }
}

/** 将已下发的作业批改结果写入本机批改历史，供错题本自动收录 */
export function syncWrongBookFromSubmission(sub: WorkspaceSubmission): boolean {
  if (sub.status !== "published") return false;
  const synced = loadSyncedIds();
  if (synced.has(sub.id)) return false;

  const detail = submissionToDetail(sub);
  if (!detail) return false;

  const subject = sub.subject === "english" ? "english" : "math";
  const historyId = `ws-${sub.id}`;
  const exists = loadGradingHistory().some((e) => e.id === historyId);
  if (!exists) {
    saveGradingHistoryEntry({
      id: historyId,
      subject,
      fileName: sub.file_name || "课堂试卷",
      displayTitle: sub.assignment?.title || sub.file_name || "课堂试卷",
      assignmentTitle: sub.assignment?.title,
      studentName: sub.student_name,
      detail,
    });
  }

  synced.add(sub.id);
  saveSyncedIds(synced);
  return true;
}

export function syncWrongBookFromSubmissions(subs: WorkspaceSubmission[]): number {
  let n = 0;
  for (const s of subs) {
    if (syncWrongBookFromSubmission(s)) n += 1;
  }
  return n;
}
