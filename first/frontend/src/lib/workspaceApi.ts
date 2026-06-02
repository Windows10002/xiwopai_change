import { apiFetch, parseApiJson, type ApiJson } from "@/lib/apiClient";
import type { GradingResultDetail } from "@/types/grading";
import { mapApiResultToDetail } from "@/lib/gradeApi";

export type WorkspaceAssignment = {
  id: string;
  teacher_sub: string;
  class_name: string;
  subject: "math" | "english";
  title: string;
  description: string;
  due_at: string;
  status: "draft" | "published";
  target_student_names: string[];
  created_at: string;
  published_at: string;
  submission_count?: number;
  published_count?: number;
};

export type WorkspaceGradingRecord = {
  id: string;
  submission_id: string;
  result: Record<string, unknown>;
  graded_by: string;
  teacher_override: boolean;
  published: boolean;
  version: number;
  created_at: string;
  updated_at: string;
};

export type WorkspaceVariantTask = {
  id: string;
  submission_id: string;
  knowledge_point: string;
  stem: string;
  answer_hint: string;
  status: "assigned" | "done";
  assigned_at: string;
  done_at: string;
};

export type WorkspaceSubmission = {
  id: string;
  assignment_id: string;
  teacher_sub: string;
  student_name: string;
  submitted_by_role: string;
  subject: "math" | "english";
  file_name: string;
  image_filename: string;
  image_url: string;
  status: string;
  grade_level: string;
  teacher_note: string;
  created_at: string;
  updated_at: string;
  published_at: string;
  correction_note: string;
  correction_review_status: string;
  score_percent?: number;
  grading_record?: WorkspaceGradingRecord | null;
  assignment?: WorkspaceAssignment | null;
  variant_tasks?: WorkspaceVariantTask[];
};

export function submissionToDetail(sub: WorkspaceSubmission): GradingResultDetail | null {
  const raw = sub.grading_record?.result;
  if (!raw || typeof raw !== "object") return null;
  return mapApiResultToDetail(sub.subject, raw as Record<string, unknown>);
}

export async function createAssignment(body: {
  subject: "math" | "english";
  title: string;
  description?: string;
  class_name?: string;
  due_at?: string;
  target_student_names?: string[];
  publish?: boolean;
}): Promise<WorkspaceAssignment> {
  const res = await apiFetch("/api/assignments", { method: "POST", body: JSON.stringify(body) });
  const json = await parseApiJson<ApiJson & { assignment?: WorkspaceAssignment }>(res);
  if (!json.assignment) throw new Error("创建任务失败");
  return json.assignment;
}

export async function fetchTeacherAssignments(): Promise<WorkspaceAssignment[]> {
  const res = await apiFetch("/api/assignments");
  const json = await parseApiJson<ApiJson & { items?: WorkspaceAssignment[] }>(res);
  return json.items ?? [];
}

export async function fetchStudentTodo(): Promise<{ todo: WorkspaceAssignment[]; assignments: WorkspaceAssignment[] }> {
  const res = await apiFetch("/api/assignments/my");
  const json = await parseApiJson<ApiJson & { todo?: WorkspaceAssignment[]; assignments?: WorkspaceAssignment[] }>(res);
  return { todo: json.todo ?? [], assignments: json.assignments ?? [] };
}

export async function publishAssignment(id: string): Promise<void> {
  const res = await apiFetch(`/api/assignments/${encodeURIComponent(id)}/publish`, { method: "POST" });
  await parseApiJson(res);
}

export async function submitAssignmentWork(
  assignmentId: string,
  file: File,
  opts?: { studentName?: string; gradeLevel?: string; autoPublish?: boolean },
): Promise<{ submission: WorkspaceSubmission | null; detail: GradingResultDetail | null; imageUrl: string }> {
  const body = new FormData();
  body.append("file", file);
  if (opts?.studentName) body.append("student_name", opts.studentName);
  if (opts?.gradeLevel) body.append("grade_level", opts.gradeLevel);
  body.append("auto_publish", opts?.autoPublish === false ? "0" : "1");
  const res = await apiFetch(`/api/assignments/${encodeURIComponent(assignmentId)}/submit`, {
    method: "POST",
    body,
  });
  const json = await parseApiJson<
    ApiJson & {
      submission?: WorkspaceSubmission;
      result?: Record<string, unknown>;
      image_url?: string;
      subject?: "math" | "english";
    }
  >(res);
  const subject = json.subject ?? json.submission?.subject ?? "math";
  const detail = json.result ? mapApiResultToDetail(subject, json.result) : submissionToDetail(json.submission!);
  return {
    submission: json.submission ?? null,
    detail,
    imageUrl: json.image_url ?? json.submission?.image_url ?? "",
  };
}

