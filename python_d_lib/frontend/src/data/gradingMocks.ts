import type { GradingResultDetail } from "@/types/grading";

export const MATH_GRADING_MOCK: GradingResultDetail = {
  scorePercent: 82,
  overallLabel: "数学作业 · 综合评分",
  dimensionSectionTitle: "分项得分（按步骤）",
  dimensions: [
    { key: "s1", label: "步骤一 · 列式与建模", value: 8, max: 10 },
    { key: "s2", label: "步骤二 · 推导过程", value: 7, max: 10 },
    { key: "s3", label: "步骤三 · 计算与检验", value: 9, max: 10 },
  ],
  errorRegions: [
    { left: 18, top: 42, width: 28, height: 14 },
    { left: 52, top: 58, width: 22, height: 12 },
  ],
  feedback: {
    strengths: ["建模思路清晰，关键等量关系找得准确。", "验算意识好，书写整洁。"],
    improvements: ["第二问移项时符号曾出错，建议逐步标注正负。", "分数化简要写中间步骤，避免跳步。"],
  },
  weakKnowledgeTags: ["一元二次方程", "因式分解", "分式运算"],
};

export const ENGLISH_GRADING_MOCK: GradingResultDetail = {
  scorePercent: 76,
  overallLabel: "英语作文 · 多维过程分",
  dimensionSectionTitle: "分项得分（内容 / 语言 / 结构）",
  dimensions: [
    { key: "content", label: "内容", value: 5, max: 6 },
    { key: "language", label: "语言", value: 4, max: 6 },
    { key: "structure", label: "结构", value: 2, max: 3 },
  ],
  errorRegions: [
    { left: 12, top: 28, width: 72, height: 8 },
    { left: 20, top: 62, width: 35, height: 10 },
  ],
  feedback: {
    strengths: ["主题明确，例证与观点基本契合。", "段落分层清楚，衔接词使用得当。"],
    improvements: ["个别复杂句时态不一致，注意叙事主线。", "结尾可再回扣开头关键词，增强首尾呼应。"],
  },
  weakKnowledgeTags: ["时态一致", "连接词运用", "高级词汇替换"],
};
