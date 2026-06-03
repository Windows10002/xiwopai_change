import { apiFetch, parseApiJson, type ApiJson } from "@/lib/apiClient";
import type { GradingResultDetail } from "@/types/grading";
import { mapApiResultToDetail } from "@/lib/gradeApi";

export type WorkspaceSubject = "math" | "english" | "chinese";

export type WorkspaceAssignment = {
  id: string;
  teacher_sub: string;
  class_name: string;
  subject: WorkspaceSubject;
  title: string;
  description: string;
  due_at: string;
  status: "draft" | "published";
  target_student_names: string[];
  answer_key?: string;
  answer_key_image?: string;
  answer_key_image_url?: string;
  send_answer_to_parent?: boolean;
  created_at: string;
  published_at: string;
  submission_count?: number;
  published_count?: number;
  /** 是否已过截止时间 */
  is_overdue?: boolean;
  /** 教师是否开放截止后补交 */
  allow_late_submit?: boolean;
  /** 学生当前是否允许交卷 */
  can_submit?: boolean;
  /** 截止前可重交 */
  resubmit_allowed?: boolean;
  submission_id?: string;
  max_submissions?: number;
  allowed_formats?: string[];
  scoring_rubric?: string;
  teacher_attachment_note?: string;
  teacher_attachment_image?: string;
  teacher_attachment_image_url?: string;
  notify_student_parent?: boolean;
  scheduled_publish_at?: string;
  notify_sent?: boolean;
  /** student | teacher | both */
  submission_mode?: "student" | "teacher" | "both";
  hide_answer_from_student?: boolean;
  answer_released_at?: string;
  answer_released?: boolean;
  answer_visible_to_student?: boolean;
  allows_student_submit?: boolean;
};

export type AssignmentPayload = {
  subject: WorkspaceSubject;
  title: string;
  description?: string;
  class_name: string;
  due_at: string;
  target_student_names: string[];
  answer_key?: string;
  answer_key_image?: string;
  clear_answer_key_image?: boolean;
  send_answer_to_parent?: boolean;
  publish?: boolean;
  max_submissions?: number;
  allowed_formats?: string[];
  scoring_rubric?: string;
  teacher_attachment_note?: string;
  teacher_attachment_image?: string;
  clear_teacher_attachment_image?: boolean;
  notify_student_parent?: boolean;
  scheduled_publish_at?: string;
  submission_mode?: "student" | "teacher" | "both";
  hide_answer_from_student?: boolean;
};

export type AssignmentUploadFiles = {
  answerKeyFile?: File | null;
  teacherAttachmentFile?: File | null;
};

export type AssignmentReportRow = {
  student_name: string;
  status: string;
  status_label?: string;
  score_percent?: number | null;
  submitted_at: string;
  updated_at: string;
  version_count: number;
  submission_id?: string;
  weak_points?: string[];
  comment_preview?: string;
  published_to_student?: boolean;
};

