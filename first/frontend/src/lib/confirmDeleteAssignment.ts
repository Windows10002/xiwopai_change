import type { WorkspaceAssignment } from "@/lib/workspaceApi";

export type AssignmentDeleteStep = 1 | 2;

export function assignmentDeleteKind(a: WorkspaceAssignment): "考试" | "作业" {
  return a.submission_mode === "teacher" ? "考试" : "作业";
}

export function assignmentDeleteNeedsSecondStep(a: WorkspaceAssignment): boolean {
  return (a.submission_count ?? 0) > 0;
}

export function assignmentDeleteStepCopy(
  a: WorkspaceAssignment,
  step: AssignmentDeleteStep,
): { title: string; subtitle: string; body: string } {
  const kind = assignmentDeleteKind(a);
  const title = a.title.trim() || "未命名任务";
  const subs = a.submission_count ?? 0;

  if (step === 2) {
    return {
      title: `再次确认删除${kind}`,
      subtitle: title,
      body: `该${kind}已有 ${subs} 份提交记录。删除后将同时清除所有提交、批改与成绩数据，且无法恢复。`,
    };
  }

  return {
    title: `删除${kind}`,
    subtitle: title,
    body: subs > 0
      ? `确定要删除该${kind}吗？因已有学生提交，需要您再次确认后才会执行删除。`
      : `确定要删除该${kind}吗？此操作不可恢复。`,
  };
}
