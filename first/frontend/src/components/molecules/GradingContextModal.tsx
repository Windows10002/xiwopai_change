import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { loadStudentRoster } from "@/lib/studentRoster";
import { loadNoteTemplates } from "@/lib/teacherNoteTemplates";

export const GRADE_LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "暂不填写（由模型结合卷面判断）" },
  { value: "小学一年级", label: "小学一年级" },
  { value: "小学二年级", label: "小学二年级" },
  { value: "小学三年级", label: "小学三年级" },
  { value: "小学四年级", label: "小学四年级" },
  { value: "小学五年级", label: "小学五年级" },
  { value: "小学六年级", label: "小学六年级" },
  { value: "初一", label: "初一" },
  { value: "初二", label: "初二" },
  { value: "初三", label: "初三" },
  { value: "高一", label: "高一" },
  { value: "高二", label: "高二" },
  { value: "高三", label: "高三" },
];

export type GradingContextConfirmPayload = {
  gradeLevel: string;
  teacherNote: string;
  studentName?: string;
  essayPromptText?: string;
  essayPromptFile?: File | null;
};

type GradingContextModalProps = {
  open: boolean;
  fileCount: number;
  subject?: "math" | "english";
  initialGradeLevel?: string;
  /** 未勾选「记住上次」时，默认选中的学生年级（如教师任教年级） */
  defaultGradeLevel?: string;
  initialTeacherNote?: string;
  rememberContext?: boolean;
  /** 教师端：收集学生姓名，用于个性化学情 */
  collectStudentName?: boolean;
  initialStudentName?: string;
  onConfirm: (payload: GradingContextConfirmPayload) => void;
  onCancel: () => void;
};

const PROMPT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/bmp,image/gif";

