import { type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";

type GradingQuickCardProps = {
  to: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  badge: string;
  accent: "math" | "english";
};

const ACCENT: Record<"math" | "english", { shell: string; icon: string; badge: string }> = {
  math: {
    shell: "border-sky-200/90 bg-gradient-to-br from-sky-50 via-white to-sky-50/40 hover:border-sky-300 hover:shadow-[0_10px_32px_rgba(56,189,248,0.16)]",
    icon: "bg-sky-100 text-sky-700 ring-sky-200/80 group-hover:bg-sky-200",
    badge: "bg-sky-100 text-sky-800 ring-sky-200/80",
  },
  english: {
    shell: "border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-rose-50/40 hover:border-rose-300 hover:shadow-[0_10px_32px_rgba(251,113,133,0.14)]",
    icon: "bg-rose-100 text-rose-700 ring-rose-200/80 group-hover:bg-rose-200",
    badge: "bg-rose-100 text-rose-800 ring-rose-200/80",
  },
};

/** 与顶栏「数学/英语批改」一致的快捷入口 */
export function GradingQuickCard({ to, title, desc, icon: Icon, badge, accent }: GradingQuickCardProps) {
  const tone = ACCENT[accent];
  return (
    <Link
      to={to}
      className={`group relative flex items-center gap-3 rounded-xl border border-l-[4px] border-l-transparent p-4 shadow-card transition-all duration-hover hover:-translate-y-0.5 ${tone.shell}`}
    >
      <span className={`absolute left-3 top-3 rounded-md px-1.5 py-0.5 text-[0.625rem] font-bold ring-1 ${tone.badge}`}>
        {badge}
      </span>
      <span
        className={`mt-5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform group-hover:scale-105 ${tone.icon}`}
      >
        <Icon className="h-5 w-5" {...CUTE_ICON} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 pt-4">
        <span className="text-small font-extrabold text-ink">{title}</span>
        <span className="mt-0.5 block text-caption text-ink-muted">{desc}</span>
      </span>
    </Link>
  );
}
