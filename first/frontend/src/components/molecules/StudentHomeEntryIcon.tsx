import { BookOpen, Camera, ClipboardCheck, GraduationCap, NotebookPen, Sparkles, Star } from "lucide-react";

import { IpBrandFace } from "@/components/atoms/IpMascot";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";

export type StudentHomeIconVariant = "todo" | "work" | "wrongbook" | "rewards" | "tutor";

const CONFIG: Record<
  StudentHomeIconVariant,
  { grad: string; glow: string; ring: string; mesh: string }
> = {
  todo: {
    grad: "from-emerald-400 via-teal-500 to-cyan-400",
    glow: "shadow-[0_12px_28px_rgba(16,185,129,0.42)]",
    ring: "ring-emerald-200/60",
    mesh: "bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.45),transparent_55%)]",
  },
  work: {
    grad: "from-violet-500 via-purple-600 to-indigo-600",
    glow: "shadow-[0_12px_28px_rgba(139,92,246,0.42)]",
    ring: "ring-violet-200/60",
    mesh: "bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.4),transparent_50%)]",
  },
  wrongbook: {
    grad: "from-teal-500 via-cyan-600 to-slate-600",
    glow: "shadow-[0_12px_28px_rgba(20,184,166,0.38)]",
    ring: "ring-teal-200/60",
    mesh: "bg-[radial-gradient(circle_at_40%_80%,rgba(255,255,255,0.35),transparent_55%)]",
  },
  rewards: {
    grad: "from-fuchsia-500 via-purple-600 to-violet-700",
    glow: "shadow-[0_12px_28px_rgba(192,38,211,0.38)]",
    ring: "ring-fuchsia-200/60",
    mesh: "bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.45),transparent_60%)]",
  },
  tutor: {
    grad: "from-cyan-400 via-sky-500 to-blue-600",
    glow: "shadow-[0_12px_28px_rgba(14,165,233,0.42)]",
    ring: "ring-cyan-200/70",
    mesh: "bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.4),transparent_55%)]",
  },
};

const BADGE_RING: Record<StudentHomeIconVariant, string> = {
  todo: "ring-emerald-100",
  work: "ring-violet-100",
  wrongbook: "ring-teal-100",
  rewards: "ring-fuchsia-100",
  tutor: "ring-cyan-100",
};

type StudentHomeEntryIconProps = {
  variant: StudentHomeIconVariant;
  size?: "md" | "lg";
};

export function StudentHomeEntryIcon({ variant, size = "lg" }: StudentHomeEntryIconProps) {
  const c = CONFIG[variant];
  const box = size === "lg" ? "h-14 w-14 sm:h-16 sm:w-16" : "h-12 w-12";
  const iconCls = size === "lg" ? "h-7 w-7 sm:h-8 sm:w-8" : "h-6 w-6";
  const badgeRing = BADGE_RING[variant];

  return (
    <span className={`relative flex shrink-0 items-center justify-center ${box}`} aria-hidden>
      <span className={`absolute inset-1 rounded-[1.1rem] blur-lg opacity-70 ${c.glow}`} />
      <span
        className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.15rem] bg-gradient-to-br ring-[2.5px] ring-white ${c.grad} ${c.glow} ${c.ring}`}
      >
        <span className={`pointer-events-none absolute inset-0 ${c.mesh}`} />
        <span className="pointer-events-none absolute -right-2 -top-2 h-8 w-8 rounded-full bg-white/20 blur-[1px]" />

        {variant === "rewards" || variant === "tutor" ? (
          <IpBrandFace size="sm" decorative className="relative z-10 !h-9 !w-9 sm:!h-10 sm:!w-10" />
        ) : variant === "todo" ? (
          <ClipboardCheck className={`relative z-10 text-white drop-shadow-md ${iconCls}`} {...CUTE_ICON} />
        ) : variant === "work" ? (
          <BookOpen className={`relative z-10 text-white drop-shadow-md ${iconCls}`} {...CUTE_ICON} />
        ) : (
          <NotebookPen className={`relative z-10 text-white drop-shadow-md ${iconCls}`} {...CUTE_ICON} />
        )}

        {variant === "todo" ? (
          <span className={`absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md ring-2 ${badgeRing}`}>
            <Camera className="h-3.5 w-3.5 text-emerald-600" {...CUTE_ICON} />
          </span>
        ) : null}
        {variant === "work" ? (
          <span className={`absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[0.65rem] font-black text-violet-700 shadow-md ring-2 ${badgeRing}`}>
            A+
          </span>
        ) : null}
        {variant === "wrongbook" ? (
          <span className={`absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md ring-2 ${badgeRing}`}>
            <span className="text-[0.55rem] font-black text-teal-700">✎</span>
          </span>
        ) : null}
        {variant === "rewards" ? (
          <span className={`absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md ring-2 ${badgeRing}`}>
            <Star className="h-3.5 w-3.5 fill-fuchsia-400 text-fuchsia-600" {...CUTE_ICON} />
          </span>
        ) : null}
        {variant === "tutor" ? (
          <span className={`absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md ring-2 ${badgeRing}`}>
            <GraduationCap className="h-3.5 w-3.5 text-cyan-700" {...CUTE_ICON} />
          </span>
        ) : null}
      </span>
      {variant === "rewards" || variant === "tutor" ? (
        <Sparkles
          className={`absolute -right-1 -top-1 h-4 w-4 drop-shadow-sm animate-pulse ${variant === "tutor" ? "text-cyan-500" : "text-fuchsia-500"}`}
          {...CUTE_ICON}
        />
      ) : null}
    </span>
  );
}
