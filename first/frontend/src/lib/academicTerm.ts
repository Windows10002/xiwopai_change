/**
 * 学年学期（客户端）：按日期推断归属，供学情/批改历史筛选。
 * 后续可在设置中覆盖起止日；新写入的批改历史可显式带 termId。
 */

import type { GradingHistoryEntry } from "@/lib/gradingHistory";

export type AcademicTermId = `${number}-${number}-${1 | 2}`;

export type AcademicTerm = {
  id: AcademicTermId;
  /** 如 2024-2025 学年 */
  schoolYearLabel: string;
  /** 1 | 2 */
  termIndex: 1 | 2;
  label: string;
  startMs: number;
  endMs: number;
};

/** 中国大陆常见校历：一学期约 9/1–次年 1/31，二学期约 2/1–7/15（演示默认，可配置化） */
function termBounds(schoolYearStart: number, termIndex: 1 | 2): { startMs: number; endMs: number } {
  if (termIndex === 1) {
    const start = new Date(schoolYearStart, 8, 1, 0, 0, 0, 0).getTime();
    const end = new Date(schoolYearStart + 1, 0, 31, 23, 59, 59, 999).getTime();
    return { startMs: start, endMs: end };
  }
  const start = new Date(schoolYearStart + 1, 1, 1, 0, 0, 0, 0).getTime();
  const end = new Date(schoolYearStart + 1, 6, 15, 23, 59, 59, 999).getTime();
  return { startMs: start, endMs: end };
}

function schoolYearStartForDate(d: Date): number {
  const y = d.getFullYear();
  const m = d.getMonth();
  // 8 月及以后算新学年起点年
  return m >= 7 ? y : y - 1;
}

export function buildTerm(schoolYearStart: number, termIndex: 1 | 2): AcademicTerm {
  const { startMs, endMs } = termBounds(schoolYearStart, termIndex);
  const id = `${schoolYearStart}-${schoolYearStart + 1}-${termIndex}` as AcademicTermId;
  const schoolYearLabel = `${schoolYearStart}-${schoolYearStart + 1} 学年`;
  const label = termIndex === 1 ? `${schoolYearLabel} · 上学期` : `${schoolYearLabel} · 下学期`;
  return { id, schoolYearLabel, termIndex, label, startMs, endMs };
}

/** 给定时间戳所属学期 */
export function termForTimestamp(ts: number): AcademicTerm {
  const d = new Date(ts);
  const sy = schoolYearStartForDate(d);
  const m = d.getMonth();
  // 2–7 月偏下学期；8–1 偏上学期（与 termBounds 对齐）
  const termIndex: 1 | 2 = m >= 1 && m <= 6 ? 2 : 1;
  return buildTerm(sy, termIndex);
}

export function getCurrentTerm(at: number = Date.now()): AcademicTerm {
  return termForTimestamp(at);
}

/** 最近若干学期（含当前），用于下拉；默认当前在前 */
export function listRecentTerms(count = 6, at: number = Date.now()): AcademicTerm[] {
  const out: AcademicTerm[] = [];
  let term = getCurrentTerm(at);
  for (let i = 0; i < count; i++) {
    if (out.some((x) => x.id === term.id)) break;
    out.push(term);
    const sy = parseInt(term.id.slice(0, 4), 10);
    term = term.termIndex === 1 ? buildTerm(sy - 1, 2) : buildTerm(sy, 1);
  }
  return out;
}

export function isTimestampInTerm(ts: number, term: AcademicTerm): boolean {
  return ts >= term.startMs && ts <= term.endMs;
}

export function filterByTerm<T>(items: T[], getTs: (item: T) => number, term: AcademicTerm): T[] {
  return items.filter((item) => isTimestampInTerm(getTs(item), term));
}

export type TermScope = "current" | "all" | AcademicTermId;

function termForScope(scope: TermScope): AcademicTerm {
  if (scope === "current") return getCurrentTerm();
  return listRecentTerms(12).find((t) => t.id === scope) ?? getCurrentTerm();
}

export function filterByTermScope<T>(items: T[], getTs: (item: T) => number, scope: TermScope): T[] {
  if (scope === "all") return items;
  return filterByTerm(items, getTs, termForScope(scope));
}

export function filterGradingHistoryByScope(entries: GradingHistoryEntry[], scope: TermScope): GradingHistoryEntry[] {
  return filterByTermScope(entries, (e) => e.createdAt, scope);
}
