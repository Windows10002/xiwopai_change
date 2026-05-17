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

const scoreNumClass =
  "font-bold tabular-nums tracking-tight text-[#51c527] [font-variant-numeric:tabular-nums]";

const scorePanelClass =
  "rounded-xl bg-gradient-to-br from-white via-[#f4fcf0]/90 to-[#eaf6e4]/70 px-3 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:px-6 sm:py-6";

const scoreLabelClass =
  "mb-3 inline-flex rounded-full border border-[#51c527]/12 bg-gradient-to-b from-white via-[#f4fcf0] to-[#e5f5dc] px-3 py-1 text-caption font-medium text-ink-muted shadow-[0_1px_2px_rgba(81,197,39,0.08)]";

/** 综合得分 + 得分率（对称双栏，中间分隔线） */
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
    <article className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-black/[0.05] px-4 py-3 sm:px-5">
        <span className="text-caption font-medium text-ink-muted">本次批改</span>
        {onOpenScoringStrategy ? (
          <button
            type="button"
            onClick={onOpenScoringStrategy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-[#f4fcf0] px-2.5 py-1.5 text-caption font-semibold text-[#51c527] transition hover:bg-[#eaf6e4]"
            aria-label="打开给分策略说明"
          >
            <Scale className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
            给分策略
          </button>
        ) : null}
      </div>

      <div className="px-4 py-5 sm:px-5 sm:py-6">
        <div
          className={scorePanelClass}
          role="group"
          aria-label={`综合得分 ${clamped} 分，满分 100 分；得分率 ${clamped}%`}
        >
          <div className="flex items-center">
            {/* 综合得分 */}
            <div className="flex min-w-0 flex-1 flex-col items-center text-center">
              <p className={scoreLabelClass}>综合得分</p>
              <div className="flex h-[5.25rem] items-center justify-center">
                <p className={`text-5xl leading-none sm:text-[3.25rem] ${scoreNumClass}`}>
                  {clamped}
                  <span className="ml-1 text-xl font-semibold text-ink-muted/70 sm:text-2xl">/ 100</span>
                </p>
              </div>
              {showScale && scaled != null ? (
                <p className="mt-2 text-[0.65rem] text-ink-muted">
                  换算 <span className="font-semibold text-[#51c527]">{scaled}</span> / {scaleMax}
                </p>
              ) : null}
            </div>

            <div
              className="mx-4 h-20 w-px shrink-0 bg-gradient-to-b from-transparent via-[#51c527]/35 to-transparent sm:mx-6"
              role="separator"
              aria-hidden
            />

            {/* 得分率 */}
            <div className="flex min-w-0 flex-1 flex-col items-center text-center">
              <p className={scoreLabelClass}>得分率</p>
              <div className="relative flex h-[5.25rem] w-[5.25rem] items-center justify-center">
                <ScoreRing percent={clamped} size={84} />
                <div className={`absolute inset-0 flex items-center justify-center text-2xl sm:text-[1.65rem] ${scoreNumClass}`}>
                  {clamped}
                  <span className="text-base font-semibold text-[#51c527]/80">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showScaleControls ? (
          <div className="mt-4 border-t border-black/[0.05] pt-3">
            <button
              type="button"
              onClick={() => setScaleOpen((v) => !v)}
              className="flex w-full items-center gap-2 text-left text-caption text-ink-muted transition hover:text-ink"
              aria-expanded={scaleOpen}
            >
              {scaleOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-[#51c527]" {...CUTE_ICON} aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-[#51c527]" {...CUTE_ICON} aria-hidden />
              )}
              <span>
                <span className="font-semibold text-ink">换算满分</span>
                <span className="ml-1.5 text-ink-muted">
                  {scaleOpen ? "收起" : "卷面满分不是 100 时可设置"}
                </span>
              </span>
            </button>
            {scaleOpen ? (
              <div className="mt-2 rounded-lg border border-black/[0.06] bg-white p-3">
                <label className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-caption font-medium text-ink-muted">卷面满分</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={1}
                    max={1000}
                    step={0.5}
                    value={scaleMaxInput}
                    onChange={(e) => onScaleMaxInputChange?.(e.target.value)}
                    className="w-24 rounded-lg border border-black/[0.1] px-2 py-1.5 text-center text-small font-bold tabular-nums outline-none focus:border-[#51c527]/50 focus:ring-2 focus:ring-[#51c527]/20"
                    aria-label="卷面满分"
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
