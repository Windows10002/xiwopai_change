import { getAuthSlot, scopedStorageKey } from "@/lib/authSlot";

const STORAGE_KEY = "seewo_pi_student_rewards_v1";

export type EarnedBadge = {
  earnedAt: number;
  score?: number;
  label?: string;
};

export type StudentRewardsState = {
  badges: Record<string, EarnedBadge>;
  redeemed: string[];
  spentPoints: number;
  completionCount: number;
  processedSubmissionIds: string[];
  processedHistoryIds: string[];
};

const EMPTY: StudentRewardsState = {
  badges: {},
  redeemed: [],
  spentPoints: 0,
  completionCount: 0,
  processedSubmissionIds: [],
  processedHistoryIds: [],
};

function storageKey(): string {
  return scopedStorageKey(STORAGE_KEY);
}

export function loadStudentRewardsState(): StudentRewardsState {
  try {
    const raw = localStorage.getItem(storageKey()) || (getAuthSlot() === "main" ? localStorage.getItem(STORAGE_KEY) : null);
    if (!raw) return { ...EMPTY, badges: {}, processedSubmissionIds: [], processedHistoryIds: [], redeemed: [] };
    const parsed = JSON.parse(raw) as Partial<StudentRewardsState>;
    return {
      badges: parsed.badges && typeof parsed.badges === "object" ? parsed.badges : {},
      redeemed: Array.isArray(parsed.redeemed) ? parsed.redeemed.filter((x): x is string => typeof x === "string") : [],
      spentPoints: typeof parsed.spentPoints === "number" ? parsed.spentPoints : 0,
      completionCount: typeof parsed.completionCount === "number" ? parsed.completionCount : 0,
      processedSubmissionIds: Array.isArray(parsed.processedSubmissionIds)
        ? parsed.processedSubmissionIds.filter((x): x is string => typeof x === "string")
        : [],
      processedHistoryIds: Array.isArray(parsed.processedHistoryIds)
        ? parsed.processedHistoryIds.filter((x): x is string => typeof x === "string")
        : [],
    };
  } catch {
    return { ...EMPTY, badges: {}, processedSubmissionIds: [], processedHistoryIds: [], redeemed: [] };
  }
}

export function saveStudentRewardsState(state: StudentRewardsState): void {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(state));
    if (getAuthSlot() === "main") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    /* ignore */
  }
}
