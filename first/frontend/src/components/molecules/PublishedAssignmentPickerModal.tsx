import { useEffect, useId, useState } from "react";
import { ClipboardList, Loader2, X } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { fetchTeacherAssignments, type WorkspaceAssignment } from "@/lib/workspaceApi";

const SUBJECT_CN = { math: "数学", english: "英语" } as const;

type PublishedAssignmentPickerModalProps = {
  open: boolean;
  subject: "math" | "english";
  onSelect: (assignment: WorkspaceAssignment) => void;
  onClose: () => void;
};

export function PublishedAssignmentPickerModal({
  open,
  subject,
  onSelect,
  onClose,
}: PublishedAssignmentPickerModalProps) {
  const titleId = useId();
  const [items, setItems] = useState<WorkspaceAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setErr(null);
    void fetchTeacherAssignments()
      .then((list) => {
        setItems(list.filter((a) => a.status === "published" && a.subject === subject));
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [open, subject]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[105] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-label="关闭" onClick={onClose} />
      <div className="relative z-10 flex max-h-[min(88vh,36rem)] w-full max-w-lg flex-col overflow-hidden rounded-[1.25rem] border border-black/[0.08] bg-white shadow-[0_24px_80px_rgba(15,90,75,0.22)]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-body font-extrabold text-ink">
              选择已发布任务
            </h2>
            <p className="mt-1 text-caption leading-snug text-ink-muted">
              选定任务后再选择学生作业图片，批改结果将关联到该任务（{SUBJECT_CN[subject]}）。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white"
            aria-label="关闭"
          >
            <X className="h-5 w-5" {...CUTE_ICON} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-10 text-caption text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" {...CUTE_ICON} aria-hidden />
              加载任务列表…
            </p>
          ) : null}
          {err ? <p className="py-6 text-center text-caption font-semibold text-red-600">{err}</p> : null}
          {!loading && !err && items.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-small font-semibold text-ink-muted">暂无已发布的{SUBJECT_CN[subject]}任务</p>
              <p className="mt-2 text-caption text-ink-subtle">请先在「作业管理」发布任务后再从此处提交。</p>
            </div>
          ) : null}
          {!loading && !err && items.length > 0 ? (
            <ul className="space-y-2">
              {items.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(a)}
                    className="flex w-full items-start gap-3 rounded-xl border border-black/[0.08] bg-surface-page/50 px-4 py-3 text-left transition hover:border-primary/35 hover:bg-primary-tint/40"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary ring-1 ring-primary/20">
                      <ClipboardList className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-small font-extrabold text-ink">{a.title}</span>
                      {a.class_name ? (
                        <span className="mt-0.5 block text-caption text-ink-muted">{a.class_name}</span>
                      ) : null}
                      {a.description ? (
                        <span className="mt-1 line-clamp-2 text-caption text-ink-subtle">{a.description}</span>
                      ) : null}
                      <span className="mt-1.5 block text-[0.65rem] font-semibold text-[#006D41]">
                        已收 {a.submission_count ?? 0} 份
                        {a.target_student_names?.length
                          ? ` · 面向 ${a.target_student_names.length} 名学生`
                          : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
