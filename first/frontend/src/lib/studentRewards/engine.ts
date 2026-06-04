import type { GradeSubject } from "@/lib/gradeSubject";
import type { GradingHistoryEntry } from "@/lib/gradingHistory";
import { loadStudentProfileName } from "@/lib/studentProfileName";
import type { WorkspaceSubmission } from "@/lib/workspaceApi";

import { BADGE_CATALOG, BADGE_BY_ID, REWARD_BY_ID, subjectBadgeId } from "./catalog";
import { loadStudentRewardsState, saveStudentRewardsState, type StudentRewardsState } from "./store";

export const STUDENT_REWARDS_CHANGED = "seewo-pi-student-rewards-changed";
export const STUDENT_BADGE_EARNED = "seewo-pi-student-badge-earned";

function dispatchChanged(newBadgeIds: string[]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STUDENT_REWARDS_CHANGED));
  for (const id of newBadgeIds) {
    window.dispatchEvent(new CustomEvent(STUDENT_BADGE_EARNED, { detail: { badgeId: id } }));
  }
}

function grantBadge(state: StudentRewardsState, badgeId: string, meta: { score?: number; label?: string }): boolean {
  if (state.badges[badgeId]) return false;
  if (!BADGE_BY_ID[badgeId]) return false;
  state.badges[badgeId] = { earnedAt: Date.now(), ...meta };
  return true;
}

function evaluateScoreBadges(state: StudentRewardsState, score: number, subject: GradeSubject, label: string): string[] {
  const earned: string[] = [];
  const tryGrant = (id: string) => {
    if (grantBadge(state, id, { score, label })) earned.push(id);
  };
  tryGrant("first_done");
  if (score >= 70) tryGrant("score_70");
  if (score >= 80) tryGrant("score_80");
  if (score >= 90) tryGrant("score_90");
  if (score >= 100) tryGrant("score_100");
  if (score >= 70) tryGrant(subjectBadgeId(subject));
  return earned;
}

function evaluateMilestoneBadges(state: StudentRewardsState): string[] {
  const earned: string[] = [];
  const count = Object.keys(state.badges).filter((id) => !id.startsWith("collector_")).length;
  if (state.completionCount >= 3 && grantBadge(state, "done_3", { label: "累计 3 次" })) earned.push("done_3");
  if (state.completionCount >= 7 && grantBadge(state, "done_7", { label: "累计 7 次" })) earned.push("done_7");
  if (count >= 5 && grantBadge(state, "collector_5", { label: "集齐 5 枚" })) earned.push("collector_5");
  if (count >= 8 && grantBadge(state, "collector_8", { label: "集齐 8 枚" })) earned.push("collector_8");
  return earned;
}

function recordCompletion(
  state: StudentRewardsState,
  score: number,
  subject: GradeSubject,
  label: string,
): string[] {
  state.completionCount += 1;
  const earned = evaluateScoreBadges(state, score, subject, label);
  earned.push(...evaluateMilestoneBadges(state));
  return earned;
}

function submissionScore(sub: WorkspaceSubmission): number | null {
  if (typeof sub.score_percent === "number" && Number.isFinite(sub.score_percent)) return sub.score_percent;
  const raw = sub.grading_record?.result;
  if (raw && typeof raw === "object" && "score_percent" in raw) {
    const n = Number((raw as { score_percent?: unknown }).score_percent);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function isRewardableSubmission(sub: WorkspaceSubmission): boolean {
  const score = submissionScore(sub);
  if (score != null) return true;
  return sub.status === "published" || sub.status === "graded" || Boolean(sub.grading_record);
}

/** 根据教师下发/已发布的提交记录授予徽章 */
export function syncRewardsFromSubmissions(submissions: WorkspaceSubmission[]): string[] {
  const state = loadStudentRewardsState();
  const newly: string[] = [];
  for (const sub of submissions) {
    if (state.processedSubmissionIds.includes(sub.id)) continue;
    if (!isRewardableSubmission(sub)) continue;
    const score = submissionScore(sub);
    if (score == null) continue;
    state.processedSubmissionIds.push(sub.id);
    const label = sub.assignment?.title ?? sub.file_name ?? "作业";
    newly.push(...recordCompletion(state, score, sub.subject, label));
  }
  if (newly.length > 0) {
    saveStudentRewardsState(state);
    dispatchChanged(newly);
  }
  return newly;
}

/** 自助批改完成后授予徽章 */
export function syncRewardsFromGradingEntry(
  historyId: string,
  scorePercent: number,
  subject: GradeSubject,
  fileName: string,
): string[] {
  const state = loadStudentRewardsState();
  if (state.processedHistoryIds.includes(historyId)) return [];
  state.processedHistoryIds.push(historyId);
  const newly = recordCompletion(state, scorePercent, subject, fileName);
  if (newly.length > 0) {
    saveStudentRewardsState(state);
    dispatchChanged(newly);
  }
  return newly;
}

/** 扫描本机批改历史中属于当前学生的记录（补发） */
export function syncRewardsFromHistoryEntries(entries: GradingHistoryEntry[]): string[] {
  const profile = loadStudentProfileName().trim();
  const state = loadStudentRewardsState();
  const newly: string[] = [];
  for (const e of entries) {
    if (state.processedHistoryIds.includes(e.id)) continue;
    if (profile && e.studentName?.trim() && e.studentName.trim() !== profile) continue;
    state.processedHistoryIds.push(e.id);
    newly.push(...recordCompletion(state, e.detail.scorePercent, e.subject, e.fileName));
  }
  if (newly.length > 0) {
    saveStudentRewardsState(state);
    dispatchChanged(newly);
  }
  return newly;
}

export function totalBadgePoints(state: StudentRewardsState): number {
  return Object.keys(state.badges).reduce((sum, id) => sum + (BADGE_BY_ID[id]?.points ?? 0), 0);
}

export function availablePoints(state: StudentRewardsState): number {
  return Math.max(0, totalBadgePoints(state) - state.spentPoints);
}

export function redeemReward(rewardId: string): { ok: true } | { ok: false; message: string } {
  const def = REWARD_BY_ID[rewardId];
  if (!def) return { ok: false, message: "奖励不存在" };
  const state = loadStudentRewardsState();
  if (state.redeemed.includes(rewardId)) return { ok: false, message: "已兑换过该奖励" };
  const badgeCount = Object.keys(state.badges).length;
  if (def.minBadges != null && badgeCount < def.minBadges) {
    return { ok: false, message: `需至少拥有 ${def.minBadges} 枚徽章` };
  }
  const balance = availablePoints(state);
  if (balance < def.cost) {
    return { ok: false, message: `积分不足（还需 ${def.cost - balance} 分）` };
  }
  state.spentPoints += def.cost;
  state.redeemed.push(rewardId);
  saveStudentRewardsState(state);
  dispatchChanged([]);
  return { ok: true };
}

export function listBadgeProgress() {
  const state = loadStudentRewardsState();
  return BADGE_CATALOG.map((b) => ({
    ...b,
    earned: Boolean(state.badges[b.id]),
    earnedAt: state.badges[b.id]?.earnedAt,
    meta: state.badges[b.id],
  }));
}

