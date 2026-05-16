export type DimensionScore = {
  key: string;
  label: string;
  value: number;
  max: number;
  /** 数学逐题：后端 status（正确/错误/…），用于标记与导出 */
  status?: string;
  /** 数学逐题：面向学生的简要解析/订正说明（已做展示层清理） */
  detail?: string;
};

/** 错题区域：相对预览容器左上角的百分比（0–100），便于不同尺寸下图层对齐 */
export type ErrorRegionPct = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type DetailedFeedback = {
  strengths: string[];
  improvements: string[];
};

/** 批改完成后的完整展示数据（演示环境使用模拟数据） */
export type GradingResultDetail = {
  scorePercent: number;
  overallLabel: string;
  dimensions: DimensionScore[];
  dimensionSectionTitle: string;
  errorRegions: ErrorRegionPct[];
  feedback: DetailedFeedback;
  weakKnowledgeTags: string[];
  /** 后端总评/综合评语（若有），用于「总评」区块，与列表项去重展示 */
  summaryText?: string;
  /** 本次批改的给分策略说明（前端生成，供「综合得分」旁入口查看） */
  scoringStrategyDetail?: string;
};

export type UploadPanelStatus =
  | { phase: "idle" }
  | { phase: "info"; message: string }
  | { phase: "uploading"; progress: number; message?: string }
  | { phase: "success"; message?: string }
  | { phase: "error"; message: string };
