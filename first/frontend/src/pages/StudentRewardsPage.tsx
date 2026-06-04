import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { IpBrandFace } from "@/components/atoms/IpMascot";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { PiBadgeMedal } from "@/components/molecules/PiBadgeMedal";
import { StudentPageShell } from "@/components/molecules/StudentPageShell";
import { useStudentRewards } from "@/hooks/useStudentRewards";
import { loadGradingHistory } from "@/lib/gradingHistory";
import { redeemReward, syncRewardsFromHistoryEntries, syncRewardsFromSubmissions } from "@/lib/studentRewards";
import { loadStudentProfileName } from "@/lib/studentProfileName";
import { fetchMySubmissions } from "@/lib/workspaceApi";

export function StudentRewardsPage() {
  const { badges, earnedCount, balance, totalPoints, rewards, refresh } = useStudentRewards();
  const [toast, setToast] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const run = async () => {
      const name = loadStudentProfileName().trim();
      if (!name) {
        syncRewardsFromHistoryEntries(loadGradingHistory());
        return;
      }
      setSyncing(true);
      try {
        const data = await fetchMySubmissions(name);
        syncRewardsFromSubmissions(data.items);
        syncRewardsFromHistoryEntries(loadGradingHistory());
      } finally {
        setSyncing(false);
      }
    };
    void run();
  }, []);

  const onRedeem = (rewardId: string) => {
    const res = redeemReward(rewardId);
    if (res.ok) {
      setToast("兑换成功！奖励已记入你的账户（演示）");
      refresh();
    } else {
      setToast(res.message);
    }
    window.setTimeout(() => setToast(null), 3200);
  };

  return (
    <StudentPageShell pageTitle="π 奖励" mainClassName="max-w-4xl">
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="home-hero-card campus-tape-card rounded-[1.35rem] px-5 py-8 shadow-card ring-1 ring-white/90 sm:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <IpBrandFace size="md" decorative className="animate-float-gentle" />
              <span className="campus-tag campus-tag--sun absolute -right-2 -top-1 rotate-6 text-[0.6rem]">π</span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold text-ink">π 奖励与徽章</h1>
              <p className="mt-1 text-small text-ink-muted">
                完成作业并达到准确率要求，即可收集 IP 徽章；积分可兑换虚拟奖励（本机演示）。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="campus-tag campus-tag--mint font-bold">
                  已集 {earnedCount} / {badges.length} 枚
                </span>
                <span className="campus-tag campus-tag--sky font-bold">可用积分 {balance}</span>
                <span className="campus-tag campus-tag--sun text-ink-muted">累计获得 {totalPoints}</span>
              </div>
            </div>
          </div>

          {syncing ? (
            <p className="mt-4 text-caption text-ink-muted">正在同步作业记录…</p>
          ) : null}

          <section className="mt-8" aria-labelledby="badges-heading">
            <h2 id="badges-heading" className="flex items-center gap-2 text-body font-extrabold text-ink">
              <Sparkles className="h-5 w-5 text-amber-500" {...CUTE_ICON} aria-hidden />
              我的徽章
            </h2>
            <p className="mt-1 text-caption text-ink-muted">
              教师作业 ≥70% 起可获得对应档位；80% / 90% / 100% 解锁更高徽章。自助批改同样计入。
            </p>
            <div className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
              {badges.map((b) => (
                <PiBadgeMedal key={b.id} badge={b} earned={b.earned} size="sm" />
              ))}
            </div>
          </section>

          <section className="mt-10 border-t border-dashed border-primary/15 pt-8" aria-labelledby="rewards-heading">
            <h2 id="rewards-heading" className="text-body font-extrabold text-ink">
              积分兑换
            </h2>
            <p className="mt-1 text-caption text-ink-muted">每枚徽章带有积分；集齐一定数量还可解锁高级兑换项。</p>
            <ul className="mt-5 space-y-3">
              {rewards.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-4 shadow-sm ring-1 ring-black/[0.05]"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xl ring-1 ring-amber-200/80">
                      {r.emoji}
                    </span>
                    <div>
                      <p className="font-bold text-ink">{r.title}</p>
                      <p className="mt-0.5 text-caption text-ink-muted">{r.description}</p>
                      {r.minBadges ? (
                        <p className="mt-1 text-[0.65rem] font-semibold text-violet-800">需至少 {r.minBadges} 枚徽章</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-caption font-bold text-amber-800">{r.cost} 积分</span>
                    {r.redeemed ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-[0.65rem] font-bold text-emerald-900">
                        已兑换
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!r.canRedeem}
                        onClick={() => onRedeem(r.id)}
                        className="rounded-full bg-primary px-4 py-1.5 text-caption font-bold text-white shadow-sm transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        兑换
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <p className="mt-8 text-center text-caption text-ink-subtle">
            徽章与积分保存在本机浏览器，换设备需重新积累（演示环境）。
          </p>
        </div>

        {toast ? (
          <p className="fixed bottom-6 left-1/2 z-50 max-w-[min(92vw,24rem)] -translate-x-1/2 rounded-2xl bg-ink px-4 py-2.5 text-center text-caption font-semibold text-white shadow-lg">
            {toast}
          </p>
        ) : null}
      </main>
    </StudentPageShell>
  );
}
