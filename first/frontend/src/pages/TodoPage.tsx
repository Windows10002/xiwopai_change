import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ClipboardList, Loader2, RefreshCw } from "lucide-react";

import { AppLink } from "@/components/atoms/AppLink";
import { StudentPageShell } from "@/components/molecules/StudentPageShell";
import { myWorkPath } from "@/lib/studentRoutes";
import { PrimaryButton } from "@/components/atoms/PrimaryButton";
import { AuthenticatedImage } from "@/components/molecules/AuthenticatedImage";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { useAppSession } from "@/hooks/useAppSession";
import { loadStudentProfileName, saveStudentProfileName } from "@/lib/studentProfileName";
import { assignmentDueLabel, submitBlockedReason } from "@/lib/assignmentDeadline";
import { useWorkspaceAssignmentsSync } from "@/hooks/useWorkspaceAssignmentsSync";
import { syncRewardsFromSubmissions } from "@/lib/studentRewards";
import { fetchStudentTodo, submitAssignmentWork, type WorkspaceAssignment } from "@/lib/workspaceApi";

const SUBJECT_CN = { math: "数学", english: "英语", chinese: "语文" } as const;

export function TodoPage() {
  const session = useAppSession();
  const [profileName, setProfileName] = useState(() => {
    const saved = loadStudentProfileName();
    return saved;
  });
  const [todo, setTodo] = useState<WorkspaceAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pendingAssignmentRef = useRef<string | null>(null);

  useEffect(() => {
    if (profileName.trim()) return;
    const fromSession = session?.displayName?.trim();
    if (fromSession) {
      setProfileName(fromSession);
      saveStudentProfileName(fromSession);
    }
  }, [session?.displayName, profileName]);

  const refresh = useCallback(async () => {
    const name = profileName.trim();
    if (!name) {
      setTodo([]);
      setLoading(false);
      return;
    }
    saveStudentProfileName(name);
    setLoading(true);
    try {
      const data = await fetchStudentTodo(name);
      setTodo(data.todo);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [profileName]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useWorkspaceAssignmentsSync(refresh);

  const pickFile = (assignmentId: string) => {
    pendingAssignmentRef.current = assignmentId;
    fileRef.current?.click();
  };

  const onFile = async (file: File | undefined) => {
    const aid = pendingAssignmentRef.current;
    if (!file || !aid) return;
    const task = todo.find((t) => t.id === aid);
    if (task && task.can_submit === false) {
      setToast(submitBlockedReason(task) ?? "已超过截止时间，无法交卷");
      return;
    }
    setSubmittingId(aid);
    try {
      const result = await submitAssignmentWork(aid, file, { studentName: profileName.trim(), autoPublish: false });
      if (result.submission) syncRewardsFromSubmissions([result.submission]);
      setToast(
        result.submission?.status === "correction_pending" || task?.resubmit_allowed
          ? "重交成功，系统已重新批改，请等待教师审阅"
          : "交卷成功，系统已自动批改，请等待教师审阅",
      );
      localStorage.removeItem(`assignment-draft-note-${aid}`);
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "交卷失败");
    } finally {
      setSubmittingId(null);
      pendingAssignmentRef.current = null;
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <StudentPageShell pageTitle="待办任务">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">待办任务</h1>
          <p className="mt-2 text-small text-ink-muted">
            完成教师布置的作业：拍照交卷后自动批改。姓名须与教师任务中的学生一致（演示账号请用 13800138003 登录）。
          </p>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/95 p-4 shadow-card">
          <label className="text-caption font-bold text-ink-muted">我的姓名</label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="min-h-10 flex-1 rounded-xl border border-black/[0.1] px-3 text-small"
            />
            <PrimaryButton
              className="min-h-10 px-5"
              onClick={() => {
                saveStudentProfileName(profileName);
                void refresh();
              }}
            >
              保存
            </PrimaryButton>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-small font-bold text-ink">待完成 {todo.length} 项</span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1 text-caption font-bold text-ink-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
            刷新
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />

        {loading ? (
          <div className="flex justify-center py-16 text-ink-muted">
            <Loader2 className="h-6 w-6 animate-spin" {...CUTE_ICON} aria-hidden />
          </div>
        ) : todo.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-primary/25 bg-white/80 py-16 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-primary/60" {...CUTE_ICON} aria-hidden />
            <p className="mt-4 text-small font-semibold text-ink">暂无待办</p>
            <AppLink to={myWorkPath()} className="mt-2 inline-block text-caption font-bold text-brand">
              查看我的作业 →
            </AppLink>
          </div>
        ) : (
          <ul className="space-y-3">
            {todo.map((a) => {
              const blocked = submitBlockedReason(a);
              const teacherExam = a.submission_mode === "teacher";
              const canSubmit = a.can_submit !== false && a.allows_student_submit !== false;
              const isResubmit = Boolean(a.resubmit_allowed);
              return (
                <li key={a.id} className="rounded-2xl border border-white/70 bg-white/95 p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="campus-tag campus-tag--sky">{SUBJECT_CN[a.subject]}</span>
                      {teacherExam ? (
                        <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[0.65rem] font-bold text-violet-900">
                          课堂考试
                        </span>
                      ) : null}
                      {isResubmit ? (
                        <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[0.65rem] font-bold text-sky-900">
                          可重交
                        </span>
                      ) : null}
                      {a.is_overdue ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold text-amber-900">
                          已截止
                        </span>
                      ) : null}
                      <h2 className="mt-2 text-body font-bold text-ink">{a.title}</h2>
                      {a.description ? <p className="mt-1 text-caption text-ink-muted">{a.description}</p> : null}
                      {a.teacher_attachment_image_url || a.teacher_attachment_note ? (
                        <div className="mt-2 rounded-lg border border-sky-100 bg-sky-50/80 px-2.5 py-2 ring-1 ring-sky-100">
                          <p className="text-[0.65rem] font-bold text-sky-900">教师附件</p>
                          {a.teacher_attachment_image_url ? (
                            <AuthenticatedImage
                              src={a.teacher_attachment_image_url}
                              alt="教师附件"
                              className="mt-1 max-h-48 w-full rounded-md bg-white object-contain"
                            />
                          ) : null}
                          {a.teacher_attachment_note ? (
                            <p className="mt-1 text-caption text-ink-muted">{a.teacher_attachment_note}</p>
                          ) : null}
                        </div>
                      ) : null}
                      {a.due_at ? (
                        <p className={`mt-1 text-caption ${a.is_overdue ? "font-semibold text-amber-800" : "text-ink-muted"}`}>
                          {assignmentDueLabel(a)}
                        </p>
                      ) : null}
                      {a.max_submissions ? (
                        <p className="mt-1 text-[0.65rem] text-ink-muted">最多提交 {a.max_submissions} 次（含重交）</p>
                      ) : null}
                      {teacherExam ? (
                        <p className="mt-1 text-caption text-violet-900">本任务由教师录入试卷，请前往「我的作业」查看成绩</p>
                      ) : null}
                      {blocked ? <p className="mt-1 text-caption text-amber-900">{blocked}</p> : null}
                    </div>
                    {!teacherExam ? (
                      <PrimaryButton
                        className="min-h-10 shrink-0 gap-2 px-4"
                        disabled={submittingId === a.id || !profileName.trim() || !canSubmit}
                        onClick={() => pickFile(a.id)}
                      >
                        {submittingId === a.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" {...CUTE_ICON} aria-hidden />
                        ) : (
                          <Camera className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                        )}
                        {isResubmit ? "重新交卷" : "拍照交卷"}
                      </PrimaryButton>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {toast ? (
          <p className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-caption text-white shadow-lg">
            {toast}
          </p>
        ) : null}
      </main>
    </StudentPageShell>
  );
}
