import { apiFetch, parseApiJson } from "@/lib/apiClient";

export type FeedbackDashboardData = {
  ok: boolean;
  total: number;
  by_subject: Record<string, number>;
  by_scope: Record<string, number>;
  top_dimensions: Array<{ label: string; count: number }>;
  recent: Array<Record<string, unknown>>;
  message?: string;
};

export async function fetchFeedbackDashboard(): Promise<FeedbackDashboardData> {
  const res = await apiFetch("/api/grading-feedback");
  return parseApiJson<FeedbackDashboardData>(res);
}
