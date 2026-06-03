import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, Download, Loader2, Users } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { AppDialog, APP_DIALOG_PANEL } from "@/components/molecules/AppDialog";
import { exportReportCsv, fetchAssignmentReport, type AssignmentReport } from "@/lib/workspaceApi";

type ExamScoresModalProps = {
  open: boolean;
  assignmentId: string | null;
  assignmentTitle?: string;
  onClose: () => void;
  onReviewSubmission?: (submissionId: string) => void;
};

function scoreTone(pct: number | null | undefined): string {
  if (pct == null) return "text-ink-muted";
  if (pct >= 90) return "text-emerald-700";
  if (pct >= 60) return "text-amber-800";
  return "text-red-700";
}

export function ExamScoresModal({
  open,
  assignmentId,
  assignmentTitle,
  onClose,
  onReviewSubmission,
}: ExamScoresModalProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AssignmentReport | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !assignmentId) {
      setReport(null);
      setErr(null);
      return;
    }
    setLoading(true);
    void fetchAssignmentReport(assignmentId)
      .then(setReport)
      .catch((e) => setErr(e instanceof Error ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [open, assignmentId]);

  const distEntries = useMemo(() => {
    const d = report?.score_distribution;
    if (!d) return [];
    return Object.entries(d).filter(([, n]) => n > 0);
  }, [report?.score_distribution]);

  const downloadCsv = () => {
    if (!report) return;
    const blob = new Blob([exportReportCsv(report)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${assignmentTitle || "考试"}-成绩.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="考试成绩与分析"
      subtitle={assignmentTitle}
      size="lg"
      zIndex={130}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-black/[0.1] bg-white px-4 text-small font-bold text-ink-muted"
          >
            关闭
          </button>
          <button
            type="button"
            disabled={!report}
            onClick={downloadCsv}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-4 text-small font-bold text-white disabled:opacity-50"
          >
            <Download className="h-4 w-4" {...CUTE_ICON} aria-hidden />
            导出 CSV
          </button>
        </div>
      }
    >
      <div className={APP_DIALOG_PANEL}>
        {loading ? (
          <div className="flex justify-center py-12 text-ink-muted">
            <Loader2 className="h-6 w-6 animate-spin" {...CUTE_ICON} aria-hidden />
          </div>
        ) : err ? (
          <p className="text-small text-red-600">{err}</p>
        ) : report ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-black/[0.06] bg-white p-3">
                <p className="text-caption text-ink-muted">提交率</p>
                <p className="text-xl font-black text-[#006D41]">{report.submission_rate}%</p>
                <p className="text-[0.65rem] text-ink-muted">
                  {report.submitted.length}/{report.target_count} 人
                </p>
              </div>
              <div className="rounded-xl border border-black/[0.06] bg-white p-3">
                <p className="text-caption text-ink-muted">平均分</p>
                <p className="text-xl font-black text-amber-700">
                  {report.avg_score != null ? `${report.avg_score}%` : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-black/[0.06] bg-white p-3">
                <p className="text-caption text-ink-muted">待审阅 / 待下发</p>
                <p className="text-lg font-black text-ink">
                  {report.pending_review_count ?? 0} / {report.unpublished_graded_count ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-black/[0.06] bg-white p-3">
                <p className="text-caption text-ink-muted">标准答案</p>
                <p className="text-small font-bold text-ink">
                  {report.answer_released ? "已向学生开放" : "未开放"}
                </p>
              </div>
            </div>

            {distEntries.length > 0 ? (
              <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                <p className="flex items-center gap-1.5 text-caption font-bold text-violet-950">
                  <BarChart3 className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                  分数段分布
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {distEntries.map(([band, n]) => (
                    <span
                      key={band}
                      className="rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-[0.65rem] font-bold text-violet-900"
                    >
                      {band}：{n} 人
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {report.weak_knowledge_ranked && report.weak_knowledge_ranked.length > 0 ? (
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                <p className="text-caption font-bold text-amber-950">共性薄弱点（按人数）</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {report.weak_knowledge_ranked.map((w) => (
                    <li
                      key={w.name}
                      className="rounded-lg bg-white px-2.5 py-1 text-[0.65rem] font-semibold text-amber-950 ring-1 ring-amber-200/80"
                    >
                      {w.name}
                      <span className="ml-1 text-amber-700">×{w.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {report.not_submitted.length > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
                <p className="flex items-center gap-1.5 text-caption font-bold text-amber-950">
                  <AlertCircle className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                  未上传试卷（{report.not_submitted.length}）
                </p>
                <p className="mt-2 text-small text-amber-900">{report.not_submitted.join("、")}</p>
              </div>
            ) : null}

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-caption font-bold text-ink-muted">
                <Users className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                学生成绩明细
              </p>
              <div className="max-h-80 overflow-auto rounded-xl border border-black/[0.06]">
                <table className="w-full min-w-[32rem] text-left text-caption">
                  <thead className="sticky top-0 bg-gray-50 text-[0.65rem] font-bold text-ink-muted">
                    <tr>
                      <th className="px-3 py-2">姓名</th>
                      <th className="px-3 py-2">得分</th>
                      <th className="px-3 py-2">状态</th>
                      <th className="px-3 py-2">薄弱点</th>
                      <th className="px-3 py-2">评语摘要</th>
                      {onReviewSubmission ? <th className="px-3 py-2" /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {report.submitted.length === 0 ? (
                      <tr>
                        <td colSpan={onReviewSubmission ? 6 : 5} className="px-3 py-6 text-center text-ink-muted">
                          暂无已录入试卷
                        </td>
                      </tr>
                    ) : (
                      report.submitted.map((row) => (
                        <tr key={row.submission_id ?? row.student_name} className="border-t border-black/[0.04]">
                          <td className="px-3 py-2.5 font-bold text-ink">{row.student_name}</td>
                          <td className={`px-3 py-2.5 font-black tabular-nums ${scoreTone(row.score_percent)}`}>
                            {row.score_percent != null ? `${row.score_percent}%` : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-ink-muted">{row.status_label ?? row.status}</td>
                          <td className="max-w-[8rem] truncate px-3 py-2.5 text-ink-muted" title={row.weak_points?.join("、")}>
                            {row.weak_points?.length ? row.weak_points.join("、") : "—"}
                          </td>
                          <td className="max-w-[10rem] truncate px-3 py-2.5 text-ink-muted" title={row.comment_preview}>
                            {row.comment_preview || "—"}
                          </td>
                          {onReviewSubmission && row.submission_id ? (
                            <td className="px-3 py-2.5">
                              <button
                                type="button"
                                onClick={() => onReviewSubmission(row.submission_id!)}
                                className="rounded-lg border border-brand/30 bg-brand/10 px-2 py-1 text-[0.65rem] font-bold text-brand"
                              >
                                审阅
                              </button>
                            </td>
                          ) : onReviewSubmission ? (
                            <td />
                          ) : null}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppDialog>
  );
}
