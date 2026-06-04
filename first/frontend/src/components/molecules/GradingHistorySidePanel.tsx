import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, FolderOpen, Pencil, Tag, Type } from "lucide-react";

import { AppLink } from "@/components/atoms/AppLink";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { HistoryEntryThumb } from "@/components/atoms/HistoryEntryThumb";
import { AppDialog, APP_DIALOG_PANEL } from "@/components/molecules/AppDialog";
import {
  GradingHistoryDeleteConfirmDialog,
  type GradingHistoryDeleteKind,
} from "@/components/molecules/GradingHistoryDeleteConfirmDialog";
import { withAuthSlot } from "@/lib/authSlot";
import {
  buildGroupedHistoryRows,
  clearGradingHistoryForSubject,
  deleteGradingHistoryEntry,
  deleteGradingHistoryGroup,
  GRADING_HISTORY_CHANGED,
  historyEntryTitle,
  loadGradingHistory,
  updateGradingHistoryEntry,
  type GradingHistoryEntry,
  type HistoryDisplayRow,
} from "@/lib/gradingHistory";
import { deleteHistoryImageBlob } from "@/lib/gradingHistoryImageDb";

type TimeFilter = "all" | "today" | "week" | "month";
type TaskFilter = "all" | "batch" | "single" | "task";

type GradingHistorySidePanelProps = {
  open: boolean;
  subject: "math" | "english" | "chinese";
  subjectLabel: string;
  entries: GradingHistoryEntry[];
  onClose: () => void;
  onRefresh: () => void;
  onApplyEntry: (entry: GradingHistoryEntry) => void;
  onDeleteImageBlob: (id: string) => void;
};

const SUBJECT_TAG: Record<"math" | "english" | "chinese", string> = {
  math: "数学",
  english: "英语",
  chinese: "语文",
};

const TIME_OPTIONS: { id: TimeFilter; label: string }[] = [
  { id: "all", label: "全部时间" },
  { id: "today", label: "今天" },
  { id: "week", label: "近 7 天" },
  { id: "month", label: "近 30 天" },
];

const TASK_OPTIONS: { id: TaskFilter; label: string }[] = [
  { id: "all", label: "全部任务" },
  { id: "single", label: "单次批改" },
  { id: "batch", label: "文件夹" },
  { id: "task", label: "发布任务" },
];

function matchTimeFilter(createdAt: number, filter: TimeFilter): boolean {
  if (filter === "all") return true;
  const elapsed = Date.now() - createdAt;
  const day = 24 * 60 * 60 * 1000;
  if (filter === "today") return elapsed < day;
  if (filter === "week") return elapsed < 7 * day;
  if (filter === "month") return elapsed < 30 * day;
  return true;
}

function entryTaskLabel(entry: GradingHistoryEntry): string {
  if (entry.assignmentTitle?.trim()) return entry.assignmentTitle.trim();
  if (entry.groupName?.trim()) return `${entry.groupName.trim()}（文件夹）`;
  return "单次批改";
}

function filterEntries(
  entries: GradingHistoryEntry[],
  timeFilter: TimeFilter,
  taskFilter: TaskFilter,
): GradingHistoryEntry[] {
  return entries.filter((e) => {
    if (!matchTimeFilter(e.createdAt, timeFilter)) return false;
    if (taskFilter === "batch" && !e.groupKey) return false;
    if (taskFilter === "single" && e.groupKey) return false;
    if (taskFilter === "task" && !e.assignmentTitle?.trim()) return false;
    return true;
  });
}

