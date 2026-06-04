import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BookOpen,
  Calculator,
  Camera,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";

import { AppLink } from "@/components/atoms/AppLink";
import { StudentPageShell } from "@/components/molecules/StudentPageShell";
import { PrimaryButton } from "@/components/atoms/PrimaryButton";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { HomeworkPreview } from "@/components/atoms/HomeworkPreview";
import { ScoreResultCard } from "@/components/organisms/ScoreResultCard";
import { loadStudentProfileName, saveStudentProfileName } from "@/lib/studentProfileName";
import {
  completeVariantTask,
  fetchMySubmissions,
  fetchStudentTodo,
  fetchSubmission,
  submitAssignmentWork,
  submitCorrection,
  submissionToDetail,
  type StudentPendingRelease,
  type WorkspaceAssignment,
  type WorkspaceSubmission,
  type WorkspaceVariantTask,
} from "@/lib/workspaceApi";

import { AuthenticatedImage } from "@/components/molecules/AuthenticatedImage";
import { assignmentDueLabel, submitBlockedReason } from "@/lib/assignmentDeadline";
import { subjectLabelCn } from "@/lib/gradeSubject";
import { syncWrongBookFromSubmissions } from "@/lib/workspaceWrongBookSync";
import { useWorkspaceAssignmentsSync } from "@/hooks/useWorkspaceAssignmentsSync";
import { syncRewardsFromSubmissions } from "@/lib/studentRewards";
import { parseMyWorkTab, todoPath, type MyWorkTabId } from "@/lib/studentRoutes";

function formatWhen(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    published: "已下发",
    graded: "已批改",
    correction_pending: "待练变式/订正",
    correction_done: "待教师验收",
    closed: "已完成",
    submitted: "已提交",
  };
  return map[status] ?? status;
}

