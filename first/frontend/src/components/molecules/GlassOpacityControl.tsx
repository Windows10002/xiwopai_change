import { Droplets } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { GLASS_OPACITY_DEFAULT } from "@/lib/glassTheme";

type GlassOpacityControlProps = {
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
  className?: string;
};

function GlassOpacitySlider({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <>
      <div className="mt-3 flex items-center gap-2">
        <span className="w-9 shrink-0 text-[0.65rem] font-semibold text-ink-muted">更透</span>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="glass-opacity-range h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-gradient-to-r from-[#51c527]/25 via-primary/20 to-white/70"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
        />
        <span className="w-9 shrink-0 text-right text-[0.65rem] font-semibold text-ink-muted">更实</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[0.65rem] text-ink-muted">
        <span>
          当前：<strong className="tabular-nums text-ink">{value}</strong>
        </span>
        <button
          type="button"
          onClick={() => onChange(GLASS_OPACITY_DEFAULT)}
          className="rounded-lg border border-black/[0.08] bg-white/80 px-2 py-0.5 font-semibold text-ink-muted transition hover:border-primary/25 hover:text-[#006D41]"
        >
          恢复默认（{GLASS_OPACITY_DEFAULT}）
        </button>
      </div>
    </>
  );
}

export function GlassOpacityControl({ value, onChange, compact = false, className = "" }: GlassOpacityControlProps) {
  const id = compact ? "glass-opacity-compact" : "glass-opacity-settings";

  if (compact) {
    return (
      <div
        className={[
          "glass-panel-inner flex min-w-0 max-w-[14rem] flex-col gap-1 rounded-xl px-2.5 py-2 sm:max-w-[16rem]",
          className,
        ].join(" ")}
        title="调整界面毛玻璃浓淡（含侧栏与内容区）"
      >
        <label htmlFor={id} className="flex items-center gap-1.5 text-[0.62rem] font-bold text-ink-muted">
          <Droplets className="h-3.5 w-3.5 shrink-0 text-primary" {...CUTE_ICON} aria-hidden />
          <span className="truncate">界面浓淡</span>
          <span className="ml-auto tabular-nums text-ink">{value}</span>
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="glass-opacity-range h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-[#51c527]/20 via-primary/15 to-white/60"
          aria-label="界面毛玻璃浓淡"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
        />
      </div>
    );
  }

  return (
    <div className={["rounded-xl border border-black/[0.06] bg-surface-page/80 px-4 py-3", className].join(" ")}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-tint/80 text-primary ring-1 ring-primary/15">
          <Droplets className="h-4 w-4" {...CUTE_ICON} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block text-small font-bold text-ink">
            界面毛玻璃浓淡
          </label>
          <p className="mt-0.5 text-caption leading-relaxed text-ink-muted">
            向左更通透、向右更实在；影响批改页、作业管理侧栏与任务卡片等半透明面板。
          </p>
          <GlassOpacitySlider id={id} value={value} onChange={onChange} />
        </div>
      </div>
    </div>
  );
}
