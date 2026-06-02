import type { GradingFeedbackPayload } from "@/lib/gradingFeedbackApi";

export type GradingDisputeStatus = "pending" | "confirmed" | "rejected";

export type GradingDispute = {
  id: string;
  created_at: string;
  status: GradingDisputeStatus;
  submitter_role: "student" | "teacher";
  student_grade?: number | null;
  feedback_scope: "question" | "whole_paper";
  subject: string;
  dimension_key?: string;
  dimension_label?: string;
  status_snapshot?: string;
  value?: number;
  max?: number;
  detail_excerpt?: string;
  user_feedback: string;
  job_file_base?: string;
  subject_title?: string;
  overall_label?: string;
  score_percent?: number;
  image_ref?: string;
  image_url?: string;
  history_entry_id?: string;
  local_file_name?: string;
  batch_index?: number;
  batch_total?: number;
  teacher_reply?: string;
  reviewed_at?: string;
};

const TRACKED_IDS_KEY = "grading_dispute_tracked_ids";

export function trackDisputeId(id: string): void {
  try {
    const raw = localStorage.getItem(TRACKED_IDS_KEY);
    const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!ids.includes(id)) {
      ids.unshift(id);
      localStorage.setItem(TRACKED_IDS_KEY, JSON.stringify(ids.slice(0, 80)));
    }
  } catch {
    /* ignore */
  }
}

export function getTrackedDisputeIds(): string[] {
  try {
    const raw = localStorage.getItem(TRACKED_IDS_KEY);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export type SubmitGradingDisputePayload = GradingFeedbackPayload & {
  submitter_role: "student";
  student_grade?: number | null;
};

export async function submitGradingDispute(payload: SubmitGradingDisputePayload): Promise<{ id: string }> {
  const res = await fetch("/api/grading-disputes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let body: { ok?: boolean; message?: string; id?: string } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    /* ignore */
  }
  if (!res.ok || !body.ok || !body.id) {
    throw new Error(body.message || `申诉提交失败（HTTP ${res.status}）`);
  }
  trackDisputeId(body.id);
  return { id: body.id };
}

export async function fetchGradingDisputes(opts?: {
  status?: GradingDisputeStatus;
  ids?: string[];
}): Promise<GradingDispute[]> {
  const q = new URLSearchParams();
  if (opts?.status) q.set("status", opts.status);
  if (opts?.ids?.length) q.set("ids", opts.ids.join(","));
  const res = await fetch(`/api/grading-disputes?${q.toString()}`);
  let body: { ok?: boolean; message?: string; items?: GradingDispute[] } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    /* ignore */
  }
  if (!res.ok || !body.ok) {
    throw new Error(body.message || `加载申诉失败（HTTP ${res.status}）`);
  }
  return body.items ?? [];
}

export async function reviewGradingDispute(
  id: string,
  action: "confirm" | "reject",
  teacherReply?: string,
): Promise<void> {
  const res = await fetch(`/api/grading-disputes/${encodeURIComponent(id)}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, teacher_reply: teacherReply ?? "" }),
  });
  let body: { ok?: boolean; message?: string } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    /* ignore */
  }
  if (!res.ok || !body.ok) {
    throw new Error(body.message || `审核失败（HTTP ${res.status}）`);
  }
}
