import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Users, X } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { PrimaryButton } from "@/components/atoms/PrimaryButton";
import { AppDialog, APP_DIALOG_PANEL } from "@/components/molecules/AppDialog";
import { DueDateTimeField, type DueDateTimeFieldHandle } from "@/components/molecules/DueDateTimeField";
import {
  loadStudentRoster,
  rosterStudentsForClass,
  seedDemoRosterIfEmpty,
} from "@/lib/studentRoster";
import { buildClassOptions } from "@/lib/teacherClasses";
import type {
  AssignmentPayload,
  AssignmentUploadFiles,
  WorkspaceAssignment,
  WorkspaceSubject,
} from "@/lib/workspaceApi";
import { useAppSession } from "@/hooks/useAppSession";

type ExamPublishModalProps = {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  editing?: WorkspaceAssignment | null;
  onSubmit: (payload: AssignmentPayload, editingId?: string, files?: AssignmentUploadFiles | null) => Promise<void>;
};

function toLocalDatetimeValue(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function localDatetimeToIso(value: string): string {
  if (!value.trim()) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.trim();
  return d.toISOString();
}

/** 课堂考试：与日常「发布作业」分离，默认教师代录、对学生隐藏答案 */
export function ExamPublishModal({ open, onClose, busy, editing, onSubmit }: ExamPublishModalProps) {
  const session = useAppSession();
  const classOptions = useMemo(
    () => buildClassOptions(session),
    [session?.loginAccount, session?.teachingGrades],
  );

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<WorkspaceSubject>("math");
  const [className, setClassName] = useState("");
  const [dueAtLocal, setDueAtLocal] = useState("");
  const [targetNames, setTargetNames] = useState("");
  const [answerKeyImageFile, setAnswerKeyImageFile] = useState<File | null>(null);
  const [answerKeyPreview, setAnswerKeyPreview] = useState<string | null>(null);
  const [answerKeyRemoved, setAnswerKeyRemoved] = useState(false);
  const [storedAnswerKeyImage, setStoredAnswerKeyImage] = useState("");
  const answerKeyInputRef = useRef<HTMLInputElement>(null);
  const dueFieldRef = useRef<DueDateTimeFieldHandle>(null);
  const [sendAnswerToParent, setSendAnswerToParent] = useState(false);
  const [scoringRubric, setScoringRubric] = useState("");
  const [notifyStudentParent, setNotifyStudentParent] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    seedDemoRosterIfEmpty();
    if (editing) {
      setTitle(editing.title);
      setSubject(editing.subject);
      setClassName(editing.class_name);
      setDueAtLocal(toLocalDatetimeValue(editing.due_at));
      setTargetNames(editing.target_student_names.join("、"));
      setStoredAnswerKeyImage(editing.answer_key_image ?? "");
      setAnswerKeyPreview(editing.answer_key_image_url ?? null);
      setAnswerKeyImageFile(null);
      setAnswerKeyRemoved(false);
      setSendAnswerToParent(Boolean(editing.send_answer_to_parent));
      setScoringRubric(editing.scoring_rubric ?? "");
      setNotifyStudentParent(editing.notify_student_parent !== false);
    } else {
      const opts = buildClassOptions(session);
      setTitle("");
      setSubject("math");
      setClassName(opts[0] ?? "");
      setDueAtLocal("");
      setTargetNames("");
      setStoredAnswerKeyImage("");
      setAnswerKeyPreview(null);
      setAnswerKeyImageFile(null);
      setAnswerKeyRemoved(false);
      setSendAnswerToParent(false);
      setScoringRubric("");
      setNotifyStudentParent(true);
    }
    setErr(null);
  }, [open, editing?.id, session?.loginAccount, session?.teachingGrades]);

  const rosterPreview = useMemo(() => {
    if (className.trim()) return rosterStudentsForClass(className).slice(0, 12);
    return loadStudentRoster().slice(0, 12);
  }, [open, className]);

  const submit = async () => {
    dueFieldRef.current?.close();
    if (title.trim().length < 2) {
      setErr("请填写考试名称（至少 2 个字）");
      return;
    }
    if (!className.trim()) {
      setErr("请选择班级");
      return;
    }
    if (!dueAtLocal.trim()) {
      setErr("请设置考试时间/截止时间");
      return;
    }
    const names = targetNames
      .split(/[,，、\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.length) {
      setErr("请指定参考学生（至少一名）");
      return;
    }
    setErr(null);
    setPublishing(true);
    try {
      const payload: AssignmentPayload = {
        subject,
        title: title.trim(),
        class_name: className.trim(),
        due_at: localDatetimeToIso(dueAtLocal),
        target_student_names: names,
        send_answer_to_parent: sendAnswerToParent,
        publish: true,
        scoring_rubric: scoringRubric.trim(),
        notify_student_parent: notifyStudentParent,
        submission_mode: "teacher",
        hide_answer_from_student: true,
      };
      if (answerKeyRemoved) {
        payload.answer_key_image = "";
        payload.clear_answer_key_image = true;
      } else if (!answerKeyImageFile && storedAnswerKeyImage) {
        payload.answer_key_image = storedAnswerKeyImage;
      }
      const files: AssignmentUploadFiles = {};
      if (answerKeyImageFile) files.answerKeyFile = answerKeyImageFile;
      await onSubmit(payload, editing?.id, files.answerKeyFile ? files : null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "保存失败");
    } finally {
      setPublishing(false);
    }
  };

  const actionBusy = busy || publishing;

  return (
    <AppDialog
      open={open}
      onClose={() => !actionBusy && onClose()}
      title={editing ? "编辑考试" : "发起课堂考试"}
      subtitle="创建后在「课堂考试」页上传试卷；审阅下发后可开放标准答案"
      size="lg"
      zIndex={120}
      closeDisabled={actionBusy}
      footer={
        <div className="space-y-2">
          {err ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-caption font-semibold text-red-700">
              {err}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={actionBusy}
              onClick={onClose}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-black/[0.1] bg-white px-4 text-small font-bold text-ink-muted"
            >
              取消
            </button>
            <PrimaryButton disabled={actionBusy} className="min-h-10 gap-2 px-6" onClick={() => void submit()}>
              {actionBusy ? <Loader2 className="h-4 w-4 animate-spin" {...CUTE_ICON} aria-hidden /> : <Plus className="h-4 w-4" {...CUTE_ICON} aria-hidden />}
              {editing ? "保存" : "创建考试"}
            </PrimaryButton>
          </div>
        </div>
      }
    >
      <div className={`space-y-4 ${APP_DIALOG_PANEL}`}>
        <div>
          <label className="mb-1 block text-caption font-bold text-ink">考试名称 *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="如：第三单元测验"
            className="w-full min-h-10 rounded-xl border border-black/[0.1] px-3 text-small"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-caption font-bold text-ink">学科</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as WorkspaceSubject)}
              className="w-full min-h-10 rounded-xl border border-black/[0.1] px-3 text-small"
            >
              <option value="math">数学</option>
              <option value="english">英语</option>
              <option value="chinese">语文</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-caption font-bold text-ink">班级 *</label>
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full min-h-10 rounded-xl border border-black/[0.1] px-3 text-small"
            >
              <option value="">请选择</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-caption font-bold text-ink">截止时间 *</label>
          <DueDateTimeField ref={dueFieldRef} value={dueAtLocal} onChange={setDueAtLocal} disabled={actionBusy} />
        </div>
        <div>
          <div className="mb-1 flex justify-between gap-2">
            <label className="text-caption font-bold text-ink">参考学生 *</label>
            <button
              type="button"
              onClick={() => {
                const roster = className.trim() ? rosterStudentsForClass(className) : loadStudentRoster();
                setTargetNames(roster.map((s) => s.name).join("、"));
              }}
              className="inline-flex items-center gap-1 text-caption font-bold text-brand"
            >
              <Users className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
              导入全班
            </button>
          </div>
          <textarea
            value={targetNames}
            onChange={(e) => setTargetNames(e.target.value)}
            rows={2}
            placeholder="张三、李四"
            className="w-full rounded-xl border border-black/[0.1] px-3 py-2 text-small"
          />
          <div className="mt-1 flex flex-wrap gap-1.5">
            {rosterPreview.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  const parts = targetNames.split(/[,，、\s]+/).map((x) => x.trim()).filter(Boolean);
                  if (!parts.includes(s.name)) setTargetNames([...parts, s.name].join("、"));
                }}
                className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[0.65rem] font-bold text-violet-900 ring-1 ring-violet-200"
              >
                + {s.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-caption font-bold text-ink">标准答案图（供 AI 批改，考后开放给学生）</label>
          <input
            ref={answerKeyInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setAnswerKeyImageFile(file);
              setAnswerKeyRemoved(false);
              const url = URL.createObjectURL(file);
              setAnswerKeyPreview((prev) => {
                if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                return url;
              });
            }}
          />
          {answerKeyPreview ? (
            <div className="relative overflow-hidden rounded-xl border border-black/[0.1]">
              <img src={answerKeyPreview} alt="答案预览" className="max-h-40 w-full object-contain" />
              <button
                type="button"
                onClick={() => {
                  setAnswerKeyImageFile(null);
                  setAnswerKeyRemoved(true);
                  setStoredAnswerKeyImage("");
                  setAnswerKeyPreview(null);
                  if (answerKeyInputRef.current) answerKeyInputRef.current.value = "";
                }}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white"
              >
                <X className="h-4 w-4" {...CUTE_ICON} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => answerKeyInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-violet-300/50 bg-violet-50/40 py-6 text-caption text-ink-muted"
            >
              <ImagePlus className="h-7 w-7 text-violet-700" {...CUTE_ICON} aria-hidden />
              上传标准答案卷
            </button>
          )}
        </div>
        <div>
          <label className="mb-1 block text-caption font-bold text-ink">评分细则（选填）</label>
          <textarea
            value={scoringRubric}
            onChange={(e) => setScoringRubric(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-black/[0.1] px-3 py-2 text-small"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-caption">
          <input type="checkbox" checked={sendAnswerToParent} onChange={(e) => setSendAnswerToParent(e.target.checked)} className="h-4 w-4" />
          开放答案后同步给家长
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-caption">
          <input type="checkbox" checked={notifyStudentParent} onChange={(e) => setNotifyStudentParent(e.target.checked)} className="h-4 w-4" />
          通知学生与家长
        </label>
      </div>
    </AppDialog>
  );
}
