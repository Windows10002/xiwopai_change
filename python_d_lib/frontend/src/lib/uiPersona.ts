import type { AppSession } from "@/lib/appSession";

/** 界面人格：学生用校园青春风；教师与未登录访客用简洁教师风 */
export type UiPersona = "teacher" | "student";

export function getUiPersona(session: AppSession | null): UiPersona {
  if (session?.role === "student") return "student";
  return "teacher";
}

export function isStudentUi(session: AppSession | null): boolean {
  return getUiPersona(session) === "student";
}