export async function fetchMySubmissions(): Promise<{
  items: WorkspaceSubmission[];
  variant_tasks: WorkspaceVariantTask[];
}> {
  const res = await apiFetch("/api/submissions/my");
  const json = await parseApiJson<
    ApiJson & { items?: WorkspaceSubmission[]; variant_tasks?: WorkspaceVariantTask[] }
  >(res);
  return { items: json.items ?? [], variant_tasks: json.variant_tasks ?? [] };
}

export async function fetchTeacherInbox(): Promise<{
  items: WorkspaceSubmission[];
  counts: { corrections_pending: number; unpublished_graded: number };
}> {
  const res = await apiFetch("/api/submissions/inbox");
  const json = await parseApiJson<
    ApiJson & {
      items?: WorkspaceSubmission[];
      counts?: { corrections_pending: number; unpublished_graded: number };
    }
  >(res);
  return {
    items: json.items ?? [],
    counts: json.counts ?? { corrections_pending: 0, unpublished_graded: 0 },
  };
}

export async function fetchSubmission(id: string): Promise<WorkspaceSubmission> {
  const res = await apiFetch(`/api/submissions/${encodeURIComponent(id)}`);
  const json = await parseApiJson<ApiJson & { submission?: WorkspaceSubmission }>(res);
  if (!json.submission) throw new Error("未找到作业");
  return json.submission;
}

export async function publishSubmissionToStudent(submissionId: string): Promise<WorkspaceSubmission> {
  const res = await apiFetch(`/api/submissions/${encodeURIComponent(submissionId)}/publish`, { method: "POST" });
  const json = await parseApiJson<ApiJson & { submission?: WorkspaceSubmission }>(res);
  if (!json.submission) throw new Error("发布失败");
  return json.submission;
}

export async function submitCorrection(submissionId: string, note?: string): Promise<void> {
  const res = await apiFetch(`/api/submissions/${encodeURIComponent(submissionId)}/correction`, {
    method: "POST",
    body: JSON.stringify({ note: note ?? "" }),
  });
  await parseApiJson(res);
}

export async function reviewCorrection(
  submissionId: string,
  action: "accept" | "reject",
  teacherReply?: string,
): Promise<void> {
  const res = await apiFetch(`/api/submissions/${encodeURIComponent(submissionId)}/correction/review`, {
    method: "POST",
    body: JSON.stringify({ action, teacher_reply: teacherReply ?? "" }),
  });
  await parseApiJson(res);
}

export async function assignVariantTasks(
  submissionId: string,
  tasks: Array<{ stem: string; knowledge_point?: string; answer_hint?: string }>,
): Promise<WorkspaceVariantTask[]> {
  const res = await apiFetch(`/api/submissions/${encodeURIComponent(submissionId)}/variants`, {
    method: "POST",
    body: JSON.stringify({ tasks }),
  });
  const json = await parseApiJson<ApiJson & { items?: WorkspaceVariantTask[] }>(res);
  return json.items ?? [];
}

export async function completeVariantTask(taskId: string): Promise<void> {
  const res = await apiFetch(`/api/variant-tasks/${encodeURIComponent(taskId)}/done`, { method: "POST" });
  await parseApiJson(res);
}

export async function fetchInboxCounts(): Promise<{ corrections_pending: number; unpublished_graded: number }> {
  const res = await apiFetch("/api/workspace/inbox-counts");
  const json = await parseApiJson<
    ApiJson & { corrections_pending?: number; unpublished_graded?: number }
  >(res);
  return {
    corrections_pending: json.corrections_pending ?? 0,
    unpublished_graded: json.unpublished_graded ?? 0,
  };
}