function FilterPills<T extends string>({
  label,
  icon: Icon,
  options,
  value,
  onChange,
}: {
  label: string;
  icon: typeof Calendar;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-[0.65rem] font-bold text-ink-muted">
        <Icon className="h-3 w-3" {...CUTE_ICON} aria-hidden />
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-full px-2.5 py-1 text-[0.65rem] font-bold transition ${
              value === opt.id
                ? "bg-[#52C41A] text-white shadow-sm"
                : "bg-white text-ink-muted ring-1 ring-black/[0.08] hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function HistoryRenameDialog({
  open,
  initialTitle,
  onClose,
  onSave,
}: {
  open: boolean;
  initialTitle: string;
  onClose: () => void;
  onSave: (title: string) => void;
}) {
  const [value, setValue] = useState(initialTitle);

  useEffect(() => {
    if (open) setValue(initialTitle);
  }, [open, initialTitle]);

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="重命名记录"
      subtitle="仅修改展示标题，不影响原文件名与批改内容"
      size="md"
      zIndex={120}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-black/[0.1] bg-white px-4 text-small font-bold text-ink-muted transition hover:bg-black/[0.03]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              const trimmed = value.trim();
              if (trimmed) onSave(trimmed);
            }}
            disabled={!value.trim()}
            className="btn-brand-primary min-h-10 px-6 text-small disabled:opacity-50"
          >
            保存
          </button>
        </div>
      }
    >
      <div className={APP_DIALOG_PANEL}>
        <label htmlFor="history-rename-input" className="mb-1.5 flex items-center gap-1.5 text-small font-bold text-ink">
          <Type className="h-3.5 w-3.5 text-[#006D41]" {...CUTE_ICON} aria-hidden />
          展示标题
        </label>
        <input
          id="history-rename-input"
          type="text"
          value={value}
          maxLength={120}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-xl border border-black/[0.1] bg-white px-3 py-2.5 text-small text-ink shadow-sm outline-none transition focus:border-primary/35 focus:ring-2 focus:ring-primary/15"
          placeholder="输入便于识别的名称"
        />
        <p className="mt-1.5 text-[0.65rem] text-ink-muted">{value.trim().length}/120</p>
      </div>
    </AppDialog>
  );
}

function HistoryMetaTags({ entry }: { entry: GradingHistoryEntry }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-2 py-0.5 text-[0.6rem] font-semibold text-[#006D41] ring-1 ring-primary/15">
        <Tag className="h-2.5 w-2.5" {...CUTE_ICON} aria-hidden />
        学科 · {SUBJECT_TAG[entry.subject]}
      </span>
      <span className="rounded-full bg-white/90 px-2 py-0.5 text-[0.6rem] font-semibold text-ink-muted ring-1 ring-black/[0.06]">
        时间 · {new Date(entry.createdAt).toLocaleDateString("zh-CN")}
      </span>
      <span className="max-w-full truncate rounded-full bg-white/90 px-2 py-0.5 text-[0.6rem] font-semibold text-ink-muted ring-1 ring-black/[0.06]">
        任务 · {entryTaskLabel(entry)}
      </span>
      {entry.assignmentId ? (
        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[0.6rem] font-semibold text-teal-800 ring-1 ring-teal-200/80">
          已关联作业
        </span>
      ) : null}
      {entry.studentName?.trim() ? (
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[0.6rem] font-semibold text-ink-muted ring-1 ring-black/[0.06]">
          学生 · {entry.studentName.trim()}
        </span>
      ) : null}
      {entry.gradeLevel?.trim() ? (
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[0.6rem] font-semibold text-ink-muted ring-1 ring-black/[0.06]">
          年级 · {entry.gradeLevel.trim()}
        </span>
      ) : null}
    </div>
  );
}