export function MyWorkPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseMyWorkTab(searchParams.get("tab"));
  const setTab = useCallback(
    (next: MyWorkTabId) => {
      const params = new URLSearchParams(searchParams);
      if (next === "todo") params.delete("tab");
      else params.set("tab", next);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const [profileName, setProfileName] = useState(() => loadStudentProfileName());
  const [todo, setTodo] = useState<WorkspaceAssignment[]>([]);
  const [items, setItems] = useState<WorkspaceSubmission[]>([]);
  const [pendingRelease, setPendingRelease] = useState<StudentPendingRelease[]>([]);
  const [variants, setVariants] = useState<WorkspaceVariantTask[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<WorkspaceSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pendingAssignmentRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profileName.trim()) {
      setTodo([]);
      setItems([]);
      setPendingRelease([]);
      setVariants([]);
      setLoading(false);
      return;
    }
    const name = profileName.trim();
    saveStudentProfileName(name);
    setLoading(true);
    try {
      const [todoData, workData] = await Promise.all([fetchStudentTodo(name), fetchMySubmissions(name)]);
      setTodo(todoData.todo);
      setItems(workData.items);
      setPendingRelease(workData.pending_release);
      setVariants(workData.variant_tasks);
      syncWrongBookFromSubmissions(workData.items);
      syncRewardsFromSubmissions(workData.items);
      if (selectedId) {
        const hit = workData.items.find((i) => i.id === selectedId);
        if (hit) setSelected(hit);
        else {
          const full = await fetchSubmission(selectedId);
          setSelected(full);
        }
      }
    } catch (e) {
      setToast(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [profileName, selectedId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useWorkspaceAssignmentsSync(refresh);

  const detail = useMemo(() => (selected ? submissionToDetail(selected) : null), [selected]);

  const workListCount = items.length + pendingRelease.length;

  const openItem = async (id: string) => {
    setSelectedId(id);
    setTab("work");
    try {
      const full = await fetchSubmission(id);
      setSelected(full);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "打开失败");
    }
  };

  useEffect(() => {
    if (tab !== "work" || loading || items.length === 0 || selectedId) return;
    void openItem(items[0]!.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在进入批改记录且未选中时自动打开第一条
  }, [tab, loading, items, selectedId]);

  const handleSaveProfile = () => {
    saveStudentProfileName(profileName);
    setToast("姓名已保存，请与教师任务中的姓名完全一致");
    void refresh();
  };

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
      await submitAssignmentWork(aid, file, { studentName: profileName.trim(), autoPublish: false });
      setToast("交卷成功，系统已自动批改，请等待教师审阅后查看结果");
      setTab("work");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "交卷失败");
    } finally {
      setSubmittingId(null);
      pendingAssignmentRef.current = null;
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleCorrection = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await submitCorrection(selected.id, "我已完成订正");
      setToast("已标记订正，等待教师验收");
      await refresh();
      await openItem(selected.id);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "提交失败");
    } finally {
      setBusy(false);
    }
  };

  const handleVariantDone = async (taskId: string) => {
    setBusy(true);
    try {
      await completeVariantTask(taskId);
      setToast("变式题已完成");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <StudentPageShell pageTitle="我的作业" mainClassName="max-w-6xl">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
          <div>
            <h1 className="text-2xl font-extrabold text-ink">我的作业</h1>
            <p className="mt-2 max-w-2xl text-small text-ink-muted">
              待完成教师布置的任务 → 查看批改结果 → 完成变式题与订正。姓名须与教师端一致。
            </p>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/95 p-4 shadow-card">
            <label className="text-caption font-bold text-ink-muted">我的姓名（与教师端一致）</label>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="例如：张三"
                className="min-h-10 min-w-[12rem] flex-1 rounded-xl border border-black/[0.1] px-3 text-small"
              />
              <PrimaryButton className="min-h-10 px-5" onClick={handleSaveProfile}>
                保存姓名
              </PrimaryButton>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "todo" as const, label: `待完成 (${todo.length})` },
                { id: "work" as const, label: `批改记录 (${workListCount})` },
                { id: "variants" as const, label: `变式练习 (${variants.length})` },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`min-h-10 rounded-xl px-4 text-small font-bold transition ${
                  tab === t.id ? "bg-brand text-white" : "bg-white/90 text-ink-muted ring-1 ring-black/[0.08]"
                }`}
              >
                {t.id === "todo" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
                    {t.label}
                  </span>
                ) : (
                  t.label
                )}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void refresh()}
              className="ml-auto inline-flex min-h-10 items-center gap-1 rounded-xl border border-black/[0.08] bg-white px-3 text-caption font-bold text-ink-muted"
            >
              <RefreshCw className="h-4 w-4" {...CUTE_ICON} aria-hidden />
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
            <div className="flex flex-1 items-center justify-center gap-2 py-16 text-ink-muted">
              <Loader2 className="h-5 w-5 animate-spin" {...CUTE_ICON} aria-hidden />
              加载中…
            </div>
          ) : tab === "todo" ? (
            <ul className="space-y-3">
              {!profileName.trim() ? (
                <li className="rounded-2xl border border-dashed border-primary/25 bg-white/80 py-12 text-center text-small text-ink-muted">
                  请先保存姓名后再查看待办任务
                </li>
              ) : todo.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-primary/25 bg-white/80 py-12 text-center">
                  <ClipboardList className="mx-auto h-10 w-10 text-primary/50" {...CUTE_ICON} aria-hidden />
                  <p className="mt-4 text-small font-semibold text-ink">暂无待办任务</p>
                  <p className="mt-1 text-caption text-ink-muted">
                    教师发布任务后会出现在这里，也可前往
                    <AppLink to={todoPath()} className="mx-1 font-bold text-brand">
                      待办任务
                    </AppLink>
                    页提交
                  </p>
                </li>
              ) : (
                todo.map((a) => {
                  const blocked = submitBlockedReason(a);
                  const canSubmit = a.can_submit !== false && a.allows_student_submit !== false;
                  const teacherExam = a.submission_mode === "teacher";
                  return (
                  <li key={a.id} className="rounded-2xl border border-white/70 bg-white/95 p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="campus-tag campus-tag--sky">{subjectLabelCn(a.subject)}</span>
                        {teacherExam ? (
                          <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[0.65rem] font-bold text-violet-900">
                            课堂考试
                          </span>
                        ) : null}
                        {a.is_overdue ? (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold text-amber-900">
                            已截止
                          </span>
                        ) : null}
                        <h2 className="mt-2 text-body font-bold text-ink">{a.title}</h2>
                        {a.description ? <p className="mt-1 text-caption text-ink-muted">{a.description}</p> : null}
                        {a.class_name ? <p className="mt-1 text-caption text-ink-muted">班级 · {a.class_name}</p> : null}
                        {a.due_at ? (
                          <p className={`mt-1 text-caption ${a.is_overdue ? "font-semibold text-amber-800" : "text-ink-muted"}`}>
                            {assignmentDueLabel(a)}
                          </p>
                        ) : null}
                        {a.published_at ? (
                          <p className="mt-1 text-caption text-ink-subtle">发布于 {formatWhen(a.published_at)}</p>
                        ) : null}
                        {teacherExam ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <p className="w-full text-caption text-violet-900">
                              课堂考试由教师上传试卷；成绩下发后可在「批改记录」查看
                            </p>
                            <button
                              type="button"
                              onClick={() => setTab("work")}
                              className="inline-flex min-h-8 items-center rounded-lg border border-violet-300 bg-violet-50 px-3 text-[0.65rem] font-bold text-violet-900"
                            >
                              去批改记录
                            </button>
                          </div>
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
                        拍照交卷
                      </PrimaryButton>
                      ) : null}
                    </div>
                  </li>
                  );
                })
              )}
            </ul>
          ) : tab === "variants" ? (
            <ul className="space-y-3">
              {variants.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-primary/25 bg-white/80 py-12 text-center text-small text-ink-muted">
                  暂无待完成的变式题
                </li>
              ) : (
                variants.map((v) => (
                  <li key={v.id} className="rounded-2xl border border-white/70 bg-white/95 p-4 shadow-sm">
                    {v.knowledge_point ? (
                      <span className="campus-tag campus-tag--mint text-[0.65rem]">{v.knowledge_point}</span>
                    ) : null}
                    <p className="mt-2 text-body font-semibold text-ink">{v.stem}</p>
                    {v.answer_hint ? <p className="mt-2 text-caption text-ink-muted">提示：{v.answer_hint}</p> : null}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleVariantDone(v.id)}
                      className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-4 text-caption font-bold text-white"
                    >
                      <CheckCircle2 className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                      标记完成
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <div className="grid min-h-[24rem] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
              <aside className="rounded-2xl border border-black/[0.08] bg-white/95 p-3 shadow-card">
                {workListCount === 0 ? (
                  <p className="px-2 py-8 text-center text-caption text-ink-muted">
                    {profileName.trim()
                      ? "暂无记录。教师上传并下发成绩后会出现在这里。"
                      : "请先保存姓名"}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {pendingRelease.map((item) => (
                      <li key={`pending-${item.id}`}>
                        <div className="flex w-full flex-col rounded-xl border border-dashed border-amber-200 bg-amber-50/50 px-3 py-2.5 text-left">
                          <span className="text-small font-bold text-ink">
                            {item.assignment?.title || "课堂考试"}
                          </span>
                          <span className="mt-1 text-caption text-amber-900">
                            {formatWhen(item.created_at)} · 待教师下发成绩
                          </span>
                        </div>
                      </li>
                    ))}
                    {items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => void openItem(item.id)}
                          className={`flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition ${
                            selectedId === item.id ? "bg-primary-tint ring-1 ring-primary/25" : "hover:bg-gray-50"
                          }`}
                        >
                          <span className="flex items-center gap-1.5 text-small font-bold text-ink">
                            {item.subject === "math" ? (
                              <Calculator className="h-3.5 w-3.5 text-primary" {...CUTE_ICON} aria-hidden />
                            ) : (
                              <BookOpen className="h-3.5 w-3.5 text-primary" {...CUTE_ICON} aria-hidden />
                            )}
                            {item.assignment?.title || item.file_name || "作业"}
                          </span>
                          <span className="mt-1 text-caption text-ink-muted">
                            {formatWhen(item.created_at)} · {statusLabel(item.status)}
                            {item.score_percent != null ? ` · ${item.score_percent}%` : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>

              <div className="flex min-h-0 flex-col gap-4">
                {!selected ? (
                  <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-primary/20 bg-white/80 py-16 text-small text-ink-muted">
                    {items.length > 0 ? "正在加载批改详情…" : "选择左侧一条已下发记录查看详情"}
                  </div>
                ) : !detail ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 py-16 px-6 text-center">
                    <p className="text-small font-semibold text-ink">暂未加载到批改详情</p>
                    <p className="text-caption text-ink-muted">
                      若教师刚上传试卷，请等待审阅并「批量下发成绩」后再查看；也可点刷新重试。
                    </p>
                    <button
                      type="button"
                      onClick={() => void openItem(selected.id)}
                      className="min-h-9 rounded-lg bg-brand px-4 text-caption font-bold text-white"
                    >
                      重新加载
                    </button>
                  </div>
                ) : (
                  <>
                    {selected.image_url ? (
                      <HomeworkPreview imageUrl={selected.image_url} fillColumn requireAuth />
                    ) : null}
                    <ScoreResultCard
                      subject={selected.subject === "english" ? "english" : "math"}
                      result={detail}
                      subjectTitle={subjectLabelCn(selected.subject)}
                      exportBaseName={`${selected.student_name}-${selected.file_name}`}
                    />
                    {selected.assignment?.answer_visible_to_student &&
                    (selected.assignment.answer_key_image_url || selected.assignment.answer_key) ? (
                      <div className="rounded-xl border border-amber-100 bg-amber-50/90 p-3 ring-1 ring-amber-100">
                        <p className="text-caption font-bold text-amber-950">标准参考答案</p>
                        {selected.assignment.answer_key_image_url ? (
                          <AuthenticatedImage
                            src={selected.assignment.answer_key_image_url}
                            alt="参考答案"
                            className="mt-2 max-h-56 w-full rounded-lg bg-white object-contain"
                          />
                        ) : null}
                        {selected.assignment.answer_key ? (
                          <p className="mt-2 text-caption text-amber-950">{selected.assignment.answer_key}</p>
                        ) : null}
                      </div>
                    ) : selected.assignment?.hide_answer_from_student && selected.status === "published" ? (
                      <p className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-caption text-amber-950">
                        教师尚未开放标准答案，请先做变式题巩固
                      </p>
                    ) : null}
                    {selected.status === "published" || selected.status === "correction_pending" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleCorrection()}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-small font-bold text-emerald-900"
                      >
                        <Send className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                        我已完成订正
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          )}

          {toast ? (
            <p className="fixed bottom-6 left-1/2 z-50 max-w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl bg-ink px-4 py-2.5 text-center text-caption font-semibold text-white shadow-lg">
              {toast}
            </p>
          ) : null}
        </main>
    </StudentPageShell>
  );
}
