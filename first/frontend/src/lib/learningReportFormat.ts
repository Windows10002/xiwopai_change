/** 清理 AI 学情报告中的冗余 Markdown 符号，保留可读结构 */
export function normalizeLearningReportMarkdown(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s*$/gm, "")
    .replace(/^#{4,6}\s+/gm, "### ")
    .replace(/\*{3,}/g, "**")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 复制到剪贴板时使用纯文本 */
export function learningReportPlainText(raw: string): string {
  return normalizeLearningReportMarkdown(raw)
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^[-*]\s+/gm, "· ")
    .trim();
}
