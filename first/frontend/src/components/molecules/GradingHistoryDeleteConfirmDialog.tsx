import { AlertTriangle, Trash2 } from "lucide-react";

import { AppDialog } from "@/components/molecules/AppDialog";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";

export type GradingHistoryDeleteKind =
  | { type: "single"; id: string; title: string }
  | { type: "group"; groupKey: string; title: string; count: number }
  | { type: "clearSubject"; subjectLabel: string };

type GradingHistoryDeleteConfirmDialogProps = {
  open: boolean;
  target: GradingHistoryDeleteKind | null;
  onCancel: () => void;
  onConfirm: () => void;
};

function copy(target: GradingHistoryDeleteKind) {
  if (target.type === "single") {
    return {
      title: "删除批改记录",
      subtitle: target.title,
      body: "确定删除此条本地批改记录？删除后无法恢复，关联缩略图也会清除。",
      confirm: "删除",
    };
  }
  if (target.type === "group") {
    return {
      title: "删除整组批改",
      subtitle: target.title,
      body: `确定删除该文件夹批改的全部 ${target.count} 条记录？此操作不可恢复。`,
      confirm: "删除整组",
    };
  }
  return {
    title: `清空${target.subjectLabel}历史`,
    subtitle: "仅影响当前学科",
    body: `确定清空「${target.subjectLabel}」的全部本地批改历史？其它学科记录将保留。`,
    confirm: "清空本学科",
  };
}

export function GradingHistoryDeleteConfirmDialog({
  open,
  target,
  onCancel,
  onConfirm,
}: GradingHistoryDeleteConfirmDialogProps) {
  if (!target) return null;
  const c = copy(target);
  const isClear = target.type === "clearSubject";

  return (
    <AppDialog
      open={open}
      onClose={onCancel}
      title={c.title}
      subtitle={c.subtitle}
      size="md"
      zIndex={210}
      backdropLabel="取消"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-10 rounded-xl border border-black/[0.08] bg-white px-4 text-small font-bold text-ink-muted transition hover:border-primary/25 hover:text-ink"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-red-600 px-4 text-small font-bold text-white shadow-sm transition hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4" {...CUTE_ICON} aria-hidden />
            {c.confirm}
          </button>
        </div>
      }
    >
      <div
        className={`rounded-2xl border px-4 py-3.5 ${
          isClear ? "border-amber-200/80 bg-amber-50/70" : "border-red-200/90 bg-red-50/80"
        }`}
      >
        <p className="flex items-start gap-2 text-small leading-relaxed text-ink">
          <AlertTriangle
            className={`mt-0.5 h-4 w-4 shrink-0 ${isClear ? "text-amber-700" : "text-red-600"}`}
            {...CUTE_ICON}
            aria-hidden
          />
          <span>{c.body}</span>
        </p>
      </div>
    </AppDialog>
  );
}
