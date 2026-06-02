import { apiFetch, parseApiJson } from "@/lib/apiClient";

export type GradingFeedbackScope = "question" | "whole_paper";

/** 与当前左侧预览/批改任务关联的追溯信息（供学习模块与人工抽检） */
export type GradingFeedbackTrace = {
  /** 服务端 `/uploads/...` 完整路径（若本次批改已落盘） */
  serverImageUrl?: string | null;
  /** 浏览器本地历史 IndexedDB 条目 id（若有） */
  historyEntryId?: string | null;
  /** 用户选择的原始文件名 */
  localFileName?: string | null;
  batchIndex: number;
  batchTotal: number;
};

export type GradingFeedbackPayload = {
  feedback_scope: GradingFeedbackScope;
  subject: "math" | "english";
  user_feedback: string;
  client_ts: number;
  /** `/uploads/` 下文件名，便于与磁盘卷面对齐 */
  image_ref?: string | null;
  /** 完整 URL 或路径，便于日志检索 */
  image_url?: string | null;
  history_entry_id?: string | null;
  local_file_name?: string | null;
  batch_index?: number;
  batch_total?: number;
  /** 逐题反馈时必填 */
  dimension_key?: string;
  dimension_label?: string;
  status?: string;
  value?: number;
  max?: number;
  detail_excerpt?: string;
  job_file_base?: string;
  subject_title?: string;
  overall_label?: string;
  score_percent?: number;
};

/** 从 `/uploads/foo.jpg` 或带域名的 URL 中解析出 `foo.jpg` */
export function uploadsBasenameFromUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const m = url.match(/\/uploads\/([^?#]+)/i);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

export function traceToFeedbackFields(trace: GradingFeedbackTrace | undefined): Pick<
  GradingFeedbackPayload,
  "image_ref" | "image_url" | "history_entry_id" | "local_file_name" | "batch_index" | "batch_total"
> {
  if (!trace) return {};
  const image_url = trace.serverImageUrl?.trim() || undefined;
  const image_ref = image_url ? uploadsBasenameFromUrl(image_url) ?? undefined : undefined;
  return {
    image_url: image_url || undefined,
    image_ref: image_ref || undefined,
    history_entry_id: trace.historyEntryId?.trim() || undefined,
    local_file_name: trace.localFileName?.trim() || undefined,
    batch_index: trace.batchIndex,
    batch_total: trace.batchTotal,
  };
}

/**
 * 提交批改反馈（逐题 / 整卷）→ Flask `/api/grading-feedback`，写入项目根 `grading_feedback.jsonl`。
 */
export async function submitGradingFeedback(payload: GradingFeedbackPayload): Promise<void> {
  const res = await apiFetch("/api/grading-feedback", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await parseApiJson(res);
}
