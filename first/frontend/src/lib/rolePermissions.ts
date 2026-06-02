import type { AppSession, AppUserRole } from "@/lib/appSession";

/** 功能权限点（演示环境前端 RBAC） */
export type Permission =
  | "grading.access"
  | "grading.manage"
  | "wrong_book"
  | "analytics.student"
  | "analytics.class"
  | "feedback.dashboard"
  | "disputes.submit"
  | "disputes.review"
  | "roster.manage"
  | "export.full"
  | "workspace.view_own"
  | "workspace.submit"
  | "workspace.manage";

const ROLE_PERMISSIONS: Record<AppUserRole, ReadonlySet<Permission>> = {
  parent: new Set(["grading.access"]),
  student: new Set(["grading.access", "wrong_book", "disputes.submit", "workspace.view_own", "workspace.submit"]),
  teacher: new Set([
    "grading.access",
    "grading.manage",
    "analytics.student",
    "analytics.class",
    "feedback.dashboard",
    "disputes.review",
    "roster.manage",
    "export.full",
    "workspace.manage",
  ]),
  admin: new Set([
    "grading.access",
    "grading.manage",
    "analytics.student",
    "analytics.class",
    "feedback.dashboard",
    "disputes.review",
    "roster.manage",
    "export.full",
    "workspace.manage",
  ]),
};

export const ROLE_LABEL: Record<AppUserRole, string> = {
  parent: "家长端",
  student: "学生端",
  teacher: "教师端",
  admin: "教务系统端",
};

export const ROLE_SHORT: Record<AppUserRole, string> = {
  parent: "家长",
  student: "学生",
  teacher: "教师",
  admin: "教务",
};

export function hasPermission(session: AppSession | null, perm: Permission): boolean {
  if (!session) return false;
  return ROLE_PERMISSIONS[session.role].has(perm);
}

export function canUseGradingWorkspace(session: AppSession | null): boolean {
  return hasPermission(session, "grading.access");
}

export function canManageGrading(session: AppSession | null): boolean {
  return hasPermission(session, "grading.manage");
}

export function deniedMessage(perm: Permission): string {
  const map: Partial<Record<Permission, string>> = {
    "grading.access": "当前身份无法使用智能批改",
    "grading.manage": "当前身份无法修改分数或提交教师反馈",
    wrong_book: "错题本仅学生端可用",
    "analytics.student": "学生学情仅教师端与教务端可用",
    "analytics.class": "班级看板仅教师端与教务端可用",
    "feedback.dashboard": "反馈看板仅教师端与教务端可用",
    "disputes.review": "申诉审核仅教师端与教务端可用",
    "disputes.submit": "判题申诉仅学生端可提交",
    "roster.manage": "学生名册仅教师端与教务端可管理",
    "export.full": "完整导出仅教师端与教务端可用",
    "workspace.view_own": "我的作业仅学生端可用",
    "workspace.submit": "提交任务作业需学生端登录",
    "workspace.manage": "任务与收发仅教师端与教务端可用",
  };
  return map[perm] ?? "当前身份无此功能权限";
}
