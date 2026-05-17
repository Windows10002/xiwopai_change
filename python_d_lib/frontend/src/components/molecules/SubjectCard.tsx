import { ChevronRight } from "lucide-react";

import { Link } from "react-router-dom";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { IpBrandFace } from "@/components/atoms/IpMascot";

export type SubjectCardProps = {
  title: string;
  description: string;
  to: string;
  className?: string;
  theme?: "math" | "english";
  badge?: string;
};

/**
 * 首页学科入口卡片：校园风色带 + 角标 + Hover 上浮
 */
export function SubjectCard({ title, description, to, className, theme, badge }: SubjectCardProps) {
  const themeClass =
    theme === "math" ? "campus-subject-math" : theme === "english" ? "campus-subject-english" : "";

  return (
    <Link
      to={to}
      className={`group relative flex gap-4 rounded-card border border-black/[0.08] border-l-[5px] border-l-primary bg-surface-card p-5 pl-[1.15rem] shadow-card transition-all duration-hover ease-smooth hover:-translate-y-2 hover:scale-[1.02] hover:border-primary/35 hover:shadow-[0_14px_40px_rgba(82,196,26,0.2)] active:translate-y-0 active:scale-[0.99] active:shadow-card md:p-6 md:pl-7 ${themeClass} ${className ?? ""}`}
    >
      {badge ? (
        <span
          className={`campus-tag absolute -right-1 -top-2 z-10 -rotate-3 shadow-sm ${theme === "english" ? "campus-tag--pink" : "campus-tag--sky"}`}
        >
          {badge}
        </span>
      ) : null}
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/90 shadow-sm ring-1 ring-white/80 transition-transform duration-hover ease-smooth group-hover:scale-110 group-hover:rotate-3 md:h-14 md:w-14">
        <IpBrandFace size="sm" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-body font-bold text-ink">{title}</span>
          <ChevronRight
            {...CUTE_ICON}
            className="mt-0.5 h-5 w-5 shrink-0 text-ink-subtle transition-all duration-button ease-smooth group-hover:translate-x-1 group-hover:text-primary"
            aria-hidden
          />
        </span>
        <span className="mt-1 block text-small leading-snug text-ink-muted">{description}</span>
      </span>
    </Link>
  );
}
