import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw, Send, Users } from "lucide-react";

import { Navbar } from "@/components/atoms/Navbar";
import { PrimaryButton } from "@/components/atoms/PrimaryButton";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { loadStudentRoster } from "@/lib/studentRoster";
import {
  assignVariantTasks,
  createAssignment,
  fetchTeacherAssignments,
  fetchTeacherInbox,
  publishAssignment,
  publishSubmissionToStudent,
  reviewCorrection,
  type WorkspaceAssignment,
  type WorkspaceSubmission,
} from "@/lib/workspaceApi";

const SUBJECT_CN = { math: "数学", english: "英语" } as const;

function formatWhen(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function WorkspacePage() {
  const [tab, setTab] = useState<"tasks" | "inbox">("tasks");
  const [assignments, setAssignments] = useState<WorkspaceAssignment[]>([]);
  const [inbox, setInbox] = useState<WorkspaceSubmission[]>([]);
  const [counts, setCounts] = useState({ corrections_pending: 0, unpublished_graded: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<"math" | "english">("math");
  const [description, setDescription] = useState("");
  const [className, setClassName] = useState("");
  const [targetNames, setTargetNames] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [a, inboxData] = await Promise.all([fetchTeacherAssignments(), fetchTeacherInbox()]);
      setAssignments(a);
      setInbox(inboxData.items);
      setCounts(inboxData.counts);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreateTask = async (publish: boolean) => {
    if (title.trim().length < 2) {
      setToast("任务标题至少 2 个字");
      return;
    }
    setBusy(true);
    try {
      const names = targetNames
        .split(/[,，、\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      await createAssignment({
        subject,
        title: title.trim(),
        description: description.trim(),
        class_name: className.trim(),
        target_student_names: names,
        publish,
      });
      setTitle("");
      setDescription("");
      setToast(publish ? "任务已发布" : "草稿已保存");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "创建失败");
    } finally {
      setBusy(false);
    }
  };

  const fillFromRoster = () => {
    const roster = loadStudentRoster();
    if (!roster.length) {
      setToast("请先在设置中添加学生名册");
      return;
    }
    setTargetNames(roster.map((s) => s.name).join("、"));
  };

  const handlePublishAssignment = async (id: string) => {
    setBusy(true);
    try {
      await publishAssignment(id);
      setToast("任务已发布");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "发布失败");
    } finally {
      setBusy(false);
    }
  };

  const handlePublishSubmission = async (id: string) => {
    setBusy(true);
    try {
      await publishSubmissionToStudent(id);
      setToast("已发送给学生");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "发送失败");
    } finally {
      setBusy(false);
    }
  };

  const handleReviewCorrection = async (id: string, action: "accept" | "reject") => {
    setBusy(true);
    try {
      await reviewCorrection(id, action, action === "reject" ? "请继续订正薄弱步骤" : "");
      setToast(action === "accept" ? "已验收订正" : "已驳回订正");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };

  const handlePushVariants = async (sub: WorkspaceSubmission) => {
    const weak = (sub.grading_record?.result?.weak_points as string[] | undefined) ?? [];
    const kp = weak[0] || "巩固练习";
    setBusy(true);
    try {
      await assignVariantTasks(sub.id, [
        {
          knowledge_point: kp,
          stem: `围绕「${kp}」完成一题变式练习（请写在纸上并对照批改要点自检）。`,
          answer_hint: "可参考本次批改中的订正建议。",
        },
      ]);
      setToast("已推送变式题给学生");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "推送失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-bg-hero-stunning relative flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">作业管理</h1>
          <p className="mt-2 max-w-2xl text-small text-ink-muted">
            发布任务 → 学生交卷 → 批改下发 → 订正验收 → 变式练习。批改页填写学生姓名后，可在此发送结果。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("tasks")}
            className={`min-h-10 rounded-xl px-4 text-small font-bold ${tab === "tasks" ? "bg-brand text-white" : "bg-white ring-1 ring-black/[0.08]"}`}
          >
            任务中心 ({assignments.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("inbox")}
            className={`min-h-10 rounded-xl px-4 text-small font-bold ${tab === "inbox" ? "bg-brand text-white" : "bg-white ring-1 ring-black/[0.08]"}`}
          >
            作业收发
            {counts.unpublished_graded + counts.corrections_pending > 0
              ? ` (${counts.unpublished_graded + counts.corrections_pending})`
              : ""}
          </button>
          <button type="button" onClick={() => void refresh()} className="ml-auto inline-flex items-center gap-1 text-caption font-bold text-ink-muted">
            <RefreshCw className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
            刷新
          </button>
        </div>

        {tab === "tasks" ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <section className="rounded-2xl border border-black/[0.08] bg-white/95 p-5 shadow-card">
              <h2 className="text-body font-bold text-ink">新建任务</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="任务标题，如：第三单元练习"
                  className="w-full min-h-10 rounded-xl border border-black/[0.1] px-3 text-small"
                />
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as "math" | "english")}
                  className="w-full min-h-10 rounded-xl border border-black/[0.1] px-3 text-small"
                >
                  <option value="math">数学</option>
                  <option value="english">英语作文</option>
                </select>
                <input
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="班级（选填）"
                  className="w-full min-h-10 rounded-xl border border-black/[0.1] px-3 text-small"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="任务说明（选填）"
                  rows={2}
                  className="w-full rounded-xl border border-black/[0.1] px-3 py-2 text-small"
                />
                <div>
                  <label className="text-caption font-bold text-ink-muted">指定学生（留空=全班可见）</label>
                  <textarea
                    value={targetNames}
                    onChange={(e) => setTargetNames(e.target.value)}
                    placeholder="张三、李四（或从名册导入）"
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-black/[0.1] px-3 py-2 text-small"
                  />
                  <button type="button" onClick={fillFromRoster} className="mt-2 inline-flex items-center gap-1 text-caption font-bold text-brand">
                    <Users className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
                    从名册导入
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <PrimaryButton disabled={busy} className="min-h-10 flex-1" onClick={() => void handleCreateTask(true)}>
                    <Plus className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                    发布任务
                  </PrimaryButton>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-black/[0.08] bg-white/95 p-5 shadow-card">
              <h2 className="text-body font-bold text-ink">已发布任务</h2>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-ink-muted" {...CUTE_ICON} aria-hidden />
                </div>
              ) : assignments.length === 0 ? (
                <p className="py-12 text-center text-caption text-ink-muted">暂无任务</p>
              ) : (
                <ul className="mt-4 max-h-[min(60vh,28rem)] space-y-2 overflow-y-auto">
                  {assignments.map((a) => (
                    <li key={a.id} className="rounded-xl border border-black/[0.06] bg-surface-page/50 px-3 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-small font-bold text-ink">
                            {SUBJECT_CN[a.subject]} · {a.title}
                          </p>
                          <p className="mt-1 text-caption text-ink-muted">
                            {a.status === "published" ? "已发布" : "草稿"} · 提交 {a.submission_count ?? 0} · 已下发{" "}
                            {a.published_count ?? 0}
                          </p>
                        </div>
                        {a.status === "draft" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handlePublishAssignment(a.id)}
                            className="rounded-lg bg-brand px-3 py-1.5 text-caption font-bold text-white"
                          >
                            发布
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : (
          <section className="rounded-2xl border border-black/[0.08] bg-white/95 p-5 shadow-card">
            <h2 className="text-body font-bold text-ink">学生作业收发</h2>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" {...CUTE_ICON} aria-hidden />
              </div>
            ) : inbox.length === 0 ? (
              <p className="py-12 text-center text-caption text-ink-muted">
                暂无记录。在批改页填写学生姓名并完成批改后，可在此发送给学生。
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {inbox.map((sub) => (
                  <li key={sub.id} className="rounded-xl border border-black/[0.06] px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-small font-bold text-ink">
                          {sub.student_name || "未命名"} · {sub.file_name || "作业"}
                        </p>
                        <p className="mt-1 text-caption text-ink-muted">
                          {SUBJECT_CN[sub.subject]} · {formatWhen(sub.created_at)} · {sub.status}
                          {sub.score_percent != null ? ` · ${sub.score_percent}%` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sub.status === "graded" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handlePublishSubmission(sub.id)}
                            className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-brand px-3 text-caption font-bold text-white"
                          >
                            <Send className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
                            发送给学生
                          </button>
                        ) : null}
                        {sub.status === "correction_done" ? (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleReviewCorrection(sub.id, "accept")}
                              className="min-h-9 rounded-lg bg-emerald-600 px-3 text-caption font-bold text-white"
                            >
                              验收订正
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleReviewCorrection(sub.id, "reject")}
                              className="min-h-9 rounded-lg border border-amber-300 bg-amber-50 px-3 text-caption font-bold text-amber-950"
                            >
                              驳回
                            </button>
                          </>
                        ) : null}
                        {sub.grading_record ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handlePushVariants(sub)}
                            className="min-h-9 rounded-lg border border-primary/25 bg-primary-tint px-3 text-caption font-bold text-ink-navActive"
                          >
                            推送变式题
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
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
