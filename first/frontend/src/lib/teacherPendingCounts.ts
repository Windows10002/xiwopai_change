import { fetchGradingDisputes } from "@/lib/gradingDisputeApi";
import { fetchInboxCounts } from "@/lib/workspaceApi";

export type TeacherPendingCounts = {
  inboxTotal: number;
  pendingReview: number;
  correctionsPending: number;
  unpublishedGraded: number;
  /** 仅学生发起的待处理申诉 */
  studentDisputes: number;
};

/** 顶栏/首页统一：待办与申诉统计 */
export async function loadTeacherPendingCounts(): Promise<TeacherPendingCounts> {
  const [inbox, disputes] = await Promise.all([
    fetchInboxCounts().catch(() => ({
      pending_review: 0,
      unpublished_graded: 0,
      corrections_pending: 0,
    })),
    fetchGradingDisputes({ status: "pending" }).catch(() => [] as Awaited<ReturnType<typeof fetchGradingDisputes>>),
  ]);

  const pendingReview = inbox.pending_review || 0;
  const correctionsPending = inbox.corrections_pending || 0;
  const unpublishedGraded = inbox.unpublished_graded || 0;

  return {
    pendingReview,
    correctionsPending,
    unpublishedGraded,
    inboxTotal: pendingReview + correctionsPending + unpublishedGraded,
    studentDisputes: disputes.filter((d) => d.submitter_role === "student").length,
  };
}
