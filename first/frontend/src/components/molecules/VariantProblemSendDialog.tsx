import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Send, Users } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { AppDialog, APP_DIALOG_PANEL } from "@/components/molecules/AppDialog";
import { useAppSession } from "@/hooks/useAppSession";
import { parseTeachingClasses } from "@/lib/teacherClasses";
import {
  dispatchVariantTask,
  dispatchVariantToClasses,
  VARIANT_DISPATCH_SCOPE_LABEL,
  type VariantDispatchScope,
  type VariantTaskPayload,
} from "@/lib/variantDispatch";
import type { GradingResultDetail } from "@/types/grading";

export type VariantProblemItem = VariantTaskPayload & {
  index: number;
  difficulty?: string;
  variation_type?: string;
};

type AudienceMode = "class" | VariantDispatchScope;

type VariantProblemSendDialogProps = {
  open: boolean;
  onClose: () => void;
  problems: VariantProblemItem[];
  subject: "math" | "english";
  gradeLevel?: string;
  entries: Array<{ fileName: string; detail: GradingResultDetail; studentName?: string }>;
  currentStudentName?: string;
  currentSubmissionId?: string;
};

function formatResult(res: { sent: number; missingStudents: string[]; errors: string[] }) {
  const parts: string[] = [];
  if (res.sent > 0) parts.push(`已成功发送 ${res.sent} 人次`);
  if (res.missingStudents.length) {
    parts.push(
      `${res.missingStudents.length} 名尚无作业记录（${res.missingStudents.slice(0, 3).join("、")}${res.missingStudents.length > 3 ? "…" : ""}）`,
    );
  }
  if (res.errors.length) parts.push(res.errors[0]!);
  return parts.join("；") || "未找到可发送的学生";
}

