import type { CSSProperties, ReactNode } from "react";
import { Check } from "lucide-react";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";

export type StepDef = {
  id: string;
  label: string;
};

const DEFAULT_STEPS: StepDef[] = [
  { id: "upload", label: "上传图片" },
  { id: "ocr", label: "识别阅卷" },
  { id: "feedback", label: "评语学情" },
];

/** 第二步略偏右，与 1、3 步圆点同一水平线 */
const MID_STEP_STYLE: CSSProperties = {
  left: "55%",
  transform: "translateX(-50%)",
};

/** 设计稿中取色：步骤激活圆点 */
const STEP_ACTIVE_GREEN = "#51c527";

/** 供面包屑等与步骤条文案保持一致 */
export function getGradingStepLabel(step1Based: number): string {
  const i = Math.min(Math.max(step1Based, 1), DEFAULT_STEPS.length) - 1;
  return DEFAULT_STEPS[i]?.label ?? DEFAULT_STEPS[0].label;
}

type StepIndicatorProps = {
  steps?: StepDef[];
  /** 1-based 当前步 */
  current: number;
  /** 置于步骤条白卡片内右侧（如「清空当前页」） */
  trailingSlot?: ReactNode;
};

/**
 * 水平步骤条：圆点连线 + 下方文案；当前步高亮，后续置灰
 */
export function StepIndicator({ steps = DEFAULT_STEPS, current, trailingSlot }: StepIndicatorProps) {
  return (
    <nav
      className="step-indicator-shell glass-panel w-full max-w-full gap-3 rounded-[1.35rem] px-3 py-3 shadow-card ring-1 sm:px-4 sm:py-4"
      aria-label="批改流程步骤"
    >
      <ol className="step-indicator-track w-full min-w-0 max-w-none list-none px-1 sm:px-2">
        {steps.map((step, index) => {
          const n = index + 1;
          const isActive = n === current;
          const isDone = n < current;

          return (
            <li
              key={step.id}
              className="step-indicator-li"
              style={index === 1 ? MID_STEP_STYLE : undefined}
            >
              <div className="step-indicator-dot-slot">
                <span
                  className={[
                    "step-indicator-dot flex h-9 w-9 items-center justify-center rounded-full border text-caption font-bold transition-all duration-button ease-smooth",
                    isActive ? "animate-step-active-pulse ring-2 ring-[#51c527]/35 border text-white shadow-none" : "",
                    isDone ? "border text-white shadow-none" : "",
                    !isActive && !isDone ? "border-gray-200 bg-gray-100 text-gray-500" : "",
                  ].join(" ")}
                  style={
                    isActive || isDone
                      ? { backgroundColor: STEP_ACTIVE_GREEN, borderColor: STEP_ACTIVE_GREEN }
                      : undefined
                  }
                >
                  {isDone ? <Check className="h-4 w-4" {...CUTE_ICON} aria-hidden /> : n}
                </span>
              </div>

              <span className="step-indicator-label -mt-1 flex max-w-[6rem] flex-col items-center">
                <span
                  className={[
                    "step-indicator-label-inner w-full text-center text-[0.8125rem] leading-snug sm:text-small md:text-body",
                    isActive || isDone
                      ? "font-semibold text-gray-900"
                      : "font-medium text-slate-500",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      {trailingSlot ? (
        <div className="step-indicator-actions">
          {trailingSlot}
        </div>
      ) : null}
    </nav>
  );
}
