import { useEffect, useState } from "react";
import { Download, Loader2, Users, XCircle } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { AppDialog, APP_DIALOG_PANEL } from "@/components/molecules/AppDialog";
import { exportReportCsv, fetchAssignmentReport, type AssignmentReport } from "@/lib/workspaceApi";

type AssignmentReportModalProps = {
  open: boolean;
  assignmentId: string | null;
  assignmentTitle?: string;
  variantTitle?: string;
  onClose: () => void;
};

export function AssignmentReportModal({
  open,
  assignmentId,
  assignmentTitle,
  variantTitle = "任务统计",
  onClose,
}: AssignmentReportModalProps) {
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

  const downloadCsv = () => {
    if (!report) return;
    const blob = new Blob([exportReportCsv(report)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${assignmentTitle || "作业"}-统计.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={variantTitle}
      subtitle={assignmentTitle ? `${assignmentTitle} · 提交率与名单` : undefined}
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
            导出
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
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
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
                  {report.avg_score != null ? `${report.avg_score}` : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-black/[0.06] bg-white p-3">
                <p className="text-caption text-ink-muted">通知</p>
                <p className="text-small font-bold text-ink">
                  {report.notify_sent ? "已发送" : "未开启"}
                </p>
              </div>
            </div>

            {report.not_submitted.length > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
                <p className="flex items-center gap-1.5 text-caption font-bold text-amber-950">
                  <XCircle className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                  未交（{report.not_submitted.length}）
                </p>
                <p className="mt-2 text-small text-amber-900">{report.not_submitted.join("、")}</p>
              </div>
            ) : null}

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-caption font-bold text-ink-muted">
                <Users className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                已提交
              </p>
              <ul className="max-h-56 space-y-2 overflow-y-auto">
                {report.submitted.length === 0 ? (
                  <li className="text-caption text-ink-muted">暂无</li>
                ) : (
                  report.submitted.map((row) => (
                    <li
                      key={row.submission_id ?? row.student_name}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/[0.06] bg-white px-3 py-2 text-caption"
                    >
                      <span className="font-bold text-ink">{row.student_name}</span>
                      <span className="text-ink-muted">
                        {row.score_percent != null ? `${row.score_percent}%` : "待审阅/未批改"}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </AppDialog>
  );
}