function SingleHistoryCard({
  entry,
  onApply,
  onRename,
  onRequestDelete,
}: {
  entry: GradingHistoryEntry;
  onApply: (entry: GradingHistoryEntry) => void;
  onRename: (entry: GradingHistoryEntry) => void;
  onRequestDelete: (entry: GradingHistoryEntry) => void;
}) {
  const title = historyEntryTitle(entry);

  return (
    <li className="rounded-2xl border border-black/[0.06] bg-primary-tint/30 p-3 shadow-sm">
      <div className="flex gap-3">
        <HistoryEntryThumb
          entryId={entry.id}
          legacyThumbDataUrl={entry.thumbDataUrl}
          className="h-14 w-14 shrink-0 rounded-lg border border-black/[0.06] object-cover shadow-sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 truncate text-small font-bold text-ink">{title}</p>
            <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[0.65rem] font-black text-[#006D41] ring-1 ring-primary/20">
              {entry.detail.scorePercent}%
            </span>
          </div>
          <p className="mt-2 line-clamp-3 text-caption leading-relaxed text-ink-muted">
            {entry.detail.summaryText || entry.detail.overallLabel}
          </p>
          <HistoryMetaTags entry={entry} />
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1 border-t border-black/[0.05] pt-2">
        <button
          type="button"
          onClick={() => onApply(entry)}
          className="inline-flex min-h-8 flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[0.65rem] font-bold text-[#006D41] transition hover:bg-white/80"
        >
          <Pencil className="h-3 w-3" {...CUTE_ICON} aria-hidden />
          编辑
        </button>
        <button
          type="button"
          onClick={() => onRename(entry)}
          className="inline-flex min-h-8 flex-1 items-center justify-center rounded-lg px-2 py-1.5 text-[0.65rem] font-bold text-ink-muted transition hover:bg-white/80"
        >
          重命名
        </button>
        <button
          type="button"
          onClick={() => onRequestDelete(entry)}
          className="inline-flex min-h-8 flex-1 items-center justify-center rounded-lg px-2 py-1.5 text-[0.65rem] font-bold text-red-600 transition hover:bg-red-50/80"
        >
          删除
        </button>
      </div>
    </li>
  );
}

function GroupHistoryCard({
  row,
  onApply,
  onRequestDeleteGroup,
}: {
  row: Extract<HistoryDisplayRow, { type: "group" }>;
  onApply: (entry: GradingHistoryEntry) => void;
  onRequestDeleteGroup: (row: Extract<HistoryDisplayRow, { type: "group" }>) => void;
}) {
  return (
    <li className="rounded-2xl border border-brand/25 bg-primary-tint/40 p-3 shadow-sm ring-1 ring-primary/12">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] pb-2">
        <p className="text-small font-extrabold text-[#006D41]">
          {row.groupName ? `${row.groupName} · ${row.items.length} 张` : `文件夹批改 · ${row.items.length} 张`}
        </p>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[0.65rem] font-black text-[#006D41] ring-1 ring-primary/20">
          均分 {Math.round(row.items.reduce((s, i) => s + i.detail.scorePercent, 0) / row.items.length)}%
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[0.6rem] font-semibold text-[#006D41] ring-1 ring-primary/15">
          学科 · {SUBJECT_TAG[row.items[0]?.subject ?? "math"]}
        </span>
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[0.6rem] font-semibold text-ink-muted ring-1 ring-black/[0.06]">
          时间 · {new Date(row.createdAt).toLocaleDateString("zh-CN")}
        </span>
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[0.6rem] font-semibold text-ink-muted ring-1 ring-black/[0.06]">
          任务 · 文件夹批改
        </span>
      </div>
      <ul className="scrollbar-primary-mint mt-2 max-h-52 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5">
        {row.items.map((h) => (
          <li key={h.id} className="rounded-xl bg-white/80 ring-1 ring-black/[0.05]">
            <div className="flex items-center gap-2 px-2 py-2">
              <HistoryEntryThumb entryId={h.id} legacyThumbDataUrl={h.thumbDataUrl} />
              <span className="min-w-0 flex-1 truncate text-caption font-semibold text-ink">{historyEntryTitle(h)}</span>
              <span className="shrink-0 text-[0.65rem] font-bold text-[#006D41]">{h.detail.scorePercent}%</span>
              <button
                type="button"
                onClick={() => onApply(h)}
                className="shrink-0 rounded-lg px-2 py-1 text-[0.6rem] font-bold text-[#006D41] hover:bg-primary-tint/50"
              >
                编辑
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-2 w-full rounded-lg py-1.5 text-center text-[0.65rem] font-semibold text-red-600 hover:bg-red-50/80 hover:underline"
        onClick={() => onRequestDeleteGroup(row)}
      >
        删除整组
      </button>
    </li>
  );
}

type GradingHistoryPanelContentProps = {
  subject: "math" | "english" | "chinese";
  subjectLabel: string;
  entries: GradingHistoryEntry[];
  onRefresh: () => void;
  onApplyEntry: (entry: GradingHistoryEntry) => void;
  onDeleteImageBlob: (id: string) => void;
  showClearSubject?: boolean;
};

function GradingHistoryPanelContent({
  subject,
  subjectLabel,
  entries,
  onRefresh,
  onApplyEntry,
  onDeleteImageBlob,
  showClearSubject = true,
}: GradingHistoryPanelContentProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [renameTarget, setRenameTarget] = useState<GradingHistoryEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GradingHistoryDeleteKind | null>(null);

  const historyForSubject = useMemo(() => entries.filter((e) => e.subject === subject), [entries, subject]);
  const filtered = useMemo(
    () => filterEntries(historyForSubject, timeFilter, taskFilter),
    [historyForSubject, timeFilter, taskFilter],
  );
  const historyRows = useMemo(() => buildGroupedHistoryRows(filtered), [filtered]);

  return (
    <>
      <div className="space-y-3 border-b border-black/[0.06] bg-primary-tint/15 px-4 py-3">
        <FilterPills
          label="时间"
          icon={Calendar}
          options={TIME_OPTIONS}
          value={timeFilter}
          onChange={setTimeFilter}
        />
        <FilterPills
          label="任务"
          icon={FolderOpen}
          options={TASK_OPTIONS}
          value={taskFilter}
          onChange={setTaskFilter}
        />
        {showClearSubject ? (
          <button
            type="button"
            className="rounded-full border border-red-200/90 bg-red-50/90 px-3 py-1.5 text-caption font-semibold text-red-700 shadow-sm transition hover:bg-red-100"
            onClick={() => setDeleteTarget({ type: "clearSubject", subjectLabel })}
          >
            清空本学科
          </button>
        ) : null}
      </div>

      <div className="scrollbar-primary-mint min-h-[20rem] flex-1 overflow-y-auto px-3 py-3 md:min-h-[24rem]">
        {historyRows.length === 0 ? (
          <p className="px-2 py-8 text-center text-caption text-ink-muted">
            {historyForSubject.length === 0 ? "暂无历史，批改成功后会自动记录结果。" : "当前筛选条件下暂无记录。"}
          </p>
        ) : (
          <ul className="space-y-3">
            {historyRows.map((row) =>
              row.type === "single" ? (
                <SingleHistoryCard
                  key={row.entry.id}
                  entry={row.entry}
                  onApply={onApplyEntry}
                  onRename={setRenameTarget}
                  onRequestDelete={(entry) =>
                    setDeleteTarget({ type: "single", id: entry.id, title: historyEntryTitle(entry) })
                  }
                />
              ) : (
                <GroupHistoryCard
                  key={row.groupKey}
                  row={row}
                  onApply={onApplyEntry}
                  onRequestDeleteGroup={(g) =>
                    setDeleteTarget({
                      type: "group",
                      groupKey: g.groupKey,
                      title: g.groupName ? `${g.groupName}` : "文件夹批改",
                      count: g.items.length,
                    })
                  }
                />
              ),
            )}
          </ul>
        )}
      </div>

      <HistoryRenameDialog
        open={Boolean(renameTarget)}
        initialTitle={renameTarget ? historyEntryTitle(renameTarget) : ""}
        onClose={() => setRenameTarget(null)}
        onSave={(title) => {
          if (!renameTarget) return;
          updateGradingHistoryEntry(renameTarget.id, { displayTitle: title });
          onRefresh();
          setRenameTarget(null);
        }}
      />

      <GradingHistoryDeleteConfirmDialog
        open={Boolean(deleteTarget)}
        target={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.type === "single") {
            if (deleteGradingHistoryEntry(deleteTarget.id)) {
              void onDeleteImageBlob(deleteTarget.id);
            }
          } else if (deleteTarget.type === "group") {
            const removed = deleteGradingHistoryGroup(deleteTarget.groupKey);
            removed.forEach((id) => void onDeleteImageBlob(id));
          } else {
            const removed = clearGradingHistoryForSubject(subject);
            removed.forEach((id) => void onDeleteImageBlob(id));
          }
          setDeleteTarget(null);
          onRefresh();
        }}
      />
    </>
  );
}

type GradingHistoryEmbeddedPanelProps = {
  /** 已由学情中心按学期筛过的条目；缺省则读全部本机历史 */
  historyEntries?: GradingHistoryEntry[];
};

/** 学情中心内嵌：完整批改历史（数学 / 英语） */
export function GradingHistoryEmbeddedPanel({ historyEntries }: GradingHistoryEmbeddedPanelProps = {}) {
  const navigate = useNavigate();
  const [subject, setSubject] = useState<"math" | "english" | "chinese">("math");
  const [version, setVersion] = useState(0);

  const entries = useMemo(() => historyEntries ?? loadGradingHistory(), [version, historyEntries]);
  const subjectLabel = SUBJECT_TAG[subject];
  const historyForSubject = useMemo(() => entries.filter((e) => e.subject === subject), [entries, subject]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    const onHist = () => refresh();
    window.addEventListener(GRADING_HISTORY_CHANGED, onHist);
    return () => window.removeEventListener(GRADING_HISTORY_CHANGED, onHist);
  }, [refresh]);

  const onApplyEntry = useCallback(
    (entry: GradingHistoryEntry) => {
      const path =
        entry.subject === "english" ? "/english" : entry.subject === "chinese" ? "/chinese" : "/math";
      navigate(withAuthSlot(path), { state: { historyEntryId: entry.id } });
    },
    [navigate],
  );

  const onDeleteImageBlob = useCallback((id: string) => {
    void deleteHistoryImageBlob(id);
  }, []);

  return (
    <div className="glass-panel flex min-h-[28rem] flex-col overflow-hidden rounded-2xl">
      <div className="border-b border-black/[0.06] px-4 py-4 md:px-5">
        <p className="text-body font-extrabold text-ink">批改历史</p>
        <p className="mt-1 text-caption text-ink-muted">
          查找单条批改并打开编辑 · 与「按批次」「按学生」共用本机数据 · 当前范围共 {historyForSubject.length} 条
          {subjectLabel}记录
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(["math", "english", "chinese"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSubject(s)}
              className={`rounded-full px-3 py-1.5 text-caption font-bold transition ${
                subject === s ? "bg-primary text-white shadow-sm" : "bg-white/90 text-ink-muted ring-1 ring-black/[0.08]"
              }`}
            >
              {SUBJECT_TAG[s]}
            </button>
          ))}
          <AppLink
            to={subject === "english" ? "/english" : subject === "chinese" ? "/chinese" : "/math"}
            className="ml-auto text-caption font-bold text-brand hover:underline"
          >
            打开{subjectLabel}批改页 →
          </AppLink>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <GradingHistoryPanelContent
          subject={subject}
          subjectLabel={subjectLabel}
          entries={entries}
          onRefresh={refresh}
          onApplyEntry={onApplyEntry}
          onDeleteImageBlob={onDeleteImageBlob}
        />
      </div>
    </div>
  );
}

