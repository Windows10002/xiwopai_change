import { AlertTriangle, Trash2 } from "lucide-react";

import { AppDialog } from "@/components/molecules/AppDialog";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import {
  assignmentDeleteKind,
  assignmentDeleteStepCopy,
  type AssignmentDeleteStep,
} from "@/lib/confirmDeleteAssignment";
import type { WorkspaceAssignment } from "@/lib/workspaceApi";

type DeleteAssignmentConfirmDialogProps = {
  open: boolean;
  assignment: WorkspaceAssignment | null;
  step: AssignmentDeleteStep;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** 删除作业/考试：应用内二次确认（替代浏览器 confirm） */
export function DeleteAssignmentConfirmDialog({
  open,
  assignment,
  step,
  busy = false,
  onCancel,
  onConfirm,
}: DeleteAssignmentConfirmDialogProps) {
  if (!assignment) return null;

  const kind = assignmentDeleteKind(assignment);
  const copy = assignmentDeleteStepCopy(assignment, step);
  const isSecond = step === 2;

  return (
    <AppDialog
      open={open}
      onClose={onCancel}
      title={copy.title}
      subtitle={copy.subtitle}
      size="md"
      zIndex={210}
      closeDisabled={busy}
      backdropLabel="取消删除"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-10 rounded-xl border border-black/[0.08] bg-white px-4 text-small font-bold text-ink-muted transition hover:border-primary/25 hover:text-ink disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-small font-bold text-white shadow-sm transition disabled:opacity-50 ${
              isSecond ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"
            }`}
          >
            <Trash2 className="h-4 w-4" {...CUTE_ICON} aria-hidden />
            {busy ? "删除中…" : isSecond ? "确认删除" : "删除"}
          </button>
        </div>
      }
    >
      <div
        className={`rounded-2xl border px-4 py-3.5 ${
          isSecond
            ? "border-red-200/90 bg-red-50/80"
            : "border-amber-200/80 bg-amber-50/70"
        }`}
      >
        <p className="flex items-start gap-2 text-small leading-relaxed text-ink">
          <AlertTriangle
            className={`mt-0.5 h-4 w-4 shrink-0 ${isSecond ? "text-red-600" : "text-amber-700"}`}
            {...CUTE_ICON}
            aria-hidden
          />
          <span>{copy.body}</span>
        </p>
        {(assignment.submission_count ?? 0) > 0 && step === 1 ? (
          <p className="mt-2 text-caption text-ink-muted">
            当前已有 {assignment.submission_count} 份{kind === "考试" ? "录入" : "提交"}记录，确认后将进入二次确认。
          </p>
        ) : null}
      </div>
    </AppDialog>
  );
}
