import type { AppSession } from "@/lib/appSession";
import { sessionDisplayLabel } from "@/lib/appSession";

type RoleBadgeProps = {
  session?: AppSession | null;
  className?: string;
};

/** 已登录端别角标（不含「演示」字样） */
export function RoleBadge({ session, className }: RoleBadgeProps) {
  const label = session ? sessionDisplayLabel(session) : null;
  if (!label) return null;

  return (
    <span
      className={`inline-flex items-center rounded-md bg-primary px-2 py-0.5 text-[0.6875rem] font-semibold leading-none text-white ring-1 ring-primary/35 ${className ?? ""}`}
    >
      {label}
    </span>
  );
}

/** @deprecated 使用 RoleBadge */
export const DemoEnvBadge = RoleBadge;