export function GradingContextModal({
  open,
  fileCount,
  subject = "math",
  initialGradeLevel = "",
  defaultGradeLevel = "",
  initialTeacherNote = "",
  rememberContext = false,
  collectStudentName = false,
  initialStudentName = "",
  onConfirm,
  onCancel,
}: GradingContextModalProps) {
  const titleId = useId();
  const promptFileInputRef = useRef<HTMLInputElement>(null);
  const [gradeLevel, setGradeLevel] = useState("");
  const [teacherNote, setTeacherNote] = useState("");
  const [studentName, setStudentName] = useState("");
  const [includeEssayPrompt, setIncludeEssayPrompt] = useState(false);
  const [essayPromptText, setEssayPromptText] = useState("");
  const [essayPromptFile, setEssayPromptFile] = useState<File | null>(null);

  const isEnglish = subject === "english";
  const roster = collectStudentName ? loadStudentRoster() : [];
  const noteTemplates = loadNoteTemplates();

  useEffect(() => {
    if (!open) return;
    const resolvedGrade =
      rememberContext && initialGradeLevel.trim()
        ? initialGradeLevel
        : defaultGradeLevel || initialGradeLevel;
    setGradeLevel(resolvedGrade);
    setTeacherNote(rememberContext ? initialTeacherNote : "");
    setIncludeEssayPrompt(false);
    setEssayPromptText("");
    setEssayPromptFile(null);
    setStudentName(collectStudentName ? initialStudentName : "");
  }, [open, rememberContext, initialGradeLevel, defaultGradeLevel, initialTeacherNote, collectStudentName, initialStudentName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  const handlePromptFileChange = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setEssayPromptFile(file);
  };

  const handleConfirm = () => {
    const payload: GradingContextConfirmPayload = {
      gradeLevel: gradeLevel.trim(),
      teacherNote: teacherNote.trim(),
    };
    if (collectStudentName) {
      const name = studentName.trim();
      if (name) payload.studentName = name;
    }
    if (isEnglish && includeEssayPrompt) {
      const text = essayPromptText.trim();
      if (text) payload.essayPromptText = text;
      if (essayPromptFile) payload.essayPromptFile = essayPromptFile;
    }
    onConfirm(payload);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-label="关闭" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[1.25rem] border border-black/[0.08] bg-white shadow-[0_24px_80px_rgba(15,90,75,0.22)]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-body font-extrabold text-ink">批改前补充信息</h2>
            <p className="mt-1 text-caption leading-snug text-ink-muted">
              已选择 {fileCount} 张图片。年级与备注均为选填。
              {isEnglish ? " 可提供考试题目，提高批改准确率并判断是否偏题。" : " 将提交给模型辅助批改。"}
            </p>
          </div>
          <button type="button" onClick={onCancel} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white" aria-label="取消">
            <X className="h-5 w-5" {...CUTE_ICON} />
          </button>
        </div>
        <div className="max-h-[min(70vh,28rem)] space-y-4 overflow-y-auto px-5 py-4">
          {collectStudentName ? (
            <div>
              <label htmlFor="grading-student-name" className="mb-1.5 block text-small font-bold text-ink">
                学生姓名
              </label>
              <input
                id="grading-student-name"
                type="text"
                list="grading-student-roster"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value.slice(0, 32))}
                maxLength={32}
                placeholder="例如：张三（用于个性化学情汇总，选填）"
                className="w-full rounded-xl border border-black/[0.1] bg-white px-3 py-2.5 text-small text-ink shadow-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              />
              {roster.length > 0 ? (
                <datalist id="grading-student-roster">
                  {roster.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              ) : null}
            </div>
          ) : null}
          <div>
            <label htmlFor="grading-grade-level" className="mb-1.5 block text-small font-bold text-ink">学生年级</label>
            <select id="grading-grade-level" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="w-full rounded-xl border border-black/[0.1] bg-white px-3 py-2.5 text-small">
              {GRADE_LEVEL_OPTIONS.map((o) => (<option key={o.value || "none"} value={o.value}>{o.label}</option>))}
            </select>
          </div>
          <div>
            <label htmlFor="grading-teacher-note" className="mb-1.5 block text-small font-bold text-ink">备注（学情说明）</label>
            <textarea id="grading-teacher-note" value={teacherNote} onChange={(e) => setTeacherNote(e.target.value.slice(0, 800))} rows={3} maxLength={800} className="w-full rounded-xl border border-black/[0.1] px-3 py-2.5 text-small" />
            {noteTemplates.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {noteTemplates.slice(0, 4).map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => setTeacherNote((prev) => (prev ? `${prev}\n${tpl}` : tpl).slice(0, 800))}
                    className="rounded-full border border-primary/20 bg-primary-tint/60 px-2 py-0.5 text-[0.62rem] font-semibold text-ink-muted hover:border-primary/35"
                  >
                    + {tpl.slice(0, 14)}
                    {tpl.length > 14 ? "…" : ""}
                  </button>
                ))}
              </div>
            ) : null}
            <p className="mt-1 text-caption text-ink-muted">{teacherNote.length}/800</p>
          </div>
          {isEnglish ? (
            <div className="rounded-xl border border-primary/20 bg-primary-tint/40 p-3">
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={includeEssayPrompt} onChange={(e) => setIncludeEssayPrompt(e.target.checked)} className="mt-1" />
                <span><span className="block text-small font-bold">提供作文题目（选填）</span><span className="block text-caption text-ink-muted">填写或上传题目，便于判断扣题、偏题。</span></span>
              </label>
              {includeEssayPrompt ? (
                <div className="mt-3 space-y-2 border-t border-primary/15 pt-3">
                  <textarea value={essayPromptText} onChange={(e) => setEssayPromptText(e.target.value.slice(0, 2000))} rows={3} placeholder="题干、写作要求" className="w-full rounded-xl border px-3 py-2 text-small" />
                  <input ref={promptFileInputRef} type="file" accept={PROMPT_IMAGE_ACCEPT} className="sr-only" onChange={(e) => { handlePromptFileChange(e.target.files); e.target.value = ""; }} />
                  <button type="button" onClick={() => promptFileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-caption font-bold"><ImagePlus className="h-4 w-4" />选择题目图片</button>
                  {essayPromptFile ? <p className="text-caption text-ink-muted">已选：{essayPromptFile.name}</p> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2 text-small font-bold">取消</button>
          <button type="button" onClick={handleConfirm} className="btn-brand-primary px-6 py-2 text-small">继续</button>
        </div>
      </div>
    </div>
  );
}
