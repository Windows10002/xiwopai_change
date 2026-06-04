import { ArrowUpRight } from "lucide-react";

import { AppLink } from "@/components/atoms/AppLink";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { StudentHomeEntryIcon, type StudentHomeIconVariant } from "@/components/molecules/StudentHomeEntryIcon";

/** 与下方学科卡片（数学天蓝 / 英语玫红 / 语文琥珀）错开 */
type StudentHomeEntryTone = "mint" | "violet" | "teal" | "grape" | "cyan";

const TONE: Record<StudentHomeEntryTone, { card: string; badge: string; cta: string; accent: string }> = {
  mint: {
    card: "from-white via-emerald-50/90 to-teal-50/70 ring-emerald-200/50 hover:ring-emerald-300/70 hover:shadow-[0_14px_40px_rgba(16,185,129,0.18)]",
    badge: "bg-emerald-500 shadow-emerald-500/30",
    cta: "text-emerald-700 group-hover:text-emerald-800",
    accent: "bg-emerald-400/15",
  },
  violet: {
    card: "from-white via-violet-50/90 to-purple-50/70 ring-violet-200/50 hover:ring-violet-300/70 hover:shadow-[0_14px_40px_rgba(139,92,246,0.16)]",
    badge: "bg-violet-600 shadow-violet-500/30",
    cta: "text-violet-700 group-hover:text-violet-900",
    accent: "bg-violet-400/15",
  },
  teal: {
    card: "from-white via-teal-50/90 to-cyan-50/65 ring-teal-200/50 hover:ring-teal-300/70 hover:shadow-[0_14px_40px_rgba(20,184,166,0.14)]",
    badge: "bg-teal-600 shadow-teal-500/30",
    cta: "text-teal-800 group-hover:text-teal-950",
    accent: "bg-teal-400/15",
  },
  grape: {
    card: "from-white via-fuchsia-50/90 to-purple-50/75 ring-fuchsia-200/55 hover:ring-fuchsia-300/75 hover:shadow-[0_14px_40px_rgba(192,38,211,0.16)]",
    badge: "bg-gradient-to-r from-fuchsia-600 to-purple-600 shadow-fuchsia-500/35",
    cta: "text-fuchsia-800 group-hover:text-fuchsia-950",
    accent: "bg-fuchsia-400/18",
  },
  cyan: {
    card: "from-white via-cyan-50/95 to-sky-50/75 ring-cyan-200/60 hover:ring-cyan-300/80 hover:shadow-[0_14px_40px_rgba(14,165,233,0.16)]",
    badge: "bg-cyan-600 shadow-cyan-500/30",
    cta: "text-cyan-800 group-hover:text-cyan-950",
    accent: "bg-cyan-400/18",
  },
};

type StudentHomeEntryProps = {
  to: string;
  title: string;
  description: string;
  iconVariant: StudentHomeIconVariant;
  tone: StudentHomeEntryTone;
  badge?: number;
  tagLabel?: string;
  className?: string;
};

export function StudentHomeEntry({
  to,
  title,
  description,
  iconVariant,
  tone,
  badge,
  tagLabel,
  className = "",
}: StudentHomeEntryProps) {
  const t = TONE[tone];
  const isRewards = iconVariant === "rewards";

  return (
    <AppLink
      to={to}
      className={[
        "group relative flex h-full min-h-[10.25rem] flex-col overflow-hidden rounded-2xl bg-gradient-to-br p-3.5 ring-1 sm:min-h-[10.5rem] lg:min-h-[11rem] lg:p-4",
        "transition-all duration-300 ease-smooth hover:-translate-y-1 active:scale-[0.99]",
        t.card,
        className,
      ].join(" ")}
    >
      <span className={`pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full ${t.accent} blur-2xl`} />
      {isRewards ? (
        <span
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.3]"
          style={{
            background: "linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)",
          }}
          aria-hidden
        />
      ) : null}

      <div className="relative flex shrink-0 items-start justify-between gap-2">
        <StudentHomeEntryIcon variant={iconVariant} size="lg" />
        {badge != null && badge > 0 ? (
          <span
            className={`flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-[0.65rem] font-black text-white shadow-md ${t.badge}`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : tagLabel ? (
          <span className="campus-tag campus-tag--sun shrink-0 text-[0.6rem]">{tagLabel}</span>
        ) : null}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col pt-3">
        <h3 className="shrink-0 text-small font-extrabold leading-tight text-ink sm:text-body">{title}</h3>
        <p className="mt-1 min-h-[2.35rem] shrink-0 line-clamp-2 text-[0.65rem] leading-snug text-ink-muted sm:min-h-[2.5rem] sm:text-caption">
          {description}
        </p>

        <div className="mt-auto flex w-full shrink-0 flex-col items-start pt-2">
          <span className={`flex w-full shrink-0 items-center gap-0.5 text-[0.65rem] font-bold sm:text-caption ${t.cta}`}>
            进入
            <ArrowUpRight
              className="h-3.5 w-3.5 shrink-0 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              {...CUTE_ICON}
              aria-hidden
            />
          </span>
        </div>
      </div>
    </AppLink>
  );
}
