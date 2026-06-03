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

/** 将任教年级展开为可选班级（演示：每年级 1 班、2 班） */
export function buildClassOptions(session: AppSession | null | undefined): string[] {
  const grades = parseTeachingClasses(session);
  if (!grades.length) return ["七年级1班", "七年级2班", "八年级1班"];
  const out: string[] = [];
  for (const g of grades) {
    out.push(`${g}1班`, `${g}2班`);
  }
  return out;
}
