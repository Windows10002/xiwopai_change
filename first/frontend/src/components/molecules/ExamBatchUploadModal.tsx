import { useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, FolderUp, Loader2, Upload } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { PrimaryButton } from "@/components/atoms/PrimaryButton";
import { AppDialog, APP_DIALOG_PANEL } from "@/components/molecules/AppDialog";
import { submitAssignmentWork, type WorkspaceAssignment } from "@/lib/workspaceApi";

type ExamBatchUploadModalProps = {
  open: boolean;
  assignment: WorkspaceAssignment | null;
  onClose: () => void;
  onComplete: () => void;
};

type RowStatus = "idle" | "uploading" | "done" | "error";

function matchStudentFromFileName(fileName: string, students: string[]): string | null {
  const base = fileName.replace(/\.[^.]+$/i, "").trim();
  if (!base) return null;
  for (const name of students) {
    const n = name.trim();
    if (!n) continue;
    if (base.includes(n) || base.toLowerCase().includes(n.toLowerCase())) return n;
  }
  return null;
}

export function ExamBatchUploadModal({ open, assignment, onClose, onComplete }: ExamBatchUploadModalProps) {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [statusByStudent, setStatusByStudent] = useState<Record<string, RowStatus>>({});
  const [errByStudent, setErrByStudent] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [batchMsg, setBatchMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const batchRef = useRef<HTMLInputElement>(null);

  const students = useMemo(() => assignment?.target_student_names ?? [], [assignment]);

  const doneCount = useMemo(
    () => Object.values(statusByStudent).filter((s) => s === "done").length,
    [statusByStudent],
  );

  const reset = () => {
    setSelectedStudent("");
    setStatusByStudent({});
    setErrByStudent({});
    setBusy(false);
    setBatchMsg(null);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const uploadFor = async (name: string, file: File): Promise<boolean> => {
    if (!assignment) return false;
    setStatusByStudent((m) => ({ ...m, [name]: "uploading" }));
    setErrByStudent((m) => {
      const next = { ...m };
      delete next[name];
      return next;
    });
    try {
      await submitAssignmentWork(assignment.id, file, {
        studentName: name,
        autoPublish: false,
      });
      setStatusByStudent((m) => ({ ...m, [name]: "done" }));
      return true;
    } catch (e) {
      setStatusByStudent((m) => ({ ...m, [name]: "error" }));
      setErrByStudent((m) => ({
        ...m,
        [name]: e instanceof Error ? e.message : "上传失败",
      }));
      return false;
    }
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file || !selectedStudent.trim() || !assignment) return;
    setBusy(true);
    await uploadFor(selectedStudent.trim(), file);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const pickStudentAndFile = (name: string) => {
    setSelectedStudent(name);
    fileRef.current?.click();
  };

  const onBatchFiles = async (fileList: FileList | null) => {
    if (!fileList?.length || !assignment) return;
    const files = Array.from(fileList);
    setBusy(true);
    setBatchMsg(null);
    const unmatched: File[] = [];
    let ok = 0;
    let fail = 0;

    const doneSet = new Set<string>();
    for (const file of files) {
      const match = matchStudentFromFileName(file.name, students);
      if (match) {
        const success = await uploadFor(match, file);
        if (success) {
          ok += 1;
          doneSet.add(match);
        } else fail += 1;
      } else {
        unmatched.push(file);
      }
    }

    const remaining = students.filter((s) => !doneSet.has(s));
    let idx = 0;
    for (const file of unmatched) {
      if (idx >= remaining.length) break;
      const name = remaining[idx]!;
      idx += 1;
      const success = await uploadFor(name, file);
      if (success) {
        ok += 1;
        doneSet.add(name);
      } else fail += 1;
    }

    if (unmatched.length > files.length - unmatched.length) {
      setBatchMsg(
        `批量完成：成功 ${ok} 张${fail ? `，失败 ${fail} 张` : ""}。文件名含学生姓名可自动匹配，其余按名单顺序分配。`,
      );
    } else {
      setBatchMsg(`批量完成：已处理 ${files.length} 张图片`);
    }
    setBusy(false);
    if (batchRef.current) batchRef.current.value = "";
  };

  return (
    <AppDialog
      open={open}
      onClose={handleClose}
      title="上传试卷"
      subtitle={assignment ? `${assignment.title} · AI 批改后进入待审阅，可批量下发` : ""}
      size="lg"
      zIndex={125}
      closeDisabled={busy}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={handleClose}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-black/[0.1] bg-white px-4 text-small font-bold text-ink-muted"
          >
            关闭
          </button>
          <PrimaryButton
            disabled={busy || doneCount === 0}
            className="min-h-10 px-6"
            onClick={() => {
              onComplete();
              handleClose();
            }}
          >
            完成（已传 {doneCount}/{students.length}）
          </PrimaryButton>
        </div>
      }
    >
      <div className={`space-y-4 ${APP_DIALOG_PANEL}`}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onPickFile(e.target.files?.[0])}
        />
        <input
          ref={batchRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void onBatchFiles(e.target.files)}
        />
        <p className="text-caption text-ink-muted">
          按学生上传试卷照片，或使用下方<strong>批量导入</strong>一次选择多张图。上传后自动 AI 批改，默认不立即下发（请在「待审阅」审阅后点「批量下发成绩」）。
        </p>
        <div className="flex flex-wrap gap-2 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
          <button
            type="button"
            disabled={busy || students.length === 0}
            onClick={() => batchRef.current?.click()}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-violet-400 bg-white px-4 text-caption font-bold text-violet-900 disabled:opacity-50"
          >
            <FolderUp className="h-4 w-4" {...CUTE_ICON} aria-hidden />
            批量导入图片
          </button>
          <p className="text-[0.65rem] text-violet-900/80">
            建议文件名包含学生姓名（如「张三-第三单元.jpg」）；未匹配的按名单顺序依次分配
          </p>
        </div>
        {batchMsg ? <p className="text-caption font-semibold text-brand">{batchMsg}</p> : null}
        {selectedStudent ? (
          <p className="text-caption font-semibold text-brand">
            当前选择：{selectedStudent}
            {busy ? " · 上传中…" : ""}
          </p>
        ) : null}
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {students.length === 0 ? (
            <li className="text-caption text-ink-muted">该任务未指定学生</li>
          ) : (
            students.map((name) => {
              const st = statusByStudent[name] ?? "idle";
              return (
                <li
                  key={name}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/[0.06] bg-white/90 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-caption font-bold text-ink">{name}</p>
                    {errByStudent[name] ? (
                      <p className="mt-0.5 text-[0.65rem] text-red-600">{errByStudent[name]}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {st === "done" ? (
                      <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
                        已上传
                      </span>
                    ) : st === "uploading" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-brand" {...CUTE_ICON} aria-hidden />
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => pickStudentAndFile(name)}
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-brand px-3 text-[0.65rem] font-bold text-white disabled:opacity-50"
                    >
                      <Camera className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
                      上传
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
        <p className="flex items-center gap-1.5 text-[0.65rem] text-ink-muted">
          <Upload className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
          支持多次补传覆盖；上传后可在任务卡片「查看成绩」或「待审阅」中处理
        </p>
      </div>
    </AppDialog>
  );
}
