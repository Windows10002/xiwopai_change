import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";

export type GradingFlowStep = {
  id: string;
  label: string;
  to?: string;
  onClick?: () => void;
};

type StepStatus = "done" | "active" | "pending";

function stepStatus(index: number, activeIndex: number): StepStatus {
  if (index < activeIndex) return "done";
  if (index === activeIndex) return "active";
  return "pending";
}

type GradingFlowStepsProps = {
  steps: GradingFlowStep[];
  activeIndex: number;
};

/** 批改三步进度条：灰 / 绿 / 勾 */
export function GradingFlowSteps({ steps, activeIndex }: GradingFlowStepsProps) {
  return (
    <ol className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0" aria-label="批改流程">
      {steps.map((step, i) => {
        const status = stepStatus(i, activeIndex);
        const isLast = i === steps.length - 1;
        const circleClass =
          status === "done"
            ? "border-primary bg-primary text-white"
            : status === "active"
              ? "border-primary bg-primary-tint text-brand ring-2 ring-primary/25"
              : "border-black/10 bg-gray-50 text-ink-subtle";

        const inner = (
          <>
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[0.6875rem] font-black transition-colors ${circleClass}`}
              aria-hidden
            >
              {status === "done" ? <Check className="h-3.5 w-3.5" {...CUTE_ICON} strokeWidth={2.5} /> : i + 1}
            </span>
            <span
              className={`text-caption font-semibold ${status === "pending" ? "text-ink-subtle" : status === "active" ? "text-brand" : "text-ink"}`}
            >
              {step.label}
            </span>
          </>
        );

        const itemClass = "flex min-w-0 flex-1 items-center gap-2 sm:px-1";

        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center">
            {step.to ? (
              <Link to={step.to} className={`${itemClass} rounded-lg px-1 py-1 transition-colors hover:bg-primary-tint/40`}>
                {inner}
              </Link>
            ) : (
              <button type="button" onClick={step.onClick} className={`${itemClass} rounded-lg px-1 py-1 text-left transition-colors hover:bg-primary-tint/40`}>
                {inner}
              </button>
            )}
            {!isLast ? (
              <span
                className={`mx-1 hidden h-px flex-1 sm:block ${i < activeIndex ? "bg-primary/50" : "bg-black/10"}`}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
