import { useCallback, useEffect, useState } from "react";

import {
  availablePoints,
  listBadgeProgress,
  loadStudentRewardsState,
  REWARD_CATALOG,
  STUDENT_REWARDS_CHANGED,
  totalBadgePoints,
  type StudentRewardsState,
} from "@/lib/studentRewards";

const EMPTY_STATE: StudentRewardsState = {
  badges: {},
  redeemed: [],
  spentPoints: 0,
  completionCount: 0,
  processedSubmissionIds: [],
  processedHistoryIds: [],
};

export function useStudentRewards(enabled = true) {
  const [state, setState] = useState<StudentRewardsState>(() =>
    enabled ? loadStudentRewardsState() : EMPTY_STATE,
  );
  const [badges, setBadges] = useState(() => (enabled ? listBadgeProgress() : []));

  const refresh = useCallback(() => {
    if (!enabled) {
      setState(EMPTY_STATE);
      setBadges([]);
      return;
    }
    const next = loadStudentRewardsState();
    setState(next);
    setBadges(listBadgeProgress());
  }, [enabled]);

  useEffect(() => {
    refresh();
    if (!enabled) return;
    const onChange = () => refresh();
    window.addEventListener(STUDENT_REWARDS_CHANGED, onChange);
    return () => window.removeEventListener(STUDENT_REWARDS_CHANGED, onChange);
  }, [enabled, refresh]);

  const earnedCount = Object.keys(state.badges).length;
  const balance = availablePoints(state);
  const totalPoints = totalBadgePoints(state);

  const rewards = REWARD_CATALOG.map((r) => ({
    ...r,
    redeemed: state.redeemed.includes(r.id),
    canRedeem:
      !state.redeemed.includes(r.id) &&
      balance >= r.cost &&
      (r.minBadges == null || earnedCount >= r.minBadges),
  }));

  return { state, badges, earnedCount, balance, totalPoints, rewards, refresh };
}
