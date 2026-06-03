import { useEffect, useRef } from "react";
import {
  BarChart3,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
  Upload,
} from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { formatAssignmentDue } from "@/lib/assignmentDeadline";
import type { WorkspaceAssignment } from "@/lib/workspaceApi";

const SUBJECT_CN = { math: "数学", english: "英语", chinese: "语文" } as const;

type WorkspaceTaskCardProps = {
  assignment: WorkspaceAssignment;
  mode: "homework" | "exam";
  busy: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  onExamUpload: () => void;
  onExamScores: () => void;
  onPublishPending: () => void;
  onReleaseAnswer: () => void;
  onToggleLateSubmit: () => void;
  onPublishDraft: () => void;
};

const btnPrimary =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-4 text-caption font-bold transition";
const btnGhost =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-4 text-caption font-bold text-ink transition hover:bg-gray-50";

export function WorkspaceTaskCard({
  assignment: a,
  mode,
  busy,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onEdit,
  onDelete,
  onReport,
  onExamUpload,
  onExamScores,
  onPublishPending,
  onReleaseAnswer,
  onToggleLateSubmit,
  onPublishDraft,
}: WorkspaceTaskCardProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onMenuClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen, onMenuClose]);

  const targetLabel = a.target_student_names?.length ? a.target_student_names.join("、") : "—";
  const progress = `${a.submission_count ?? 0} 已录 · ${a.published_count ?? 0} 已下发`;

  return (
    <li className="rounded-2xl border border-black/[0.06] bg-white/95 shadow-sm">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.65rem] font-semibold text-ink-muted">
            <span className="text-ink">{SUBJECT_CN[a.subject]}</span>
            {a.is_overdue ? <span className="text-amber-800">· 已截止</span> : null}
            {mode === "exam" && a.hide_answer_from_student ? (
              <span className={a.answer_released ? "text-emerald-700" : "text-amber-800"}>
                · {a.answer_released ? "答案已开放" : "答案未开放"}
              </span>
            ) : null}
            {a.status === "draft" ? <span className="text-ink-muted">· 草稿</span> : null}
          </div>
          <h3 className="mt-1.5 text-body font-bold text-ink">{a.title}</h3>
          {a.description ? (
            <p className="mt-1 line-clamp-1 text-caption text-ink-muted">{a.description}</p>
          ) : null}
        </div>
        {a.status === "published" ? (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              disabled={busy}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={onMenuToggle}
              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-ink-muted hover:bg-gray-50"
            >
              <MoreHorizontal className="h-4 w-4" {...CUTE_ICON} aria-hidden />
              <span className="sr-only">更多操作</span>
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-1 min-w-[10.5rem] rounded-xl border border-black/[0.08] bg-white py-1 shadow-lg ring-1 ring-black/[0.04]"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={onEdit}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-caption font-semibold text-ink hover:bg-gray-50"
                >
                  <Pencil className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
                  编辑
                </button>
                {mode === "exam" ? (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={busy}
                      onClick={onPublishPending}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-caption font-semibold text-ink hover:bg-gray-50"
                    >
                      <Send className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
                      批量下发成绩
                    </button>
                    {a.hide_answer_from_student ? (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={busy}
                        onClick={onReleaseAnswer}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-caption font-semibold text-ink hover:bg-gray-50"
                      >
                        <KeyRound className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
                        {a.answer_released ? "取消开放答案" : "开放答案"}
                      </button>
                    ) : null}
                  </>
                ) : null}
                {a.is_overdue ? (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    onClick={onToggleLateSubmit}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-caption font-semibold text-ink hover:bg-gray-50"
                  >
                    {a.allow_late_submit ? "关闭补交" : "开放补交"}
                  </button>
                ) : null}
                <div className="my-1 border-t border-black/[0.06]" />
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={onDelete}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-caption font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
                  删除
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 px-4 pb-3 text-caption text-ink-muted">
        <span>{a.class_name || "—"}</span>
        <span>{targetLabel}</span>
        <span>{progress}</span>
        {a.due_at ? (
          <span className={a.is_overdue ? "font-semibold text-amber-800" : ""}>
            截止 {formatAssignmentDue(a.due_at)}
          </span>
        ) : null}
      </div>

      {a.status === "published" ? (
        <div className="flex flex-wrap gap-2 border-t border-black/[0.05] bg-gray-50/50 px-4 py-3">
          {mode === "exam" ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={onExamUpload}
                className={`${btnPrimary} bg-brand text-white hover:opacity-95`}
              >
                <Upload className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
                上传试卷
              </button>
              <button type="button" disabled={busy} onClick={onExamScores} className={btnGhost}>
                <BarChart3 className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
                成绩与分析
              </button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={onReport} className={`${btnPrimary} bg-brand text-white`}>
              提交统计
            </button>
          )}
        </div>
      ) : (
        <div className="border-t border-black/[0.05] bg-gray-50/50 px-4 py-3">
          <button
            type="button"
            disabled={busy}
            onClick={onPublishDraft}
            className={`${btnPrimary} bg-brand text-white`}
          >
            发布草稿
          </button>
        </div>
      )}
    </li>
  );
}
