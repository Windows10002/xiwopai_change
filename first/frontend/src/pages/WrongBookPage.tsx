import { useCallback, useEffect, useMemo, useState } from "react";

import { BookOpen, Calculator, CheckCircle2, Languages, Trash2 } from "lucide-react";

import { AppLink } from "@/components/atoms/AppLink";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { StudentPageShell } from "@/components/molecules/StudentPageShell";
import { GRADING_HISTORY_CHANGED } from "@/lib/gradingHistory";
import type { GradeSubject } from "@/lib/gradeSubject";
import { WORKSPACE_ASSIGNMENTS_CHANGED } from "@/lib/workspaceAssignmentsSync";
import {
  dismissWrongBookItem,
  formatWrongBookDate,
  listWrongBookTags,
  loadWrongBookItems,
  markWrongBookCorrected,
  subjectLabelCn,
  WRONG_BOOK_CHANGED,
  type WrongBookItem,
} from "@/lib/wrongQuestionBook";

type SubjectFilter = "all" | GradeSubject;

function subjectIcon(subject: GradeSubject) {
  if (subject === "math") return Calculator;
  if (subject === "chinese") return BookOpen;
  return Languages;
}

function WrongBookRow({
  item,
  onDismiss,
  onCorrected,
}: {
  item: WrongBookItem;
  onDismiss: (id: string) => void;
  onCorrected: (id: string) => void;
}) {
  const SubjectIcon = subjectIcon(item.subject);
  return (
    <li className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm ring-1 ring-primary/10 transition hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary ring-1 ring-primary/15">
            <SubjectIcon className="h-5 w-5" {...CUTE_ICON} aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="campus-tag campus-tag--sky">{subjectLabelCn(item.subject)}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${item.status === "未作答" ? "bg-amber-100 text-amber-900" : "bg-rose-100 text-rose-800"}`}
              >
                {item.status}
              </span>
              <span className="text-caption text-ink-muted">{formatWrongBookDate(item.createdAt)}</span>
            </div>
            <h3 className="mt-1.5 text-body font-bold text-ink">{item.questionLabel}</h3>
            <p className="mt-0.5 text-caption text-ink-muted">
              来自：{item.groupName ?? item.fileName}
              <span className="mx-1 text-ink-subtle">·</span>
              得分 {item.scoreText}
            </p>
            {item.detail ? (
              <p className="mt-2 rounded-xl bg-primary-tint/60 px-3 py-2 text-small leading-relaxed text-ink-muted">
                {item.detail}
              </p>
            ) : null}
            {item.weakKnowledgeTags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.weakKnowledgeTags.slice(0, 5).map((tag) => (
                  <span key={tag} className="campus-tag campus-tag--mint text-[0.625rem]">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onCorrected(item.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-caption font-semibold text-emerald-800 transition hover:bg-emerald-100"
            title="标记为已订正"
          >
            <CheckCircle2 className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
            已订正
          </button>
          <button
            type="button"
            onClick={() => onDismiss(item.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-black/[0.08] bg-white px-2.5 py-1.5 text-caption font-semibold text-ink-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            title="从错题本移除（不删除批改历史）"
          >
            <Trash2 className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
            移除
          </button>
        </div>
      </div>
    </li>
  );
}

export function WrongBookPage() {
  const [filter, setFilter] = useState<SubjectFilter>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [showCorrected, setShowCorrected] = useState(false);
  const tags = useMemo(() => listWrongBookTags(), []);
  const [items, setItems] = useState(() => loadWrongBookItems({ includeCorrected: showCorrected, tag: tagFilter }));

  const refresh = useCallback(
    () => setItems(loadWrongBookItems({ includeCorrected: showCorrected, tag: tagFilter })),
    [showCorrected, tagFilter],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener(GRADING_HISTORY_CHANGED, onChange);
    window.addEventListener(WORKSPACE_ASSIGNMENTS_CHANGED, onChange);
    window.addEventListener(WRONG_BOOK_CHANGED, onChange);
    return () => {
      window.removeEventListener(GRADING_HISTORY_CHANGED, onChange);
      window.removeEventListener(WORKSPACE_ASSIGNMENTS_CHANGED, onChange);
      window.removeEventListener(WRONG_BOOK_CHANGED, onChange);
    };
  }, [refresh]);

  const filtered = useMemo(() => {
    let list = items;
    if (filter !== "all") list = list.filter((i) => i.subject === filter);
    return list;
  }, [items, filter]);

  const mathCount = items.filter((i) => i.subject === "math").length;
  const englishCount = items.filter((i) => i.subject === "english").length;
  const chineseCount = items.filter((i) => i.subject === "chinese").length;

  return (
    <StudentPageShell pageTitle="我的错题本">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="home-hero-card campus-tape-card notebook-card rounded-[1.35rem] px-5 py-8 shadow-card ring-1 ring-white/90 sm:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-md ring-2 ring-white/80">
              <BookOpen className="h-6 w-6" {...CUTE_ICON} aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-ink">我的错题本</h1>
              <p className="mt-1 text-small text-ink-muted">自动收录批改中标记为「错误」「未作答」的题目，方便课后复习。</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-caption font-semibold text-ink-muted">
              <input type="checkbox" checked={showCorrected} onChange={(e) => setShowCorrected(e.target.checked)} />
              显示已订正
            </label>
            {tags.length > 0 ? (
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-caption font-bold text-ink-muted"
              >
                <option value="">全部知识点</option>
                {tags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                { key: "all" as const, label: `全部 (${items.length})` },
                { key: "math" as const, label: `数学 (${mathCount})` },
                { key: "chinese" as const, label: `语文 (${chineseCount})` },
                { key: "english" as const, label: `英语 (${englishCount})` },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1.5 text-caption font-bold transition ${
                  filter === key
                    ? "bg-primary text-white shadow-sm"
                    : "border border-black/[0.08] bg-white text-ink-muted hover:border-primary/30"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-primary/25 bg-primary-tint/40 px-6 py-12 text-center">
              <p className="text-body font-bold text-ink">还没有错题记录</p>
              <p className="mt-2 text-small text-ink-muted">完成一次作业批改后，错题会自动出现在这里。</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <AppLink to="/math" className="btn-brand-primary inline-flex min-h-10 items-center rounded-full px-5 text-small font-bold">
                  去批改数学
                </AppLink>
                <AppLink
                  to="/chinese"
                  className="inline-flex min-h-10 items-center rounded-full border border-amber-300/80 bg-amber-50 px-5 text-small font-bold text-amber-950 hover:bg-amber-100"
                >
                  去批改语文
                </AppLink>
                <AppLink
                  to="/english"
                  className="inline-flex min-h-10 items-center rounded-full border border-primary/30 bg-white px-5 text-small font-bold text-ink-navActive hover:bg-primary-tint"
                >
                  去批改英语
                </AppLink>
              </div>
            </div>
          ) : (
            <ul className="mt-6 space-y-4">
              {filtered.map((item) => (
                <WrongBookRow
                  key={item.id}
                  item={item}
                  onDismiss={(id) => {
                    dismissWrongBookItem(id);
                    refresh();
                  }}
                  onCorrected={(id) => {
                    markWrongBookCorrected(id);
                    refresh();
                  }}
                />
              ))}
            </ul>
          )}

          <p className="mt-8 text-center text-caption text-ink-subtle">
            移除仅隐藏本条，不会删除「批改历史」中的原始记录。
          </p>
        </div>
      </main>
    </StudentPageShell>
  );
}
