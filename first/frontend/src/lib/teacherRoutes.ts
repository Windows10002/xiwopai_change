import { withAuthSlot } from "@/lib/authSlot";
import type { WorkspaceAssignment } from "@/lib/workspaceApi";

export type WorkspaceTabId = "homework" | "exams" | "review";

export function workspacePath(tab?: WorkspaceTabId): string {
  const base = tab ? `/workspace?tab=${tab}` : "/workspace";
  return withAuthSlot(base);
}

export function gradingPath(subject: WorkspaceAssignment["subject"]): string {
  const map = { math: "/math", english: "/english", chinese: "/chinese" } as const;
  return withAuthSlot(map[subject] ?? "/math");
}

export type LinkAssignmentState = {
  linkAssignment: {
    id: string;
    title: string;
    subject: WorkspaceAssignment["subject"];
    className?: string;
  };
};

export function analyticsPath(opts?: {
  tab?: "history" | "batch" | "class" | "student" | "weak";
  subject?: "math" | "english" | "chinese";
  task?: string;
}): string {
  const params = new URLSearchParams();
  if (opts?.tab && opts.tab !== "class") params.set("tab", opts.tab);
  if (opts?.subject) params.set("subject", opts.subject);
  if (opts?.task?.trim()) params.set("task", opts.task.trim());
  const q = params.toString();
  return withAuthSlot(`/class-analytics${q ? `?${q}` : ""}`);
}

export function parseWorkspaceTab(raw: string | null): WorkspaceTabId {
  if (raw === "exams" || raw === "review" || raw === "homework") return raw;
  return "homework";
}