export type AssignmentReport = {
  assignment: WorkspaceAssignment;
  target_count: number;
  submitted: AssignmentReportRow[];
  not_submitted: string[];
  submission_rate: number;
  avg_score: number | null;
  notify_sent: boolean;
  pending_review_count?: number;
  unpublished_graded_count?: number;
  score_distribution?: Record<string, number>;
  weak_knowledge_ranked?: Array<{ name: string; count: number }>;
  answer_released?: boolean;
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
  subject: WorkspaceSubject;
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

export type InboxCounts = {
  corrections_pending: number;
  pending_review: number;
  unpublished_graded: number;
};

export function submissionToDetail(sub: WorkspaceSubmission): GradingResultDetail | null {
  const raw = sub.grading_record?.result;
  if (!raw || typeof raw !== "object") return null;
  return mapApiResultToDetail(sub.subject, raw as Record<string, unknown>);
}

function assignmentWriteRequestInit(
  body: AssignmentPayload | Partial<AssignmentPayload>,
  files?: AssignmentUploadFiles | null,
): RequestInit {
  if (files?.answerKeyFile || files?.teacherAttachmentFile) {
    const fd = new FormData();
    fd.append("payload", JSON.stringify(body));
    if (files.answerKeyFile) fd.append("answer_key_file", files.answerKeyFile);
    if (files.teacherAttachmentFile) fd.append("teacher_attachment_file", files.teacherAttachmentFile);
    return { body: fd };
  }
  return { body: JSON.stringify(body) };
}

export async function createAssignment(
  body: AssignmentPayload,
  files?: AssignmentUploadFiles | null,
): Promise<WorkspaceAssignment> {
  const res = await apiFetch("/api/assignments", {
    method: "POST",
    ...assignmentWriteRequestInit(body, files),
  });
  const json = await parseApiJson<ApiJson & { assignment?: WorkspaceAssignment }>(res);
  if (!json.assignment) throw new Error("创建任务失败");
  return json.assignment;
}

export async function updateAssignment(
  id: string,
  body: Partial<AssignmentPayload>,
  files?: AssignmentUploadFiles | null,
): Promise<WorkspaceAssignment> {
  const res = await apiFetch(`/api/assignments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    ...assignmentWriteRequestInit(body, files),
  });
  const json = await parseApiJson<ApiJson & { assignment?: WorkspaceAssignment }>(res);
  if (!json.assignment) throw new Error("更新任务失败");
  return json.assignment;
}

export async function deleteAssignment(id: string): Promise<void> {
  const res = await apiFetch(`/api/assignments/${encodeURIComponent(id)}`, { method: "DELETE" });
  await parseApiJson(res);
}

export async function setAssignmentLateSubmit(id: string, enabled: boolean): Promise<WorkspaceAssignment> {
  const res = await apiFetch(`/api/assignments/${encodeURIComponent(id)}/late-submit`, {
    method: "POST",
    body: JSON.stringify({ enabled }),
  });
  const json = await parseApiJson<ApiJson & { assignment?: WorkspaceAssignment }>(res);
  if (!json.assignment) throw new Error("操作失败");
  return json.assignment;
}

export async function fetchAssignmentReport(assignmentId: string): Promise<AssignmentReport> {
  const res = await apiFetch(`/api/assignments/${encodeURIComponent(assignmentId)}/report`);
  const json = await parseApiJson<ApiJson & { report?: AssignmentReport }>(res);
  if (!json.report) throw new Error("加载报告失败");
  return json.report;
}

export async function returnSubmissionForCorrection(
  submissionId: string,
  note?: string,
): Promise<WorkspaceSubmission> {
  const res = await apiFetch(`/api/submissions/${encodeURIComponent(submissionId)}/return`, {
    method: "POST",
    body: JSON.stringify({ note: note ?? "" }),
  });
  const json = await parseApiJson<ApiJson & { submission?: WorkspaceSubmission }>(res);
  if (!json.submission) throw new Error("退回失败");
  return json.submission;
}

export function exportReportCsv(report: AssignmentReport): string {
  const lines = ["学生,状态,得分,提交时间,版本数"];
  for (const row of report.submitted) {
    lines.push(
      [
        row.student_name,
        row.status,
        row.score_percent ?? "",
        row.submitted_at,
        row.version_count,
      ].join(","),
    );
  }
  if (report.not_submitted.length) {
    lines.push("");
    lines.push("未交名单");
    for (const name of report.not_submitted) {
      lines.push(`${name},未提交,,,`);
    }
  }
  return "\ufeff" + lines.join("\n");
}

export async function fetchTeacherAssignments(): Promise<WorkspaceAssignment[]> {
  const res = await apiFetch("/api/assignments");
  const json = await parseApiJson<ApiJson & { items?: WorkspaceAssignment[] }>(res);
  return json.items ?? [];
}

export async function fetchAllAssignments(): Promise<WorkspaceAssignment[]> {
  const res = await apiFetch("/api/assignments/all");
  const json = await parseApiJson<ApiJson & { items?: WorkspaceAssignment[] }>(res);
  return json.items ?? [];
}

export async function fetchParentAssignments(): Promise<{ child_name: string; items: WorkspaceAssignment[] }> {
  const res = await apiFetch("/api/assignments/parent");
  const json = await parseApiJson<
    ApiJson & { child_name?: string; items?: WorkspaceAssignment[] }
  >(res);
  return { child_name: json.child_name ?? "", items: json.items ?? [] };
}

export async function fetchStudentTodo(
  studentName?: string,
): Promise<{ todo: WorkspaceAssignment[]; assignments: WorkspaceAssignment[] }> {
  const name = studentName?.trim() ?? "";
  const qs = name ? `?student_name=${encodeURIComponent(name)}` : "";
  const res = await apiFetch(`/api/assignments/my${qs}`, undefined, { studentName: name || undefined });
  const json = await parseApiJson<ApiJson & { todo?: WorkspaceAssignment[]; assignments?: WorkspaceAssignment[] }>(res);
  return { todo: json.todo ?? [], assignments: json.assignments ?? [] };
}

export async function publishAssignment(id: string): Promise<void> {
  const res = await apiFetch(`/api/assignments/${encodeURIComponent(id)}/publish`, { method: "POST" });
  await parseApiJson(res);
}

export async function releaseAssignmentAnswer(id: string): Promise<WorkspaceAssignment> {
  const res = await apiFetch(`/api/assignments/${encodeURIComponent(id)}/release-answer`, { method: "POST" });
  const json = await parseApiJson<ApiJson & { assignment?: WorkspaceAssignment }>(res);
  if (!json.assignment) throw new Error("开放答案失败");
  return json.assignment;
}

export async function revokeAssignmentAnswer(id: string): Promise<WorkspaceAssignment> {
  const res = await apiFetch(`/api/assignments/${encodeURIComponent(id)}/revoke-answer`, { method: "POST" });
  const json = await parseApiJson<ApiJson & { assignment?: WorkspaceAssignment }>(res);
  if (!json.assignment) throw new Error("取消开放答案失败");
  return json.assignment;
}

export type StudentPendingRelease = {
  id: string;
  assignment_id: string;
  student_name: string;
  status: string;
  created_at: string;
  assignment?: WorkspaceAssignment | null;
};

export async function publishPendingSubmissions(assignmentId: string): Promise<number> {
  const res = await apiFetch(`/api/assignments/${encodeURIComponent(assignmentId)}/publish-pending`, {
    method: "POST",
  });
  const json = await parseApiJson<ApiJson & { count?: number }>(res);
  return json.count ?? 0;
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
      subject?: WorkspaceSubject;
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

export async function fetchMySubmissions(studentName?: string): Promise<{
  items: WorkspaceSubmission[];
  variant_tasks: WorkspaceVariantTask[];
  pending_release: StudentPendingRelease[];
}> {
  const name = studentName?.trim() ?? "";
  const qs = name ? `?student_name=${encodeURIComponent(name)}` : "";
  const res = await apiFetch(`/api/submissions/my${qs}`, undefined, { studentName: name || undefined });
  const json = await parseApiJson<
    ApiJson & {
      items?: WorkspaceSubmission[];
      variant_tasks?: WorkspaceVariantTask[];
      pending_release?: StudentPendingRelease[];
    }
  >(res);
  return {
    items: json.items ?? [],
    variant_tasks: json.variant_tasks ?? [],
    pending_release: json.pending_release ?? [],
  };
}

export async function fetchTeacherInbox(status?: string): Promise<{
  items: WorkspaceSubmission[];
  counts: InboxCounts;
}> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await apiFetch(`/api/submissions/inbox${qs}`);
  const json = await parseApiJson<
    ApiJson & {
      items?: WorkspaceSubmission[];
      counts?: InboxCounts;
    }
  >(res);
  return {
    items: json.items ?? [],
    counts: json.counts ?? { corrections_pending: 0, pending_review: 0, unpublished_graded: 0 },
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

export async function fetchInboxCounts(): Promise<InboxCounts> {
  const res = await apiFetch("/api/workspace/inbox-counts");
  const json = await parseApiJson<
    ApiJson & { corrections_pending?: number; pending_review?: number; unpublished_graded?: number }
  >(res);
  const pending = json.pending_review ?? json.unpublished_graded ?? 0;
  return {
    corrections_pending: json.corrections_pending ?? 0,
    pending_review: pending,
    unpublished_graded: pending,
  };
}

export function groupSubmissionsByAssignment(items: WorkspaceSubmission[]): Map<string, WorkspaceSubmission[]> {
  const map = new Map<string, WorkspaceSubmission[]>();
  for (const sub of items) {
    const key = sub.assignment_id || "_none";
    const list = map.get(key) ?? [];
    list.push(sub);
    map.set(key, list);
  }
  return map;
}
