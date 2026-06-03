/** 批改科目（语文暂走数学批改管线） */
export type GradeSubject = "math" | "english" | "chinese";

export function subjectLabelCn(subject: GradeSubject): string {
  if (subject === "math") return "数学";
  if (subject === "chinese") return "语文";
  return "英语";
}

/** 策略文案 / 历史筛选等仍按 math | english 二分 */
export function scoringPipelineSubject(subject: GradeSubject): "math" | "english" {
  return subject === "english" ? "english" : "math";
}
