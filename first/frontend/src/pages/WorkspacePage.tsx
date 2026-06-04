import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  GraduationCap,
  Loader2,
  Plus,
  Send,
  Users,
} from "lucide-react";
import { PrimaryButton } from "@/components/atoms/PrimaryButton";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { AssignmentPublishModal } from "@/components/molecules/AssignmentPublishModal";
import { AssignmentReportModal } from "@/components/molecules/AssignmentReportModal";
import { ExamBatchUploadModal } from "@/components/molecules/ExamBatchUploadModal";
import { ExamScoresModal } from "@/components/molecules/ExamScoresModal";
import { ExamPublishModal } from "@/components/molecules/ExamPublishModal";
import { WorkspaceTaskCard } from "@/components/molecules/WorkspaceTaskCard";
import { WorkspacePageLayout, type WorkspaceTab } from "@/components/organisms/WorkspacePageLayout";
import {
  assignVariantTasks,
  createAssignment,
  deleteAssignment,
  fetchTeacherAssignments,
  fetchTeacherInbox,
  groupSubmissionsByAssignment,
  publishAssignment,
  publishPendingSubmissions,
  publishSubmissionToStudent,
  releaseAssignmentAnswer,
  revokeAssignmentAnswer,
  returnSubmissionForCorrection,
  reviewCorrection,
  setAssignmentLateSubmit,
  updateAssignment,
  type AssignmentPayload,
  type AssignmentUploadFiles,
  type WorkspaceAssignment,
  type WorkspaceSubmission,
} from "@/lib/workspaceApi";
import { DeleteAssignmentConfirmDialog } from "@/components/molecules/DeleteAssignmentConfirmDialog";
import {
  assignmentDeleteNeedsSecondStep,
  type AssignmentDeleteStep,
} from "@/lib/confirmDeleteAssignment";
import { emitWorkspaceAssignmentsChanged } from "@/lib/workspaceAssignmentsSync";
import { syncWrongBookFromSubmissions } from "@/lib/workspaceWrongBookSync";
import { analyticsPath, gradingPath, parseWorkspaceTab, type LinkAssignmentState } from "@/lib/teacherRoutes";
import { useAppNavigate } from "@/hooks/useAppNavigate";

const SUBJECT_CN = { math: "数学", english: "英语", chinese: "语文" } as const;

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

type WorkspaceTabId = WorkspaceTab;

function isExamTask(a: WorkspaceAssignment): boolean {
  return a.submission_mode === "teacher";
}

