import { useEffect, useState } from "react";

import { PiBadgeMedal } from "@/components/molecules/PiBadgeMedal";
import { BADGE_BY_ID, STUDENT_BADGE_EARNED } from "@/lib/studentRewards";

/** 获得新徽章时的轻提示（挂载在布局根节点） */
export function StudentBadgeEarnedToast() {
  const [badgeId, setBadgeId] = useState<string | null>(null);

  useEffect(() => {
    const onEarned = (e: Event) => {
      const id = (e as CustomEvent<{ badgeId: string }>).detail?.badgeId;
      if (!id || !BADGE_BY_ID[id]) return;
      setBadgeId(id);
    };
    window.addEventListener(STUDENT_BADGE_EARNED, onEarned);
    return () => window.removeEventListener(STUDENT_BADGE_EARNED, onEarned);
  }, []);

  useEffect(() => {
    if (!badgeId) return;
    const t = window.setTimeout(() => setBadgeId(null), 4200);
    return () => window.clearTimeout(t);
  }, [badgeId]);

  const badge = badgeId ? BADGE_BY_ID[badgeId] : null;
  if (!badge) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-24 left-1/2 z-[130] w-[min(92vw,20rem)] -translate-x-1/2 animate-fade-up-in"
      role="status"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-white to-emerald-50/90 px-4 py-3 shadow-2xl ring-1 ring-amber-100">
        <PiBadgeMedal badge={badge} earned size="sm" />
        <div className="min-w-0">
          <p className="text-caption font-black text-amber-950">新徽章解锁！</p>
          <p className="text-small font-bold text-ink">{badge.title}</p>
          <p className="mt-0.5 text-[0.65rem] text-ink-muted">+{badge.points} 积分 · 去「π 奖励」兑换好礼</p>
        </div>
      </div>
    </div>
  );
}
