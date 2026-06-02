import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, ClipboardList, Loader2, RefreshCw } from "lucide-react";

import { Navbar } from "@/components/atoms/Navbar";
import { PageCampusDeco } from "@/components/atoms/PageCampusDeco";
import { PrimaryButton } from "@/components/atoms/PrimaryButton";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { loadStudentProfileName, saveStudentProfileName } from "@/lib/studentProfileName";
import { fetchStudentTodo, submitAssignmentWork, type WorkspaceAssignment } from "@/lib/workspaceApi";

const SUBJECT_CN = { math: "数学", english: "英语" } as const;

export function TodoPage() {
  const [profileName, setProfileName] = useState(() => loadStudentProfileName());
  const [todo, setTodo] = useState<WorkspaceAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pendingAssignmentRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profileName.trim()) {
      setTodo([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchStudentTodo();
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

  const pickFile = (assignmentId: string) => {
    pendingAssignmentRef.current = assignmentId;
    fileRef.current?.click();
  };

  const onFile = async (file: File | undefined) => {
    const aid = pendingAssignmentRef.current;
    if (!file || !aid) return;
    setSubmittingId(aid);
    try {
      await submitAssignmentWork(aid, file, { studentName: profileName.trim() });
      setToast("交卷并批改完成，可在「我的作业」查看");
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
    <div className="page-bg-hero-stunning relative flex min-h-screen flex-col">
      <PageCampusDeco />
      <Navbar />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">待办任务</h1>
          <p className="mt-2 text-small text-ink-muted">完成教师布置的作业：拍照交卷后自动批改。</p>
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
            <Link to="/my-work" className="mt-2 inline-block text-caption font-bold text-brand">
              查看我的作业 →
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {todo.map((a) => (
              <li key={a.id} className="rounded-2xl border border-white/70 bg-white/95 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="campus-tag campus-tag--sky">{SUBJECT_CN[a.subject]}</span>
                    <h2 className="mt-2 text-body font-bold text-ink">{a.title}</h2>
                    {a.description ? <p className="mt-1 text-caption text-ink-muted">{a.description}</p> : null}
                    {a.due_at ? (
                      <p className="mt-1 text-caption text-amber-800">截止：{a.due_at.slice(0, 16).replace("T", " ")}</p>
                    ) : null}
                  </div>
                  <PrimaryButton
                    className="min-h-10 shrink-0 gap-2 px-4"
                    disabled={submittingId === a.id || !profileName.trim()}
                    onClick={() => pickFile(a.id)}
                  >
                    {submittingId === a.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" {...CUTE_ICON} aria-hidden />
                    ) : (
                      <Camera className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                    )}
                    拍照交卷
                  </PrimaryButton>
                </div>
              </li>
            ))}
          </ul>
        )}

        {toast ? (
          <p className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-caption text-white shadow-lg">
            {toast}
          </p>
        ) : null}
      </main>
    </div>
  );
}
