import { getCurrentTerm, listRecentTerms, type TermScope } from "@/lib/academicTerm";
import {
  classOverviewStats,
  filterEntriesBySubject,
  type AnalyticsSubjectFilter,
  weakKnowledgeRanking,
} from "@/lib/classAnalyticsInsights";
import type { GradingHistoryEntry } from "@/lib/gradingHistory";

const SUBJECT_LABEL: Record<AnalyticsSubjectFilter, string> = {
  all: "全部学科",
  math: "数学",
  english: "英语",
  chinese: "语文",
};

function termLabelForScope(scope: TermScope): string {
  if (scope === "all") return "全部记录";
  const term =
    scope === "current" ? getCurrentTerm() : listRecentTerms(12).find((t) => t.id === scope) ?? getCurrentTerm();
  return term.label;
}

export function downloadAnalyticsBriefing(
  entries: GradingHistoryEntry[],
  opts: { termScope: TermScope; subject: AnalyticsSubjectFilter },
): void {
  const filtered = filterEntriesBySubject(entries, opts.subject);
  const stats = classOverviewStats(filtered);
  const weak = weakKnowledgeRanking(filtered, 15);

  const lines = [
    "希沃智教 π · 学情简报（本机汇总）",
    `生成时间：${new Date().toLocaleString("zh-CN")}`,
    `学期范围：${termLabelForScope(opts.termScope)}`,
    `学科筛选：${SUBJECT_LABEL[opts.subject]}`,
    "",
    "【概览】",
    `批改份数：${stats.paperCount}`,
    `涉及学生：${stats.studentCount}`,
    `平均得分率：${stats.avgScore != null ? `${stats.avgScore}%` : "—"}`,
    "",
    "【薄弱知识点 TOP】",
    ...(weak.length
      ? weak.map((w, i) => `${i + 1}. ${w.tag} · 出现 ${w.count} 次（约 ${w.share}% 份作业）`)
      : ["暂无标注薄弱点"]),
    "",
    "说明：数据来自本机批改记录，正式作业收发与审阅请在「作业管理」中操作。",
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `学情简报_${opts.subject}_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
