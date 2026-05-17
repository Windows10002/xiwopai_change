import type { GradingResultDetail } from "@/types/grading";

export type BatchInsightItemPayload = {
  file_name: string;
  score_percent: number;
  overall_label: string;
  weak_points: string[];
  dimensions: Array<{
    label: string;
    status?: string;
    detail?: string;
    is_error?: boolean;
  }>;
};

export type BatchInsightsResponse = {
  ok: boolean;
  message?: string;
  stats?: {
    paper_count: number;
    avg_score_percent?: number | null;
    status_distribution?: Record<string, number>;
    weak_knowledge_ranked?: Array<{ tag: string; count: number }>;
    error_patterns?: Array<{ pattern: string; count: number }>;
    teaching_suggestions?: string[];
  };
  learning_report?: {
    summary_md: string;
    error_patterns?: Array<{ pattern: string; count: number; description?: string }>;
    weak_knowledge_ranked?: Array<{ tag: string; count: number; analysis?: string }>;
    teaching_suggestions?: string[];
  };
  knowledge_variants?: {
    intro?: string;
    knowledge_summary?: Array<{
      name: string;
      frequency: number;
      mastery_hint?: string;
      typical_errors?: string[];
    }>;
    variant_problems?: Array<{
      knowledge_point: string;
      difficulty: string;
      variation_type: string;
      stem: string;
      answer_hint: string;
    }>;
  };
};

const MATH_ERROR = new Set(["错误", "未作答", "过程不规范"]);

function isErrorDimension(subject: "math" | "english", status?: string): boolean {
  if (!status) return false;
  if (subject === "math") return MATH_ERROR.has(status);
  return status === "错误" || status === "未作答";
}

/** 将前端批改结果转为批量学情 API 入参 */
export function buildBatchInsightItems(
  subject: "math" | "english",
  entries: Array<{ fileName: string; detail: GradingResultDetail }>,
): BatchInsightItemPayload[] {
  return entries.map(({ fileName, detail }) => ({
    file_name: fileName,
    score_percent: detail.scorePercent,
    overall_label: detail.overallLabel,
    weak_points: detail.weakKnowledgeTags ?? [],
    dimensions: (detail.dimensions ?? []).map((d) => ({
      label: d.label,
      status: d.status,
      detail: d.detail,
      is_error: isErrorDimension(subject, d.status),
    })),
  }));
}

/** 本地快速聚合（无 LLM，用于预览或离线） */
export function aggregateBatchLocally(
  subject: "math" | "english",
  entries: Array<{ fileName: string; detail: GradingResultDetail }>,
): Pick<BatchInsightsResponse, "stats" | "learning_report"> {
  const weakMap = new Map<string, number>();
  const patternMap = new Map<string, number>();
  const statusMap = new Map<string, number>();
  let scoreSum = 0;
  let scoreN = 0;

  for (const { detail } of entries) {
    statusMap.set(detail.overallLabel, (statusMap.get(detail.overallLabel) ?? 0) + 1);
    scoreSum += detail.scorePercent;
    scoreN += 1;
    for (const w of detail.weakKnowledgeTags ?? []) {
      const t = w.trim();
      if (t) weakMap.set(t, (weakMap.get(t) ?? 0) + 1);
    }
    for (const d of detail.dimensions ?? []) {
      if (!isErrorDimension(subject, d.status)) continue;
      const key = `${d.status ?? "错题"}·${d.label.slice(0, 36)}`;
      patternMap.set(key, (patternMap.get(key) ?? 0) + 1);
    }
  }

  const weak_knowledge_ranked = [...weakMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  const error_patterns = [...patternMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([pattern, count]) => ({ pattern, count }));

  const avg = scoreN ? Math.round((scoreSum / scoreN) * 10) / 10 : null;
  const suggestions: string[] = [];
  if (weak_knowledge_ranked[0]) {
    suggestions.push(`建议针对「${weak_knowledge_ranked[0].tag}」开展专项训练。`);
  }
  if (error_patterns[0]) {
    suggestions.push(`重点关注：${error_patterns[0].pattern}。`);
  }

  const summary_md = [
    "## 学情分析报告（本地汇总）",
    "",
    `- 份数：${entries.length}`,
    avg != null ? `- 平均得分率：${avg}%` : "",
    "",
    "### 薄弱知识点",
    ...weak_knowledge_ranked.map((w) => `- ${w.tag}（${w.count} 次）`),
    "",
    "### 错题模式",
    ...error_patterns.map((p) => `- ${p.pattern}（${p.count} 次）`),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    stats: {
      paper_count: entries.length,
      avg_score_percent: avg,
      status_distribution: Object.fromEntries(statusMap),
      weak_knowledge_ranked,
      error_patterns,
      teaching_suggestions: suggestions,
    },
    learning_report: {
      summary_md,
      error_patterns,
      weak_knowledge_ranked,
      teaching_suggestions: suggestions,
    },
  };
}

export async function fetchBatchInsights(params: {
  subject: "math" | "english";
  items: BatchInsightItemPayload[];
  gradeLevel?: string;
  teacherNote?: string;
  groupName?: string;
  useLlm?: boolean;
}): Promise<BatchInsightsResponse> {
  const res = await fetch("/api/grading/batch-insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: params.subject,
      items: params.items,
      grade_level: params.gradeLevel ?? "",
      teacher_note: params.teacherNote ?? "",
      group_name: params.groupName ?? "",
      use_llm: params.useLlm !== false,
    }),
  });

  const data = (await res.json()) as BatchInsightsResponse & { message?: string };
  if (!res.ok || !data.ok) {
    throw new Error(data.message ?? `学情分析请求失败（${res.status}）`);
  }
  return data;
}
