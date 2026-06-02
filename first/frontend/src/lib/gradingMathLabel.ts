/** 分项标题如 `第 1 题 · x^2+1` → 前缀 + 数学段（用于排版） */
export function splitQuestionLabel(label: string): { prefix: string; math: string } {
  const sep = " · ";
  const i = label.indexOf(sep);
  if (i < 0) return { prefix: "", math: label };
  return { prefix: label.slice(0, i + sep.length), math: label.slice(i + sep.length) };
}
