import type { WorkspaceAssignment } from "@/lib/workspaceApi";

const WEEKDAY_CN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;

export type DueDateTimeParts = {
  year: number;
  month: number;
  day: number;
  weekday: string;
  hour: string;
  minute: string;
  dateText: string;
  timeText: string;
  full: string;
};

/** 统一截止时间展示（避免 locale 拼成「6/4周四18:00」） */
export function parseDueDateTime(iso: string): DueDateTimeParts | null {
  if (!iso.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  const weekday = WEEKDAY_CN[d.getDay()];
  const dateText = `${year}年${month}月${day}日`;
  const timeText = `${hour}:${minute}`;
  return {
    year,
    month,
    day,
    weekday,
    hour,
    minute,
    dateText,
    timeText,
    full: `${dateText} ${weekday} ${timeText}`,
  };
}

/** 与教师端一致的截止时间展示 */
export function formatAssignmentDue(iso: string): string {
  if (!iso) return "—";
  return parseDueDateTime(iso)?.full ?? iso.slice(0, 16).replace("T", " ");
}

export function assignmentDueLabel(a: Pick<WorkspaceAssignment, "due_at" | "is_overdue" | "can_submit" | "allow_late_submit">): string {
  const due = formatAssignmentDue(a.due_at);
  if (a.is_overdue) {
    return a.allow_late_submit ? `已截止 ${due} · 教师已开放补交` : `已截止 ${due}`;
  }
  return `截止 ${due}`;
}

export function submitBlockedReason(a: Pick<WorkspaceAssignment, "can_submit" | "is_overdue" | "allow_late_submit">): string | null {
  if (a.can_submit !== false) return null;
  if (a.is_overdue && !a.allow_late_submit) {
    return "已超过截止时间，暂不可交卷；请等待教师开放补交入口";
  }
  return "当前不可交卷";
}
