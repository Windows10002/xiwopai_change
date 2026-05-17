import type { LucideIcon } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";

type IconBadgeProps = {
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE = {
  sm: { wrap: "h-7 w-7 rounded-lg", icon: "h-3.5 w-3.5" },
  md: { wrap: "h-8 w-8 rounded-lg", icon: "h-4 w-4" },
  lg: { wrap: "h-10 w-10 rounded-xl", icon: "h-5 w-5" },
} as const;

/** 白底墨绿图标，用于导出按钮、上传区等 */
export function IconBadge({ icon: Icon, size = "sm", className = "" }: IconBadgeProps) {
  const s = SIZE[size];
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center bg-white text-ink-navActive shadow-sm ring-1 ring-black/[0.08]",
        s.wrap,
        className,
      ].join(" ")}
    >
      <Icon className={s.icon} {...CUTE_ICON} aria-hidden />
    </span>
  );
}
