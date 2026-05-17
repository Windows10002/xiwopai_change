import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";

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

type GradingContextModalProps = {
  open: boolean;
  fileCount: number;
  /** 设置里开启「记住批改上下文」时预填 */
  initialGradeLevel?: string;
  initialTeacherNote?: string;
  rememberContext?: boolean;
  /** 教师端：收集学生姓名，用于个性化学情 */
  collectStudentName?: boolean;
  initialStudentName?: string;
  onConfirm: (gradeLevel: string, teacherNote: string, studentName?: string) => void;
  onCancel: () => void;
};

export function GradingContextModal({
  open,
  fileCount,
  initialGradeLevel = "",
  initialTeacherNote = "",
  rememberContext = false,
  collectStudentName = false,
  initialStudentName = "",
  onConfirm,
  onCancel,
}: GradingContextModalProps) {
  const titleId = useId();
  const [gradeLevel, setGradeLevel] = useState("");
  const [teacherNote, setTeacherNote] = useState("");
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    if (!open) return;
    if (rememberContext) {
      setGradeLevel(initialGradeLevel);
      setTeacherNote(initialTeacherNote);
    } else {
      setGradeLevel("");
      setTeacherNote("");
    }
    setStudentName(collectStudentName ? initialStudentName : "");
  }, [open, rememberContext, initialGradeLevel, initialTeacherNote, collectStudentName, initialStudentName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

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
            <h2 id={titleId} className="text-body font-extrabold text-ink">
              批改前补充信息
            </h2>
            <p className="mt-1 text-caption leading-snug text-ink-muted">
              已选择 {fileCount} 张图片。年级与备注均为选填，将一并提交给模型以辅助学情判断与精准批改。
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white text-ink-muted transition hover:border-primary/30 hover:text-ink"
            aria-label="取消选择"
          >
            <X className="h-5 w-5" {...CUTE_ICON} />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          {collectStudentName ? (
            <div>
              <label htmlFor="grading-student-name" className="mb-1.5 block text-small font-bold text-ink">
                学生姓名
              </label>
              <input
                id="grading-student-name"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value.slice(0, 32))}
                maxLength={32}
                placeholder="例如：张三（用于个性化学情汇总，选填）"
                className="w-full rounded-xl border border-black/[0.1] bg-white px-3 py-2.5 text-small text-ink shadow-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              />
            </div>
          ) : null}
          <div>
            <label htmlFor="grading-grade-level" className="mb-1.5 block text-small font-bold text-ink">
              学生年级
            </label>
            <select
              id="grading-grade-level"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="w-full rounded-xl border border-black/[0.1] bg-white px-3 py-2.5 text-small text-ink shadow-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            >
              {GRADE_LEVEL_OPTIONS.map((o) => (
                <option key={o.value || "none"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="grading-teacher-note" className="mb-1.5 block text-small font-bold text-ink">
              备注（学情说明）
            </label>
            <textarea
              id="grading-teacher-note"
              value={teacherNote}
              onChange={(e) => setTeacherNote(e.target.value.slice(0, 800))}
              rows={4}
              maxLength={800}
              placeholder="例如：本班刚学完分数除法，整体计算偏弱；该生平时书写较慢等。可不填。"
              className="w-full resize-y rounded-xl border border-black/[0.1] bg-white px-3 py-2.5 text-small leading-relaxed text-ink shadow-sm outline-none transition placeholder:text-ink-subtle focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-caption text-ink-muted">{teacherNote.length}/800</p>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-black/[0.06] px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-black/[0.1] bg-white px-4 text-small font-bold text-ink-muted transition hover:border-amber-300 hover:bg-amber-50/80 hover:text-amber-950"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() =>
              onConfirm(gradeLevel.trim(), teacherNote.trim(), collectStudentName ? studentName.trim() : undefined)
            }
            className="btn-brand-primary min-h-10 px-6 text-small"
          >
            继续
          </button>
        </div>
      </div>
    </div>
  );
}
