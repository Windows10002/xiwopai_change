import { useState } from "react";
import { ChevronDown, ChevronRight, Scale } from "lucide-react";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";

type ScoreResultHeroProps = {
  scorePercent: number;
  overallLabel: string;
  /** 打开「给分策略」说明（综合得分卡片右上角） */
  onOpenScoringStrategy?: () => void;
  /** 换算后的显示分（满分非 100 时） */
  scaledScoreDisplay?: number | null;
  /** 换算满分基数，如 60 */
  scaleMax?: number;
  /** 换算满分输入（与下方说明一起并入本卡） */
  scaleMaxInput?: string;
  onScaleMaxInputChange?: (value: string) => void;
};

function scoreHue(percent: number) {
  if (percent >= 85) return "from-emerald-500 via-primary to-teal-400";
  if (percent >= 70) return "from-primary via-lime-400 to-accent-mint";
  if (percent >= 55) return "from-amber-400 via-orange-400 to-orange-500";
  return "from-orange-500 via-red-400 to-red-500";
}

/**
 * 综合得分：单行展示分数与得分率 + 彩色横向进度条；换算满分并入本区。
 */
export function ScoreResultHero({
  scorePercent,
  overallLabel,
  onOpenScoringStrategy,
  scaledScoreDisplay,
  scaleMax = 100,
  scaleMaxInput = "100",
  onScaleMaxInputChange,
}: ScoreResultHeroProps) {
  const [scaleOpen, setScaleOpen] = useState(false);
  const clamped = Math.min(100, Math.max(0, scorePercent));
  const barGradient = scoreHue(clamped);
  const showScale = typeof scaledScoreDisplay === "number" && scaleMax > 0 && scaleMax !== 100;
  const scaled = showScale ? Math.round(scaledScoreDisplay! * 10) / 10 : null;
  const showScaleControls = Boolean(onScaleMaxInputChange);

  return (
    <div className="flex flex-col gap-5 rounded-[1.5rem] border border-primary/15 bg-gradient-to-br from-white via-primary-tint/55 to-white p-5 text-center shadow-sm sm:p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="flex w-full max-w-xl flex-col items-center gap-3">
          <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:gap-3">
            {onOpenScoringStrategy ? (
              <button
                type="button"
                onClick={onOpenScoringStrategy}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-primary/25 bg-white px-2.5 text-primary shadow-sm transition hover:border-brand/40 hover:bg-primary-tint/80"
                title="打开给分策略说明：查看过程分/结果分/规范分的含义、本次得分如何折算，以及系统批改时的计分原则。"
                aria-label="打开给分策略说明"
              >
                <Scale className="h-4 w-4 shrink-0" {...CUTE_ICON} aria-hidden />
                <span className="text-[0.65rem] font-bold leading-none text-ink-muted">给分策略</span>
              </button>
            ) : null}
            <div
              className="inline-flex max-w-full flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5 rounded-2xl bg-white/75 px-3 py-2 ring-1 ring-primary/12 shadow-inner sm:gap-x-3 sm:px-4 sm:py-2.5"
              role="group"
              aria-label={`综合得分 ${clamped} 分，满分 100 分；得分率 ${clamped}%`}
            >
              <span className="shrink-0 text-small font-bold tracking-wide text-ink-muted">综合得分</span>
              <span className="inline-flex items-baseline gap-0.5 tabular-nums">
                <span className="text-3xl font-extrabold leading-none tracking-tight text-[#00A870] sm:text-4xl md:text-5xl">
                  {clamped}
                </span>
                <span className="text-sm font-semibold text-ink-muted/70 sm:text-base md:text-lg">/ 100</span>
              </span>
              <span
                className="mx-0.5 hidden h-4 w-px shrink-0 self-center bg-primary/20 sm:inline"
                aria-hidden
              />
              <span className="shrink-0 text-small font-bold text-ink-muted">得分率</span>
              <span className="inline-flex items-baseline tabular-nums">
                <span className="text-xl font-extrabold leading-none text-teal-700 sm:text-2xl">{clamped}</span>
                <span className="text-base font-bold text-teal-600/85 sm:text-lg">%</span>
              </span>
            </div>
          </div>

          {showScale && scaled != null ? (
            <p className="text-small font-bold text-[#006D41]">
              换算得分：<span className="tabular-nums">{scaled}</span> / {scaleMax} 分（按卷面满分等比例）
            </p>
          ) : null}

          {showScaleControls ? (
            <div className="w-full max-w-md">
              <button
                type="button"
                onClick={() => setScaleOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 rounded-2xl border border-primary/22 bg-gradient-to-r from-white to-primary-tint/40 px-3 py-2.5 text-left shadow-sm ring-1 ring-primary/12 transition hover:border-brand/35 hover:ring-primary/20"
                aria-expanded={scaleOpen}
              >
                <span className="inline-flex items-center gap-2">
                  {scaleOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-primary" {...CUTE_ICON} aria-hidden />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-primary" {...CUTE_ICON} aria-hidden />
                  )}
                  <span>
                    <span className="block text-[0.62rem] font-extrabold uppercase tracking-wide text-[#006D41]">
                      换算满分
                    </span>
                    <span className="mt-0.5 block text-[0.65rem] leading-snug text-ink-muted">
                      {scaleOpen ? "收起" : "按卷面实际满分折算（默认折叠，点击展开）"}
                    </span>
                  </span>
                </span>
              </button>
              {scaleOpen ? (
                <div className="mt-2 rounded-2xl border-2 border-dashed border-primary/28 bg-gradient-to-br from-white via-primary-tint/20 to-white px-3 py-3 text-left shadow-inner ring-1 ring-primary/10 sm:px-4 sm:py-3.5">
                  <label className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <span className="inline-flex shrink-0 items-center rounded-full border border-primary/30 bg-primary-tint/80 px-3 py-1 text-[0.68rem] font-extrabold tracking-wide text-[#006D41] shadow-sm">
                      卷面满分
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={1}
                      max={1000}
                      step={0.5}
                      value={scaleMaxInput}
                      onChange={(e) => onScaleMaxInputChange?.(e.target.value)}
                      className="w-full min-w-0 flex-1 rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-center text-small font-bold tabular-nums text-ink outline-none ring-primary/25 focus:ring-2 sm:max-w-[7.5rem]"
                      aria-label="卷面满分（换算基数）"
                    />
                    <p className="min-w-0 flex-1 text-[0.65rem] leading-relaxed text-ink-muted sm:text-left">
                      若练习卷满分不是 100，请填写实际满分；上方「换算得分」会按比例显示。
                    </p>
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}

          <p className="max-w-lg text-caption leading-relaxed text-ink-muted md:text-small">
            需要回到学科首页时，请点击顶部面包屑里的「首页」（绿色可点链接）。
          </p>
          <p className="text-small font-semibold text-gray-900 md:text-body">{overallLabel}</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl">
        <div className="mb-2 flex justify-between text-small font-medium text-ink-muted md:text-body">
          <span>分数进度</span>
          <span className="tabular-nums">{clamped} / 100</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-100 shadow-inner">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barGradient} shadow-sm transition-[width] duration-700 ease-out`}
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
    </div>
  );
}
