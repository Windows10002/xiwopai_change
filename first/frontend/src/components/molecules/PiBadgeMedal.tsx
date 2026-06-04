import { IpBrandFace } from "@/components/atoms/IpMascot";
import type { BadgeDef, BadgeTier } from "@/lib/studentRewards";
import { TIER_RING } from "@/lib/studentRewards";

type PiBadgeMedalProps = {
  badge: Pick<BadgeDef, "title" | "emoji" | "tier">;
  earned?: boolean;
  size?: "sm" | "md";
  className?: string;
};

/** IP 风格徽章展示 */
export function PiBadgeMedal({ badge, earned = false, size = "md", className = "" }: PiBadgeMedalProps) {
  const dim = size === "sm" ? "h-16 w-16" : "h-20 w-20";
  const ring = TIER_RING[badge.tier as BadgeTier];

  return (
    <div
      className={`relative flex flex-col items-center ${className}`}
      title={badge.title}
    >
      <div
        className={`relative ${dim} ${earned ? "" : "opacity-45 grayscale"}`}
      >
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-br p-[3px] ${ring}`}
        >
          <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white shadow-inner">
            <span className="text-xl leading-none sm:text-2xl" aria-hidden>
              {badge.emoji}
            </span>
            <IpBrandFace size="sm" decorative className="!-mt-1 !h-6 !w-6 opacity-90" />
          </div>
        </div>
        {!earned ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/50 text-lg">
            🔒
          </span>
        ) : null}
      </div>
      <span className={`mt-1.5 max-w-[5.5rem] text-center text-[0.65rem] font-bold leading-tight ${earned ? "text-ink" : "text-ink-subtle"}`}>
        {badge.title}
      </span>
    </div>
  );
}
