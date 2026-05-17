import { useState } from "react";
import { ChevronDown, ChevronRight, Scale } from "lucide-react";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { ScoreRing } from "@/components/atoms/ScoreRing";

type ScoreResultHeroProps = {
  scorePercent: number;
  onOpenScoringStrategy?: () => void;
  scaledScoreDisplay?: number | null;
  scaleMax?: number;
  scaleMaxInput?: string;
  onScaleMaxInputChange?: (value: string) => void;
};

/** 综合得分主卡片 */
export function ScoreResultHero({
  scorePercent,
  onOpenScoringStrategy,
  scaledScoreDisplay,
  scaleMax = 100,
  scaleMaxInput = "100",
  onScaleMaxInputChange,
}: ScoreResultHeroProps) {
  const [scaleOpen, setScaleOpen] = useState(false);
  const clamped = Math.min(100, Math.max(0, scorePercent));
  const showScale = typeof scaledScoreDisplay === "number" && scaleMax > 0 && scaleMax !== 100;
  const scaled = showScale ? Math.round(scaledScoreDisplay! * 10) / 10 : null;
  const showScaleControls = Boolean(onScaleMaxInputChange);

  return (
    <article className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_8px_30px_rgba(81,197,39,0.08)]">
      <div className="flex items-center justify-between gap-3 border-b border-black/[0.05] bg-gradient-to-r from-primary-tint/80 via-white to-white px-4 py-3 sm:px-5">
        <span className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-ink-muted">本次批改</span>
        {onOpenScoringStrategy ? (
          <button
            type="button"
            onClick={onOpenScoringStrategy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-2.5 py-1.5 text-[0.68rem] font-semibold text-ink-navActive shadow-sm transition hover:border-primary/25 hover:bg-primary-tint/50"
            title="查看过程分、结果分与计分原则"
            aria-label="打开给分策略说明"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary-tint text-ink-navActive">
              <Scale className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
            </span>
            给分策略
          </button>
        ) : null}
      </div>

      <div className="px-4 py-5 sm:px-5 sm:py-6">
        <div
          className="relative overflow-hidden rounded-2xl border border-primary/12 bg-gradient-to-br from-primary-tint/90 via-white to-primary-tint/40 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_20px_rgba(81,197,39,0.08)] sm:p-5"
          role="group"
          aria-label={`综合得分 ${clamped} 分，满分 100 分；得分率 ${clamped}%`}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-primary/8 blur-xl"
            aria-hidden
          />

          <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
            <div className="flex min-w-0 flex-col items-center justify-center pr-3 sm:items-end sm:pr-6">
              <span className="mb-2 inline-flex items-center rounded-md bg-white/80 px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-ink-muted shadow-sm ring-1 ring-black/[0.04]">
                综合得分
              </span>
              <p className="inline-flex items-baseline tabular-nums">
                <span className="text-[2.5rem] font-black leading-none tracking-tight text-ink-navActive sm:text-[3.25rem]">
                  {clamped}
                </span>
                <span className="ml-1.5 text-base font-semibold text-ink-muted/75 sm:text-lg">/ 100</span>
              </p>
              {showScale && scaled != null ? (
                <p className="mt-2 text-center text-[0.65rem] text-ink-muted sm:text-right">
                  换算 <span className="font-bold text-ink-navActive">{scaled}</span> / {scaleMax}
                </p>
              ) : null}
            </div>

            <div
              className="flex h-20 items-center justify-center px-3 sm:px-5"
              role="separator"
              aria-orientation="vertical"
              aria-hidden
            >
              <div className="h-full w-px rounded-full bg-gradient-to-b from-transparent via-primary/45 to-transparent shadow-[0_0_0_1px_rgba(81,197,39,0.12)]" />
            </div>

            <div className="flex min-w-0 flex-col items-center justify-center pl-3 sm:items-start sm:pl-6">
              <span className="mb-2 inline-flex items-center rounded-md bg-white/80 px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-ink-muted shadow-sm ring-1 ring-black/[0.04]">
                得分率
              </span>
              <div className="relative flex h-[5.5rem] w-[5.5rem] items-center justify-center">
                <span
                  className="absolute inset-1 rounded-full bg-white shadow-[inset_0_2px_8px_rgba(81,197,39,0.06)] ring-1 ring-primary/10"
                  aria-hidden
                />
                <ScoreRing percent={clamped} size={88} className="absolute inset-0 m-auto" />
                <span className="relative z-[1] text-[1.35rem] font-black tabular-nums leading-none text-ink-navActive sm:text-2xl">
                  {clamped}
                  <span className="text-sm font-bold text-ink-navActive/70">%</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showScaleControls ? (
        <div className="border-t border-black/[0.05] bg-surface-page/40 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => setScaleOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-xl px-1 py-1 text-left transition hover:bg-black/[0.02]"
            aria-expanded={scaleOpen}
          >
            {scaleOpen ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-ink-navActive" {...CUTE_ICON} aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-navActive" {...CUTE_ICON} aria-hidden />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-caption font-bold text-ink">换算满分</span>
              <span className="block text-[0.65rem] text-ink-muted">
                {scaleOpen ? "收起设置" : "卷面满分不是 100 时可设置"}
              </span>
            </span>
          </button>
          {scaleOpen ? (
            <div className="mt-2 rounded-xl border border-black/[0.06] bg-white p-3 shadow-sm">
              <label className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="shrink-0 text-caption font-semibold text-ink-muted">卷面满分</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={1000}
                  step={0.5}
                  value={scaleMaxInput}
                  onChange={(e) => onScaleMaxInputChange?.(e.target.value)}
                  className="w-full max-w-[5.5rem] rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-center text-small font-bold tabular-nums text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                  aria-label="卷面满分"
                />
                <span className="min-w-0 flex-1 text-[0.65rem] leading-relaxed text-ink-muted">
                  填写后上方显示按比例换算得分
                </span>
              </label>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
