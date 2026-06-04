import { apiFetch, parseApiJson } from "@/lib/apiClient";

export type ProductFeedbackCategory = "bug" | "idea" | "question";

export type ProductFeedbackItem = {
  saved_at: string;
  category: ProductFeedbackCategory;
  message: string;
  contact?: string;
  path?: string;
  role?: string;
  user_sub?: string;
  client_version?: string;
};

export type ProductFeedbackListResponse = {
  ok: boolean;
  total: number;
  offset: number;
  limit: number;
  by_category: Record<string, number>;
  by_role: Record<string, number>;
  category_labels: Record<string, string>;
  items: ProductFeedbackItem[];
  message?: string;
};

export type ProductFeedbackListParams = {
  limit?: number;
  offset?: number;
  category?: ProductFeedbackCategory | "";
  role?: string;
  path?: string;
};

function buildQuery(params: ProductFeedbackListParams): string {
  const q = new URLSearchParams();
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.offset != null) q.set("offset", String(params.offset));
  if (params.category) q.set("category", params.category);
  if (params.role) q.set("role", params.role);
  if (params.path) q.set("path", params.path);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function fetchProductFeedbackList(
  params: ProductFeedbackListParams = {},
): Promise<ProductFeedbackListResponse> {
  const res = await apiFetch(`/api/product-feedback${buildQuery(params)}`);
  return parseApiJson<ProductFeedbackListResponse>(res);
}

/** 下载 CSV / JSONL（需已登录且具备 feedback.dashboard） */
export async function downloadProductFeedbackExport(
  format: "csv" | "jsonl",
  params: Omit<ProductFeedbackListParams, "limit" | "offset"> = {},
): Promise<void> {
  const q = new URLSearchParams({ format });
  if (params.category) q.set("category", params.category);
  if (params.role) q.set("role", params.role);
  if (params.path) q.set("path", params.path);
  const res = await apiFetch(`/api/product-feedback/export?${q.toString()}`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message || "导出失败");
  }
  const blob = await res.blob();
  const stamp = new Date().toISOString().slice(0, 10);
  const ext = format === "jsonl" ? "jsonl" : "csv";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `product_feedback_${stamp}.${ext}`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const PRODUCT_FEEDBACK_CATEGORY_LABEL: Record<ProductFeedbackCategory, string> = {
  bug: "问题/Bug",
  idea: "功能建议",
  question: "使用疑问",
};

export const PRODUCT_FEEDBACK_ROLE_LABEL: Record<string, string> = {
  teacher: "教师",
  student: "学生",
  parent: "家长",
  admin: "教务",
  guest: "访客",
  unknown: "未知",
};