export function GradingHistorySidePanel({
  open,
  subject,
  subjectLabel,
  entries,
  onClose,
  onRefresh,
  onApplyEntry,
  onDeleteImageBlob,
}: GradingHistorySidePanelProps) {
  const historyForSubject = useMemo(() => entries.filter((e) => e.subject === subject), [entries, subject]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/35 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-label="批改历史">
      <button type="button" className="absolute inset-0" aria-label="关闭历史" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-black/[0.08] bg-white shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.06] px-4 py-4">
          <div className="min-w-0">
            <p className="text-body font-extrabold text-ink">批改历史 · {subjectLabel}</p>
            <p className="mt-1 text-caption text-ink-muted">约 1 年内本地记录 · 共 {historyForSubject.length} 条</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-black/[0.08] px-3 py-1.5 text-caption font-semibold text-ink-muted hover:bg-black/[0.03]"
            onClick={onClose}
          >
            关闭
          </button>
        </div>
        <GradingHistoryPanelContent
          subject={subject}
          subjectLabel={subjectLabel}
          entries={entries}
          onRefresh={onRefresh}
          onApplyEntry={(e) => {
            onApplyEntry(e);
            onClose();
          }}
          onDeleteImageBlob={onDeleteImageBlob}
        />
      </aside>
    </div>
  );
}
