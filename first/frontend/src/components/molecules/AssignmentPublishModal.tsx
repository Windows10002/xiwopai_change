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

type AssignmentPublishModalProps = {
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

export function AssignmentPublishModal({
  open,
  onClose,
  busy,
  editing,
  onSubmit,
}: AssignmentPublishModalProps) {
  const session = useAppSession();
  const classOptions = useMemo(
    () => buildClassOptions(session),
    [session?.loginAccount, session?.teachingGrades],
  );

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<WorkspaceSubject>("math");
  const [className, setClassName] = useState("");
  const [description, setDescription] = useState("");
  const [dueAtLocal, setDueAtLocal] = useState("");
  const [targetNames, setTargetNames] = useState("");
  const [answerKeyImageFile, setAnswerKeyImageFile] = useState<File | null>(null);
  const [answerKeyPreview, setAnswerKeyPreview] = useState<string | null>(null);
  const [answerKeyRemoved, setAnswerKeyRemoved] = useState(false);
  const [storedAnswerKeyImage, setStoredAnswerKeyImage] = useState("");
  const answerKeyInputRef = useRef<HTMLInputElement>(null);
  const dueFieldRef = useRef<DueDateTimeFieldHandle>(null);
  const titleFieldRef = useRef<HTMLInputElement>(null);
  const classFieldRef = useRef<HTMLSelectElement>(null);
  const dueWrapRef = useRef<HTMLDivElement>(null);
  const targetWrapRef = useRef<HTMLDivElement>(null);
  const [publishing, setPublishing] = useState(false);
  const [sendAnswerToParent, setSendAnswerToParent] = useState(false);
  const [maxSubmissions, setMaxSubmissions] = useState(0);
  const [allowedFormats, setAllowedFormats] = useState<string[]>(["jpg", "jpeg", "png", "webp"]);
  const [scoringRubric, setScoringRubric] = useState("");
  const [teacherAttachmentNote, setTeacherAttachmentNote] = useState("");
  const [teacherAttachFile, setTeacherAttachFile] = useState<File | null>(null);
  const [teacherAttachPreview, setTeacherAttachPreview] = useState<string | null>(null);
  const [teacherAttachRemoved, setTeacherAttachRemoved] = useState(false);
  const [storedTeacherAttachImage, setStoredTeacherAttachImage] = useState("");
  const teacherAttachInputRef = useRef<HTMLInputElement>(null);
  const [notifyStudentParent, setNotifyStudentParent] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const FORMAT_OPTIONS = ["jpg", "jpeg", "png", "webp"] as const;

  useEffect(() => {
    if (!open) return;
    seedDemoRosterIfEmpty();
    if (editing) {
      setTitle(editing.title);
      setSubject(editing.subject);
      setClassName(editing.class_name);
      setDescription(editing.description);
      setDueAtLocal(toLocalDatetimeValue(editing.due_at));
      setTargetNames(editing.target_student_names.join("、"));
      setStoredAnswerKeyImage(editing.answer_key_image ?? "");
      setAnswerKeyPreview(editing.answer_key_image_url ?? null);
      setAnswerKeyImageFile(null);
      setAnswerKeyRemoved(false);
      setSendAnswerToParent(Boolean(editing.send_answer_to_parent));
      setMaxSubmissions(editing.max_submissions ?? 0);
      setAllowedFormats(editing.allowed_formats ?? ["jpg", "jpeg", "png", "webp"]);
      setScoringRubric(editing.scoring_rubric ?? "");
      setTeacherAttachmentNote(editing.teacher_attachment_note ?? "");
      setStoredTeacherAttachImage(editing.teacher_attachment_image ?? "");
      setTeacherAttachPreview(editing.teacher_attachment_image_url ?? null);
      setTeacherAttachFile(null);
      setTeacherAttachRemoved(false);
      setNotifyStudentParent(editing.notify_student_parent !== false);
    } else {
      const opts = buildClassOptions(session);
      setTitle("");
      setSubject("math");
      setClassName(opts[0] ?? "");
      setDescription("");
      setDueAtLocal("");
      setTargetNames("");
      setStoredAnswerKeyImage("");
      setAnswerKeyPreview(null);
      setAnswerKeyImageFile(null);
      setAnswerKeyRemoved(false);
      setSendAnswerToParent(false);
      setMaxSubmissions(0);
      setAllowedFormats(["jpg", "jpeg", "png", "webp"]);
      setScoringRubric("");
      setTeacherAttachmentNote("");
      setStoredTeacherAttachImage("");
      setTeacherAttachPreview(null);
      setTeacherAttachFile(null);
      setTeacherAttachRemoved(false);
      setNotifyStudentParent(true);
    }
    setErr(null);
  }, [open, editing?.id, session?.loginAccount, session?.teachingGrades]);

  const rosterPreview = useMemo(() => {
    if (className.trim()) return rosterStudentsForClass(className).slice(0, 12);
    return loadStudentRoster().slice(0, 12);
  }, [open, className]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setClassName(classOptions[0] ?? "");
    setDueAtLocal("");
    setTargetNames("");
    setStoredAnswerKeyImage("");
    setAnswerKeyPreview(null);
    setAnswerKeyImageFile(null);
    setAnswerKeyRemoved(false);
    setSendAnswerToParent(false);
    setMaxSubmissions(0);
    setAllowedFormats(["jpg", "jpeg", "png", "webp"]);
    setScoringRubric("");
    setTeacherAttachmentNote("");
    setStoredTeacherAttachImage("");
    setTeacherAttachPreview(null);
    setTeacherAttachFile(null);
    setTeacherAttachRemoved(false);
    setNotifyStudentParent(true);
    setErr(null);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const scrollToField = (el: HTMLElement | null | undefined) => {
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const submit = async () => {
    dueFieldRef.current?.close();
    if (title.trim().length < 2) {
      setErr("请填写任务标题（至少 2 个字）");
      scrollToField(titleFieldRef.current);
      return;
    }
    if (!className.trim()) {
      setErr("请选择班级");
      scrollToField(classFieldRef.current);
      return;
    }
    if (!dueAtLocal.trim()) {
      setErr("请设置截止时间（可点「明天 18:00」等快捷项）");
      scrollToField(dueWrapRef.current);
      return;
    }
    const names = targetNames
      .split(/[,，、\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.length) {
      setErr("请指定布置对象（至少一名学生，可从名册选择）");
      scrollToField(targetWrapRef.current);
      return;
    }
    setErr(null);
    setPublishing(true);
    try {
      const payload: AssignmentPayload = {
        subject,
        title: title.trim(),
        description: description.trim(),
        class_name: className.trim(),
        due_at: localDatetimeToIso(dueAtLocal),
        target_student_names: names,
        send_answer_to_parent: sendAnswerToParent,
        publish: true,
        max_submissions: maxSubmissions,
        allowed_formats: allowedFormats,
        scoring_rubric: scoringRubric.trim(),
        teacher_attachment_note: teacherAttachmentNote.trim(),
        notify_student_parent: notifyStudentParent,
        submission_mode: "both",
        hide_answer_from_student: false,
      };
      if (answerKeyRemoved) {
        payload.answer_key_image = "";
        payload.clear_answer_key_image = true;
      } else if (!answerKeyImageFile && storedAnswerKeyImage) {
        payload.answer_key_image = storedAnswerKeyImage;
      }
      if (teacherAttachRemoved) {
        payload.teacher_attachment_image = "";
        payload.clear_teacher_attachment_image = true;
      } else if (!teacherAttachFile && storedTeacherAttachImage) {
        payload.teacher_attachment_image = storedTeacherAttachImage;
      }
      const files: AssignmentUploadFiles = {};
      if (answerKeyImageFile) files.answerKeyFile = answerKeyImageFile;
      if (teacherAttachFile) files.teacherAttachmentFile = teacherAttachFile;
      await onSubmit(
        payload,
        editing?.id,
        files.answerKeyFile || files.teacherAttachmentFile ? files : null,
      );
      reset();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "发布失败，请稍后重试");
    } finally {
      setPublishing(false);
    }
  };

  const actionBusy = busy || publishing;

  const onPickAnswerKeyImage = (file: File | undefined) => {
    if (!file) return;
    setAnswerKeyImageFile(file);
    setAnswerKeyRemoved(false);
    const url = URL.createObjectURL(file);
    setAnswerKeyPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
  };

  const onPickTeacherAttach = (file: File | undefined) => {
    if (!file) return;
    setTeacherAttachFile(file);
    setTeacherAttachRemoved(false);
    const url = URL.createObjectURL(file);
    setTeacherAttachPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
  };

  const clearTeacherAttach = () => {
    setTeacherAttachFile(null);
    setTeacherAttachRemoved(true);
    setStoredTeacherAttachImage("");
    setTeacherAttachPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    if (teacherAttachInputRef.current) teacherAttachInputRef.current.value = "";
  };

  const clearAnswerKeyImage = () => {
    setAnswerKeyImageFile(null);
    setAnswerKeyRemoved(true);
    setStoredAnswerKeyImage("");
    setAnswerKeyPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    if (answerKeyInputRef.current) answerKeyInputRef.current.value = "";
  };

  const fillFromRoster = () => {
    const roster = className.trim() ? rosterStudentsForClass(className) : loadStudentRoster();
    if (!roster.length) {
      setErr("请先在设置中添加学生名册，或点击名册中的学生");
      return;
    }
    setTargetNames(roster.map((s) => s.name).join("、"));
    setErr(null);
  };

  const addNameChip = (name: string) => {
    const parts = targetNames
      .split(/[,，、\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.includes(name)) return;
    setTargetNames([...parts, name].join("、"));
  };

  return (
    <AppDialog
      open={open}
      onClose={handleClose}
      title={editing ? "编辑任务" : "发布新任务"}
      subtitle="填写任务信息并选择布置对象，发布后将通知学生与家长"
      size="lg"
      zIndex={120}
      closeDisabled={busy}
      footer={
        <div className="space-y-2">
          {err ? (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-caption font-semibold text-red-700"
            >
              {err}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={actionBusy}
              onClick={handleClose}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-black/[0.1] bg-white px-4 text-small font-bold text-ink-muted"
            >
              取消
            </button>
            <PrimaryButton
              disabled={actionBusy}
              className="min-h-10 gap-2 px-6"
              onClick={() => void submit()}
            >
              {actionBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" {...CUTE_ICON} aria-hidden />
              ) : (
                <Plus className="h-4 w-4" {...CUTE_ICON} aria-hidden />
              )}
              {editing ? "保存修改" : "立即发布"}
            </PrimaryButton>
          </div>
        </div>
      }
    >
      <div className={`space-y-4 ${APP_DIALOG_PANEL}`}>
        <div>
          <label className="mb-1 block text-caption font-bold text-ink">
            任务标题 <span className="text-red-600">*</span>
          </label>
          <input
            ref={titleFieldRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="如：第三单元练习"
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
            <label className="mb-1 block text-caption font-bold text-ink">
              班级 <span className="text-red-600">*</span>
            </label>
            <select
              ref={classFieldRef}
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full min-h-10 rounded-xl border border-black/[0.1] px-3 text-small"
            >
              <option value="">请选择班级</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div ref={dueWrapRef}>
          <label className="mb-1 block text-caption font-bold text-ink">
            截止时间 <span className="text-red-600">*</span>
          </label>
          <DueDateTimeField
            ref={dueFieldRef}
            value={dueAtLocal}
            onChange={setDueAtLocal}
            disabled={actionBusy}
          />
        </div>
        <div>
          <label className="mb-1 block text-caption font-bold text-ink">教师附件（选填，上传图片）</label>
          <input
            ref={teacherAttachInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
            className="hidden"
            onChange={(e) => onPickTeacherAttach(e.target.files?.[0])}
          />
          {teacherAttachPreview ? (
            <div className="relative overflow-hidden rounded-xl border border-black/[0.1] bg-black/[0.02]">
              <img src={teacherAttachPreview} alt="教师附件预览" className="max-h-40 w-full object-contain" />
              <button
                type="button"
                onClick={clearTeacherAttach}
                className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white"
                aria-label="移除教师附件"
              >
                <X className="h-4 w-4" {...CUTE_ICON} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => teacherAttachInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-sky-300/50 bg-sky-50/40 py-6 text-caption text-ink-muted transition hover:border-sky-400/60 hover:bg-sky-50/70"
            >
              <ImagePlus className="h-7 w-7 text-sky-600" {...CUTE_ICON} aria-hidden />
              点击上传任务附件图片（学生/家长可见）
            </button>
          )}
          {teacherAttachPreview ? (
            <button
              type="button"
              onClick={() => teacherAttachInputRef.current?.click()}
              className="mt-2 text-caption font-bold text-sky-700"
            >
              更换附件
            </button>
          ) : null}
          <textarea
            value={teacherAttachmentNote}
            onChange={(e) => setTeacherAttachmentNote(e.target.value)}
            rows={2}
            placeholder="可补充文字说明（选填）"
            className="mt-2 w-full rounded-xl border border-black/[0.1] px-3 py-2 text-small"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-caption font-bold text-ink">提交次数上限</label>
            <input
              type="number"
              min={0}
              value={maxSubmissions}
              onChange={(e) => setMaxSubmissions(Math.max(0, Number(e.target.value) || 0))}
              className="w-full min-h-10 rounded-xl border border-black/[0.1] px-3 text-small"
            />
            <p className="mt-1 text-[0.65rem] text-ink-muted">0 表示不限；截止前可重新交卷</p>
          </div>
          <div>
            <label className="mb-1 block text-caption font-bold text-ink">允许附件格式</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {FORMAT_OPTIONS.map((fmt) => (
                <label key={fmt} className="flex cursor-pointer items-center gap-1 text-caption">
                  <input
                    type="checkbox"
                    checked={allowedFormats.includes(fmt)}
                    onChange={(e) => {
                      setAllowedFormats((prev) =>
                        e.target.checked ? [...prev, fmt] : prev.filter((f) => f !== fmt),
                      );
                    }}
                    className="h-3.5 w-3.5 rounded border-black/20 text-brand"
                  />
                  .{fmt}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-caption font-bold text-ink">评分细则（选填）</label>
          <textarea
            value={scoringRubric}
            onChange={(e) => setScoringRubric(e.target.value)}
            rows={2}
            placeholder="如：步骤分、结果分等"
            className="w-full rounded-xl border border-black/[0.1] px-3 py-2 text-small"
          />
        </div>
        <div>
          <label className="mb-1 block text-caption font-bold text-ink">任务说明（选填）</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="完成要求、注意事项等"
            className="w-full rounded-xl border border-black/[0.1] px-3 py-2 text-small"
          />
        </div>
        <div ref={targetWrapRef}>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <label className="text-caption font-bold text-ink">
              布置对象 <span className="text-red-600">*</span>
            </label>
            <button
              type="button"
              onClick={fillFromRoster}
              className="inline-flex items-center gap-1 text-caption font-bold text-brand"
            >
              <Users className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
              从名册导入
            </button>
          </div>
          <textarea
            value={targetNames}
            onChange={(e) => setTargetNames(e.target.value)}
            rows={2}
            placeholder="请从下方名册点选，或填写：张三、李四"
            className="w-full rounded-xl border border-black/[0.1] px-3 py-2 text-small"
          />
          <p className="mt-1.5 text-[0.65rem] text-ink-muted">
            名册示例（设置中可维护）：{className ? `当前班级 ${className}` : "全部学生"}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {rosterPreview.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => addNameChip(s.name)}
                className="rounded-full bg-primary-tint/60 px-2.5 py-0.5 text-[0.65rem] font-bold text-[#006D41] ring-1 ring-primary/15"
              >
                + {s.name}
                {s.className ? ` · ${s.className}` : ""}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-caption font-bold text-ink">参考答案（选填，上传图片）</label>
          <input
            ref={answerKeyInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
            className="hidden"
            onChange={(e) => onPickAnswerKeyImage(e.target.files?.[0])}
          />
          {answerKeyPreview ? (
            <div className="relative overflow-hidden rounded-xl border border-black/[0.1] bg-black/[0.02]">
              <img src={answerKeyPreview} alt="参考答案预览" className="max-h-48 w-full object-contain" />
              <button
                type="button"
                onClick={clearAnswerKeyImage}
                className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white"
                aria-label="移除参考答案"
              >
                <X className="h-4 w-4" {...CUTE_ICON} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => answerKeyInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary-tint/20 py-8 text-caption text-ink-muted transition hover:border-brand/40 hover:bg-primary-tint/40"
            >
              <ImagePlus className="h-8 w-8 text-brand" {...CUTE_ICON} aria-hidden />
              点击上传参考答案图片（JPG / PNG 等）
            </button>
          )}
          <p className="mt-1 text-[0.65rem] text-ink-muted">
            上传后自动批改时会将图片传给 AI 对照判分；家长端是否可见由下方选项决定
          </p>
          {answerKeyPreview ? (
            <button
              type="button"
              onClick={() => answerKeyInputRef.current?.click()}
              className="mt-2 text-caption font-bold text-brand"
            >
              更换图片
            </button>
          ) : null}
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-caption text-ink">
            <input
              type="checkbox"
              checked={sendAnswerToParent}
              onChange={(e) => setSendAnswerToParent(e.target.checked)}
              className="h-4 w-4 rounded border-black/20 text-brand"
            />
            将参考答案同步至家长端（家长无需交卷，仅供对照）
          </label>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-caption text-ink">
          <input
            type="checkbox"
            checked={notifyStudentParent}
            onChange={(e) => setNotifyStudentParent(e.target.checked)}
            className="h-4 w-4 rounded border-black/20 text-brand"
          />
          发布时通知学生与家长
        </label>
      </div>
    </AppDialog>
  );
}