export function WorkspacePage() {
  const navigate = useAppNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseWorkspaceTab(searchParams.get("tab"));
  const setTab = useCallback(
    (next: WorkspaceTabId) => {
      const params = new URLSearchParams(searchParams);
      if (next === "homework") params.delete("tab");
      else params.set("tab", next);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );
  const [assignments, setAssignments] = useState<WorkspaceAssignment[]>([]);
  const [inbox, setInbox] = useState<WorkspaceSubmission[]>([]);
  const [counts, setCounts] = useState({ corrections_pending: 0, pending_review: 0, unpublished_graded: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [editing, setEditing] = useState<WorkspaceAssignment | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportAssignment, setReportAssignment] = useState<WorkspaceAssignment | null>(null);
  const [examScoresOpen, setExamScoresOpen] = useState(false);
  const [examScoresAssignment, setExamScoresAssignment] = useState<WorkspaceAssignment | null>(null);
  const [examPublishOpen, setExamPublishOpen] = useState(false);
  const [examEditing, setExamEditing] = useState<WorkspaceAssignment | null>(null);
  const [examUploadOpen, setExamUploadOpen] = useState(false);
  const [examUploadAssignment, setExamUploadAssignment] = useState<WorkspaceAssignment | null>(null);
  const [cardMenuId, setCardMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceAssignment | null>(null);
  const [deleteStep, setDeleteStep] = useState<AssignmentDeleteStep>(1);
  useEffect(() => {
    setCardMenuId(null);
  }, [tab]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [a, inboxData] = await Promise.all([fetchTeacherAssignments(), fetchTeacherInbox()]);
      setAssignments(a);
      setInbox(inboxData.items);
      setCounts(inboxData.counts);
      syncWrongBookFromSubmissions(inboxData.items);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
      emitWorkspaceAssignmentsChanged();
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const published = useMemo(() => assignments.filter((a) => a.status === "published"), [assignments]);
  const drafts = useMemo(() => assignments.filter((a) => a.status === "draft"), [assignments]);
  const homeworkPublished = useMemo(() => published.filter((a) => !isExamTask(a)), [published]);
  const homeworkDrafts = useMemo(() => drafts.filter((a) => !isExamTask(a)), [drafts]);
  const examPublished = useMemo(() => published.filter(isExamTask), [published]);
  const examDrafts = useMemo(() => drafts.filter(isExamTask), [drafts]);

  const assignmentMap = useMemo(() => {
    const m = new Map<string, WorkspaceAssignment>();
    for (const a of assignments) m.set(a.id, a);
    return m;
  }, [assignments]);

  const pendingReview = useMemo(
    () => inbox.filter((s) => s.status === "pending_review"),
    [inbox],
  );
  const pendingByAssignment = useMemo(
    () => groupSubmissionsByAssignment(pendingReview),
    [pendingReview],
  );
  const correctionItems = useMemo(
    () => inbox.filter((s) => s.status === "correction_done"),
    [inbox],
  );

  const handleSubmitTask = async (
    payload: AssignmentPayload,
    editingId?: string,
    files?: AssignmentUploadFiles | null,
  ) => {
    setBusy(true);
    try {
      if (editingId) {
        await updateAssignment(editingId, payload, files);
        setToast("任务已更新，学生与家长端将同步看到最新内容");
      } else {
        await createAssignment(payload, files);
        setToast("任务已发布，学生与家长可在待办中查看");
      }
      setPublishOpen(false);
      setEditing(null);
      setTab("homework");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "保存失败");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitExam = async (
    payload: AssignmentPayload,
    editingId?: string,
    files?: AssignmentUploadFiles | null,
  ) => {
    setBusy(true);
    try {
      if (editingId) {
        await updateAssignment(editingId, payload, files);
        setToast("考试已更新");
      } else {
        await createAssignment(payload, files);
        setToast("考试已创建，请在「课堂考试」中上传试卷");
      }
      setExamPublishOpen(false);
      setExamEditing(null);
      setTab("exams");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "保存失败");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const handlePublishDraft = async (id: string) => {
    setBusy(true);
    try {
      await publishAssignment(id);
      setToast("草稿已发布");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "发布失败");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleLateSubmit = async (a: WorkspaceAssignment) => {
    const next = !a.allow_late_submit;
    setBusy(true);
    try {
      await setAssignmentLateSubmit(a.id, next);
      setToast(next ? "已开放补交，学生可在截止后继续交卷" : "已关闭补交入口");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };

  const openDeleteConfirm = (a: WorkspaceAssignment) => {
    setDeleteTarget(a);
    setDeleteStep(1);
  };

  const closeDeleteConfirm = () => {
    if (busy) return;
    setDeleteTarget(null);
    setDeleteStep(1);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (deleteStep === 1 && assignmentDeleteNeedsSecondStep(deleteTarget)) {
      setDeleteStep(2);
      return;
    }
    setBusy(true);
    try {
      await deleteAssignment(deleteTarget.id);
      setToast("任务已删除");
      setDeleteTarget(null);
      setDeleteStep(1);
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (a: WorkspaceAssignment) => {
    if (isExamTask(a)) {
      setExamEditing(a);
      setExamPublishOpen(true);
    } else {
      setEditing(a);
      setPublishOpen(true);
    }
  };

  const handlePublishSubmission = async (id: string) => {
    setBusy(true);
    try {
      await publishSubmissionToStudent(id);
      setToast("审阅通过，批改结果已发送给学生");
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

  const openExamUpload = (a: WorkspaceAssignment) => {
    setExamUploadAssignment(a);
    setExamUploadOpen(true);
  };

  const handleReleaseAnswer = async (a: WorkspaceAssignment) => {
    setBusy(true);
    try {
      if (a.answer_released) {
        await revokeAssignmentAnswer(a.id);
        setToast("已取消开放，学生/家长暂不可见标准答案");
      } else {
        await releaseAssignmentAnswer(a.id);
        setToast("已向学生/家长开放参考答案");
      }
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };

  const handlePublishPending = async (a: WorkspaceAssignment) => {
    setBusy(true);
    try {
      const n = await publishPendingSubmissions(a.id);
      setToast(n > 0 ? `已批量下发 ${n} 份成绩` : "暂无待下发的批改");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "批量下发失败");
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

  const openReport = (a: WorkspaceAssignment) => {
    setReportAssignment(a);
    setReportOpen(true);
  };

  const openExamScores = (a: WorkspaceAssignment) => {
    setExamScoresAssignment(a);
    setExamScoresOpen(true);
  };

  const handleReturnSubmission = async (id: string) => {
    const note = window.prompt("退回说明（选填）", "请修改后重新交卷") ?? "";
    setBusy(true);
    try {
      await returnSubmissionForCorrection(id, note);
      setToast("已退回，学生可重新交卷");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "退回失败");
    } finally {
      setBusy(false);
    }
  };

  const renderSubmissionActions = (sub: WorkspaceSubmission) => (
    <div className="flex flex-wrap gap-2">
      {sub.status === "pending_review" || sub.status === "graded" ? (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handlePublishSubmission(sub.id)}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-brand px-3 text-caption font-bold text-white"
          >
            <Send className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
            审阅通过并下发
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleReturnSubmission(sub.id)}
            className="min-h-9 rounded-lg border border-amber-300 bg-amber-50 px-3 text-caption font-bold text-amber-950"
          >
            退回
          </button>
        </>
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
      {sub.grading_record && sub.status === "published" ? (
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
  );

  const goGrading = (a: WorkspaceAssignment) => {
    navigate(gradingPath(a.subject), {
      state: {
        linkAssignment: {
          id: a.id,
          title: a.title,
          subject: a.subject,
          className: a.class_name,
        },
      } satisfies LinkAssignmentState,
    });
  };

  const goAnalytics = (a: WorkspaceAssignment) => {
    navigate(analyticsPath({ tab: "student", subject: a.subject, task: a.title }));
  };

  const handlePublishAllDrafts = async (drafts: WorkspaceAssignment[]) => {
    if (drafts.length === 0) return;
    setBusy(true);
    try {
      for (const d of drafts) {
        await publishAssignment(d.id);
      }
      setToast(`已发布 ${drafts.length} 个草稿`);
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "批量发布失败");
    } finally {
      setBusy(false);
    }
  };

  const renderTaskCard = (a: WorkspaceAssignment, mode: "homework" | "exam") => (
    <WorkspaceTaskCard
      key={a.id}
      assignment={a}
      mode={mode}
      busy={busy}
      onGoGrading={() => goGrading(a)}
      onViewAnalytics={() => goAnalytics(a)}
      menuOpen={cardMenuId === a.id}
      onMenuToggle={() => setCardMenuId((id) => (id === a.id ? null : a.id))}
      onMenuClose={() => setCardMenuId(null)}
      onEdit={() => {
        setCardMenuId(null);
        openEdit(a);
      }}
      onDelete={() => {
        setCardMenuId(null);
        openDeleteConfirm(a);
      }}
      onReport={() => {
        setCardMenuId(null);
        openReport(a);
      }}
      onExamUpload={() => {
        setCardMenuId(null);
        openExamUpload(a);
      }}
      onExamScores={() => {
        setCardMenuId(null);
        openExamScores(a);
      }}
      onPublishPending={() => {
        setCardMenuId(null);
        void handlePublishPending(a);
      }}
      onReleaseAnswer={() => {
        setCardMenuId(null);
        void handleReleaseAnswer(a);
      }}
      onToggleLateSubmit={() => {
        setCardMenuId(null);
        void handleToggleLateSubmit(a);
      }}
      onPublishDraft={() => void handlePublishDraft(a.id)}
    />
  );

  const pendingReviewCount = counts.pending_review || counts.unpublished_graded;
  const reviewBadge = pendingReviewCount + counts.corrections_pending;

  const tabMobileTitle =
    tab === "homework" ? "日常作业" : tab === "exams" ? "课堂考试" : "待审阅";

  return (
    <div className="min-h-screen">
      <WorkspacePageLayout
        tab={tab}
        onTabChange={setTab}
        publishedCount={published.length}
        pendingReviewCount={pendingReviewCount}
        homeworkCount={homeworkPublished.length + homeworkDrafts.length}
        examCount={examPublished.length + examDrafts.length}
        reviewBadge={reviewBadge}
        onRefresh={() => void refresh()}
        onPublishHomework={() => {
          setEditing(null);
          setPublishOpen(true);
        }}
        onPublishExam={() => {
          setExamEditing(null);
          setExamPublishOpen(true);
        }}
        mobileTitle={tabMobileTitle}
      >
        {tab === "homework" ? (
          <section className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-ink-muted" {...CUTE_ICON} aria-hidden />
              </div>
            ) : homeworkPublished.length === 0 && homeworkDrafts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-primary/25 bg-white/80 py-16 text-center">
                <Users className="mx-auto h-10 w-10 text-primary/50" {...CUTE_ICON} aria-hidden />
                <p className="mt-4 text-small font-semibold text-ink">还没有日常作业</p>
                <p className="mt-1 text-caption text-ink-muted">点击「发布作业」，学生可在待办中拍照交卷</p>
                <PrimaryButton
                  className="mt-4 min-h-10 gap-2 px-5"
                  onClick={() => {
                    setEditing(null);
                    setPublishOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                  发布第一个作业
                </PrimaryButton>
              </div>
            ) : (
              <>
                {homeworkPublished.length > 0 ? (
                  <ul className="space-y-3">{homeworkPublished.map((a) => renderTaskCard(a, "homework"))}</ul>
                ) : null}
                {homeworkDrafts.length > 0 ? (
                  <div className="mt-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-caption font-bold text-ink-muted">草稿 ({homeworkDrafts.length})</p>
                      {homeworkDrafts.length > 1 ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handlePublishAllDrafts(homeworkDrafts)}
                          className="rounded-full border border-primary/30 bg-primary-tint px-3 py-1 text-caption font-bold text-[#006D41] hover:bg-primary-tint/80 disabled:opacity-50"
                        >
                          全部发布
                        </button>
                      ) : null}
                    </div>
                    <ul className="space-y-3">{homeworkDrafts.map((a) => renderTaskCard(a, "homework"))}</ul>
                  </div>
                ) : null}
              </>
            )}
          </section>
        ) : tab === "exams" ? (
          <section className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-ink-muted" {...CUTE_ICON} aria-hidden />
              </div>
            ) : examPublished.length === 0 && examDrafts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-primary/25 bg-white/80 py-16 text-center">
                <GraduationCap className="mx-auto h-10 w-10 text-primary/50" {...CUTE_ICON} aria-hidden />
                <p className="mt-4 text-small font-semibold text-ink">还没有课堂考试</p>
                <p className="mt-1 text-caption text-ink-muted">点击「发起考试」创建，再在本页上传或批量导入试卷</p>
                <PrimaryButton
                  className="mt-4 min-h-10 gap-2 px-5"
                  onClick={() => {
                    setExamEditing(null);
                    setExamPublishOpen(true);
                  }}
                >
                  <GraduationCap className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                  发起第一场考试
                </PrimaryButton>
              </div>
            ) : (
              <>
                {examPublished.length > 0 ? (
                  <ul className="space-y-3">{examPublished.map((a) => renderTaskCard(a, "exam"))}</ul>
                ) : null}
                {examDrafts.length > 0 ? (
                  <div className="mt-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-caption font-bold text-ink-muted">草稿 ({examDrafts.length})</p>
                      {examDrafts.length > 1 ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handlePublishAllDrafts(examDrafts)}
                          className="rounded-full border border-primary/30 bg-primary-tint px-3 py-1 text-caption font-bold text-[#006D41] hover:bg-primary-tint/80 disabled:opacity-50"
                        >
                          全部发布
                        </button>
                      ) : null}
                    </div>
                    <ul className="space-y-3">{examDrafts.map((a) => renderTaskCard(a, "exam"))}</ul>
                  </div>
                ) : null}
              </>
            )}
          </section>
        ) : (
          <section>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-ink-muted" {...CUTE_ICON} aria-hidden />
              </div>
            ) : pendingReview.length === 0 && correctionItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-primary/25 bg-white/80 py-12 text-center">
                <p className="text-caption font-semibold text-ink">暂无待审阅，一切正常</p>
                <p className="mt-2 text-caption text-ink-muted">学生交卷后会出现在此，可审阅并下发成绩</p>
              </div>
            ) : (
              <div className="space-y-6">
                {[...pendingByAssignment.entries()].map(([assignmentId, subs]) => {
                  const task = assignmentMap.get(assignmentId);
                  const title =
                    task?.title ||
                    subs[0]?.assignment?.title ||
                    (assignmentId === "_none" ? "未关联任务" : "任务");
                  return (
                    <div key={assignmentId}>
                      <h3 className="mb-2 flex flex-wrap items-center gap-2 text-small font-extrabold text-ink">
                        {title}
                        {task ? (
                          <span className="rounded-full bg-primary-tint/70 px-2 py-0.5 text-[0.65rem] font-bold text-[#006D41]">
                            {SUBJECT_CN[task.subject]} · {task.class_name}
                          </span>
                        ) : null}
                        <span className="text-caption font-normal text-ink-muted">({subs.length} 份)</span>
                      </h3>
                      <ul className="space-y-3">
                        {subs.map((sub) => (
                          <li key={sub.id} className="rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-small font-bold text-ink">
                                  {sub.student_name || "未命名"} · {sub.file_name || "作业"}
                                </p>
                                <p className="mt-1 text-caption text-ink-muted">
                                  {formatWhen(sub.created_at)}
                                  {sub.score_percent != null ? ` · ${sub.score_percent}%` : ""}
                                </p>
                              </div>
                              {renderSubmissionActions(sub)}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}

                {correctionItems.length > 0 ? (
                  <div>
                    <h3 className="mb-2 text-small font-extrabold text-sky-800">待验收订正</h3>
                    <ul className="space-y-3">
                      {correctionItems.map((sub) => (
                        <li key={sub.id} className="rounded-2xl border border-sky-100 bg-white/95 px-4 py-3 shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-small font-bold text-ink">
                                {sub.student_name} · {sub.file_name || "作业"}
                              </p>
                              <p className="mt-1 text-caption text-ink-muted">{formatWhen(sub.updated_at)}</p>
                            </div>
                            {renderSubmissionActions(sub)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        )}

      </WorkspacePageLayout>

        <AssignmentReportModal
          open={reportOpen}
          assignmentId={reportAssignment?.id ?? null}
          assignmentTitle={reportAssignment?.title}
          variantTitle="作业提交统计"
          onClose={() => {
            setReportOpen(false);
            setReportAssignment(null);
          }}
        />

        <ExamScoresModal
          open={examScoresOpen}
          assignmentId={examScoresAssignment?.id ?? null}
          assignmentTitle={examScoresAssignment?.title}
          onClose={() => {
            setExamScoresOpen(false);
            setExamScoresAssignment(null);
          }}
          onReviewSubmission={() => {
            setExamScoresOpen(false);
            setTab("review");
            setToast("请在「待审阅」中处理该份试卷");
          }}
        />

        <ExamBatchUploadModal
          open={examUploadOpen}
          assignment={examUploadAssignment}
          onClose={() => {
            setExamUploadOpen(false);
            setExamUploadAssignment(null);
          }}
          onComplete={() => void refresh()}
        />

        <ExamPublishModal
          open={examPublishOpen}
          onClose={() => {
            setExamPublishOpen(false);
            setExamEditing(null);
          }}
          busy={busy}
          editing={examEditing}
          onSubmit={handleSubmitExam}
        />

        <AssignmentPublishModal
          open={publishOpen}
          onClose={() => {
            setPublishOpen(false);
            setEditing(null);
          }}
          busy={busy}
          editing={editing}
          onSubmit={handleSubmitTask}
        />

        <DeleteAssignmentConfirmDialog
          open={Boolean(deleteTarget)}
          assignment={deleteTarget}
          step={deleteStep}
          busy={busy}
          onCancel={closeDeleteConfirm}
          onConfirm={() => void handleDeleteConfirm()}
        />

        {toast ? (
          <p className="fixed bottom-6 left-1/2 z-50 max-w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl bg-ink px-4 py-2.5 text-center text-caption text-white shadow-lg">
            {toast}
          </p>
        ) : null}
    </div>
  );
}
