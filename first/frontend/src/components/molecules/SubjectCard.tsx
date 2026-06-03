import { BookOpen, Calculator, ChevronRight, Languages } from "lucide-react";
import { Link } from "react-router-dom";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";

export type SubjectCardProps = {
  title: string;
  description: string;
  to: string;
  className?: string;
  theme?: "math" | "english" | "chinese";
  badge?: string;
  /** 教师首页主入口：更大、更醒目 */
  emphasis?: boolean;
  /** 预留「添加学科」占位卡 */
  placeholder?: boolean;
};

const THEME_SHELL: Record<"math" | "english" | "chinese", string> = {
  math: "border-sky-300/80 bg-gradient-to-br from-sky-100/90 via-sky-50/70 to-white hover:border-sky-400 hover:shadow-[0_16px_48px_rgba(56,189,248,0.22)]",
  chinese:
    "border-amber-300/80 bg-gradient-to-br from-amber-100/90 via-amber-50/70 to-white hover:border-amber-400 hover:shadow-[0_16px_48px_rgba(245,158,11,0.2)]",
  english: "border-rose-300/70 bg-gradient-to-br from-rose-100/80 via-rose-50/60 to-white hover:border-rose-400 hover:shadow-[0_16px_48px_rgba(251,113,133,0.18)]",
};

const THEME_ICON: Record<"math" | "english" | "chinese", typeof Calculator> = {
  math: Calculator,
  chinese: BookOpen,
  english: Languages,
};

const THEME_ICON_BG: Record<"math" | "english" | "chinese", string> = {
  math: "bg-sky-200/90 text-sky-700 ring-sky-300/60",
  chinese: "bg-amber-200/90 text-amber-800 ring-amber-300/60",
  english: "bg-rose-200/80 text-rose-700 ring-rose-300/50",
};

const BADGE_CLASS: Record<"math" | "english" | "chinese", string> = {
  math: "bg-sky-200 text-sky-900 ring-sky-300/80",
  chinese: "bg-amber-200 text-amber-950 ring-amber-300/80",
  english: "bg-rose-200 text-rose-900 ring-rose-300/80",
};

/**
 * 首页学科入口：细描边 + 浅底 + 左上角标签
 */
export function SubjectCard({ title, description, to, className, theme, badge, emphasis, placeholder }: SubjectCardProps) {
  if (placeholder) {
    return (
      <div
        className={`relative flex gap-4 rounded-card border border-dashed border-black/12 bg-gray-50/80 p-4 opacity-90 ${className ?? ""}`}
        title="演示环境即将开放自定义学科"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-ink-subtle ring-1 ring-black/8 md:h-14 md:w-14">
          <span className="text-2xl font-light leading-none" aria-hidden>
            +
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-body font-bold text-ink-muted">{title}</span>
          <span className="mt-1 block text-caption leading-snug text-ink-subtle">{description}</span>
        </span>
      </div>
    );
  }

  const themeKey = theme ?? "math";
  const Icon = THEME_ICON[themeKey];

  if (emphasis) {
    return (
      <Link
        to={to}
        className={`group relative flex min-h-[9.5rem] flex-col items-center justify-center gap-3 rounded-2xl border px-6 py-8 text-center shadow-card transition-all duration-hover ease-smooth hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(82,196,26,0.15)] active:translate-y-0 ${THEME_SHELL[themeKey]} ${className ?? ""}`}
      >
        {badge ? (
          <span
            className={`absolute left-4 top-4 rounded-md px-1.5 py-0.5 text-[0.625rem] font-bold ring-1 ${BADGE_CLASS[themeKey]}`}
          >
            {badge}
          </span>
        ) : null}
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-2xl ring-1 transition-transform duration-hover group-hover:scale-110 ${THEME_ICON_BG[themeKey]}`}
        >
          <Icon className="h-8 w-8" {...CUTE_ICON} aria-hidden />
        </span>
        <span>
          <span className="block text-lg font-extrabold text-ink">{title}</span>
          <span className="mt-1 block text-caption text-ink-muted">{description}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-caption font-semibold text-brand opacity-80 transition-opacity group-hover:opacity-100">
          开始批改
          <ChevronRight className="h-4 w-4" {...CUTE_ICON} aria-hidden />
        </span>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className={`group relative flex gap-4 rounded-card border p-4 shadow-card transition-all duration-hover ease-smooth hover:-translate-y-1 active:translate-y-0 md:p-4 ${THEME_SHELL[themeKey]} ${className ?? ""}`}
    >
      {badge ? (
        <span
          className={`absolute left-3 top-3 z-10 rounded-md px-1.5 py-0.5 text-[0.625rem] font-bold ring-1 ${BADGE_CLASS[themeKey]}`}
        >
          {badge}
        </span>
      ) : null}
      <span
        className={`mt-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 transition-transform duration-hover group-hover:scale-105 md:mt-6 md:h-14 md:w-14 ${THEME_ICON_BG[themeKey]}`}
      >
        <Icon className="h-6 w-6 md:h-7 md:w-7" {...CUTE_ICON} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 pt-5 md:pt-6">
        <span className="flex items-start justify-between gap-2">
          <span className="text-body font-bold text-ink">{title}</span>
          <ChevronRight
            {...CUTE_ICON}
            className="mt-0.5 h-5 w-5 shrink-0 text-ink-subtle transition-all duration-button ease-smooth group-hover:translate-x-1 group-hover:text-primary"
            aria-hidden
          />
        </span>
        <span className="mt-1 block text-caption leading-snug text-ink-muted">{description}</span>
      </span>
    </Link>
  );
}
