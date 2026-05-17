import type { LucideIcon } from "lucide-react";
import { BookOpen, Calculator } from "lucide-react";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";

type GradingContextBarProps = {
  subject: "math" | "english";
  subjectLabel: string;
  /** 右侧说明，默认「智能批改」 */
  tagline?: string;
  contentMaxClassName?: string;
};

const SUBJECT_ICON: Record<GradingContextBarProps["subject"], LucideIcon> = {
  english: BookOpen,
  math: Calculator,
};

/**
 * 批改页次级标题条：浅绿底 + 白底圆角框（示意当前学科），加大触控与 hover 反馈。
 */
export function GradingContextBar({
  subject,
  subjectLabel,
  tagline = "智能批改",
  contentMaxClassName = "max-w-6xl",
}: GradingContextBarProps) {
  const Icon = SUBJECT_ICON[subject];

  return (
    <div className="border-b border-primary/15 bg-primary-light/55 backdrop-blur-md">
      <div className={`mx-auto px-4 py-3 md:px-6 ${contentMaxClassName}`}>
        <div
          className="inline-flex min-h-[2.75rem] max-w-full cursor-default select-none items-center gap-3 rounded-xl border border-primary/35 bg-white px-4 py-2.5 shadow-sm ring-1 ring-black/[0.04] transition-[box-shadow,border-color,transform] duration-button ease-smooth hover:border-primary/50 hover:shadow-[0_4px_14px_rgba(82,196,26,0.14)] active:scale-[0.995]"
          role="status"
          aria-live="polite"
          aria-label={`${subjectLabel} · ${tagline}`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm ring-1 ring-primary/15">
            <Icon className="h-5 w-5" {...CUTE_ICON} aria-hidden />
          </span>
          <span className="text-body font-bold leading-snug text-ink">
            {subjectLabel}
            <span className="font-semibold text-ink-muted"> · {tagline}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
