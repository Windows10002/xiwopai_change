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
  const res = await fetch("/api/grading-feedback");
  const data = (await res.json()) as FeedbackDashboardData;
  if (!res.ok || !data.ok) {
    throw new Error(data.message ?? `加载失败（${res.status}）`);
  }
  return data;
}
