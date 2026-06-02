import type { BatchInsightsResponse } from "@/lib/gradingBatchInsights";
import type { GradingResultDetail } from "@/types/grading";

/** 导出前筛选：分项列表 */
export type ExportDimensionFilter = "all" | "errors" | "correct";

/** Word / Excel 导出选项（批改结果页勾选） */
export type ExportFilterOptions = {
  dimensions: ExportDimensionFilter;
  includeSummary: boolean;
  includeStrengths: boolean;
  includeImprovements: boolean;
  includeWeakTags: boolean;
  includeLearningReport: boolean;
  includeVariants: boolean;
};

export const DEFAULT_EXPORT_FILTER: ExportFilterOptions = {
  dimensions: "all",
  includeSummary: true,
  includeStrengths: true,
  includeImprovements: true,
  includeWeakTags: true,
  includeLearningReport: true,
  includeVariants: true,
};

export async function exportGradingDocx(
  detail: GradingResultDetail,
  subjectCn: string,
  baseName: string,
  filter?: ExportFilterOptions,
  batchInsights?: BatchInsightsResponse | null,
): Promise<void> {
  const mod = await import("@/lib/exportGradingImpl");
  return mod.exportGradingDocx(detail, subjectCn, baseName, filter, batchInsights ?? null);
}

export async function exportGradingXlsx(
  detail: GradingResultDetail,
  subjectCn: string,
  baseName: string,
  filter?: ExportFilterOptions,
  batchInsights?: BatchInsightsResponse | null,
): Promise<void> {
  const mod = await import("@/lib/exportGradingImpl");
  return mod.exportGradingXlsx(detail, subjectCn, baseName, filter, batchInsights ?? null);
}
