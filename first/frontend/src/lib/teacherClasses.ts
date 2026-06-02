import type { AppSession } from "@/lib/appSession";
import { findDemoAccount } from "@/lib/demoAccounts";

/** 从「任教七年级、八年级」解析班级列表 */
export function parseTeachingClasses(session: AppSession | null | undefined): string[] {
  if (!session || session.role !== "teacher") return [];
  let raw = session.teachingGrades?.trim() ?? "";
  if (!raw && session.loginAccount) {
    raw = findDemoAccount(session.loginAccount)?.teachingGrades ?? "";
  }
  if (!raw) return [];
  return raw
    .split(/[、,，/|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