export function VariantProblemSendDialog({
  open,
  onClose,
  problems,
  subject,
  gradeLevel,
  entries,
  currentStudentName,
  currentSubmissionId,
}: VariantProblemSendDialogProps) {
  const session = useAppSession();
  const teachingClasses = useMemo(() => parseTeachingClasses(session), [session]);

  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(() => new Set(problems.map((p) => p.index)));
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("class");
  const [selectedClasses, setSelectedClasses] = useState<string[]>(() =>
    teachingClasses.length === 1 ? [teachingClasses[0]!] : [],
  );
  const [busy, setBusy] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedIndexes(new Set(problems.map((p) => p.index)));
    setAudienceMode("class");
    setSelectedClasses(teachingClasses.length === 1 ? [teachingClasses[0]!] : []);
    setResultMsg(null);
  }, [open, problems, teachingClasses]);

  const selectedTasks = useMemo(
    () => problems.filter((p) => selectedIndexes.has(p.index)),
    [problems, selectedIndexes],
  );

  const toggleIndex = (index: number) => {
    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleClass = (name: string) => {
    setSelectedClasses((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  };

  const selectAll = () => setSelectedIndexes(new Set(problems.map((p) => p.index)));
  const clearAll = () => setSelectedIndexes(new Set());

  const handleSend = async () => {
    if (!selectedTasks.length) {
      setResultMsg("请至少选择一道变形题");
      return;
    }
    if (audienceMode === "class" && !selectedClasses.length) {
      setResultMsg("请至少选择一个任教班级");
      return;
    }

    setBusy(true);
    setResultMsg(null);
    let totalSent = 0;
    const missingSet = new Set<string>();
    const errors: string[] = [];

    try {
      for (const task of selectedTasks) {
        const payload: VariantTaskPayload = {
          knowledge_point: task.knowledge_point,
          stem: task.stem,
          answer_hint: task.answer_hint,
        };
        const res =
          audienceMode === "class"
            ? await dispatchVariantToClasses(selectedClasses, payload, { subject })
            : await dispatchVariantTask(audienceMode, payload, {
                subject,
                gradeLevel,
                knowledgePoint: task.knowledge_point,
                batchEntries: entries,
                currentStudentName,
                currentSubmissionId,
              });
        totalSent += res.sent;
        res.missingStudents.forEach((n) => missingSet.add(n));
        errors.push(...res.errors);
      }
      setResultMsg(formatResult({ sent: totalSent, missingStudents: [...missingSet], errors }));
      if (totalSent > 0 && errors.length === 0) {
        window.setTimeout(() => onClose(), 1800);
      }
    } catch (e) {
      setResultMsg(e instanceof Error ? e.message : "发送失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="发送变形题给学生"
      subtitle="选择要布置的题目与接收对象，可一次发送多道变形题"
      size="lg"
      zIndex={130}
      closeDisabled={busy}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-black/[0.1] bg-white px-4 text-small font-bold text-ink-muted transition hover:bg-black/[0.03] disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={busy || !selectedTasks.length}
            onClick={() => void handleSend()}
            className="btn-brand-primary inline-flex min-h-10 items-center justify-center gap-2 px-6 text-small disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" {...CUTE_ICON} aria-hidden />}
            {busy ? "发送中…" : `一键发送（${selectedTasks.length} 题）`}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className={APP_DIALOG_PANEL}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-small font-extrabold text-[#006D41]">选择变形题</p>
            <div className="flex gap-2">
              <button type="button" onClick={selectAll} className="text-[0.65rem] font-bold text-[#006D41] hover:underline">
                全选
              </button>
              <button type="button" onClick={clearAll} className="text-[0.65rem] font-bold text-ink-muted hover:underline">
                清空
              </button>
            </div>
          </div>
          <ul className="scrollbar-primary-mint mt-2 max-h-48 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5">
            {problems.map((p) => {
              const checked = selectedIndexes.has(p.index);
              return (
                <li key={p.index}>
                  <button
                    type="button"
                    onClick={() => toggleIndex(p.index)}
                    className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                      checked ? "bg-primary-tint/55 ring-1 ring-primary/20" : "hover:bg-white/60"
                    }`}
                  >
                    <span
                      className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        checked ? "border-[#52C41A] bg-[#52C41A] text-white" : "border-black/15 bg-white"
                      }`}
                    >
                      {checked ? <Check className="h-2.5 w-2.5" {...CUTE_ICON} aria-hidden /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-caption font-bold text-ink">
                        {p.index + 1}. {p.knowledge_point}
                        {p.difficulty ? (
                          <span className="ml-1 font-semibold text-ink-muted">
                            · {p.difficulty}
                            {p.variation_type ? ` · ${p.variation_type}` : ""}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-[0.65rem] leading-snug text-ink-muted">{p.stem}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={APP_DIALOG_PANEL}>
          <p className="flex items-center gap-1.5 text-small font-extrabold text-[#006D41]">
            <Users className="h-4 w-4" {...CUTE_ICON} aria-hidden />
            发送对象
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setAudienceMode("class")}
              className={`rounded-full px-3 py-1.5 text-caption font-bold transition ${
                audienceMode === "class"
                  ? "bg-[#52C41A] text-white shadow-sm"
                  : "bg-white/80 text-ink-muted ring-1 ring-black/[0.08] hover:text-ink"
              }`}
            >
              任教班级
            </button>
            {(Object.keys(VARIANT_DISPATCH_SCOPE_LABEL) as VariantDispatchScope[]).map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => setAudienceMode(scope)}
                className={`rounded-full px-3 py-1.5 text-caption font-bold transition ${
                  audienceMode === scope
                    ? "bg-[#52C41A] text-white shadow-sm"
                    : "bg-white/80 text-ink-muted ring-1 ring-black/[0.08] hover:text-ink"
                }`}
              >
                {VARIANT_DISPATCH_SCOPE_LABEL[scope]}
              </button>
            ))}
          </div>

          {audienceMode === "class" ? (
            <div className="mt-3">
              <p className="mb-2 text-[0.65rem] leading-snug text-ink-muted">可多选班级；将所选题目发送给对应班级学生</p>
              {teachingClasses.length === 0 ? (
                <p className="rounded-xl border border-dashed border-black/10 bg-white/50 px-3 py-4 text-center text-caption text-ink-muted">
                  未配置任教班级，请在账号信息中补充。
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {teachingClasses.map((cls) => {
                    const checked = selectedClasses.includes(cls);
                    return (
                      <li key={cls}>
                        <button
                          type="button"
                          onClick={() => toggleClass(cls)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-semibold transition ${
                            checked
                              ? "bg-primary-tint/70 text-[#006D41] ring-1 ring-primary/25"
                              : "bg-white text-ink-muted ring-1 ring-black/[0.08] hover:text-ink"
                          }`}
                        >
                          <span
                            className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded border ${
                              checked ? "border-[#52C41A] bg-[#52C41A] text-white" : "border-black/15 bg-white"
                            }`}
                          >
                            {checked ? <Check className="h-2 w-2" {...CUTE_ICON} aria-hidden /> : null}
                          </span>
                          {cls}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <p className="mt-3 text-[0.65rem] leading-relaxed text-ink-muted">
              将按每道题的知识点「
              {selectedTasks.length ? selectedTasks.map((t) => t.knowledge_point).join("、") : "—"}
              」匹配{VARIANT_DISPATCH_SCOPE_LABEL[audienceMode]}。
            </p>
          )}
        </div>

        {resultMsg ? (
          <p className="rounded-xl border border-primary/15 bg-primary-tint/30 px-3 py-2 text-caption font-medium text-ink-muted">
            {resultMsg}
          </p>
        ) : null}
      </div>
    </AppDialog>
  );
}

type VariantProblemSendTriggerProps = Omit<VariantProblemSendDialogProps, "open" | "onClose">;

/** 标题行统一入口：图标按钮 + 弹窗 */
export function VariantProblemSendTrigger(props: VariantProblemSendTriggerProps) {
  const [open, setOpen] = useState(false);
  if (!props.problems.length) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="发送变形题给学生"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/25 bg-white/90 px-3 py-1.5 text-caption font-bold text-[#006D41] shadow-sm transition hover:border-primary/40 hover:bg-primary-tint/40"
      >
        <Send className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
        发送给学生
      </button>
      <VariantProblemSendDialog open={open} onClose={() => setOpen(false)} {...props} />
    </>
  );
}
