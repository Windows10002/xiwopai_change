import { AppLink } from "@/components/atoms/AppLink";
import { ClipboardList } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";

/** 学情页底部：正式任务与学情中心职责分界，避免与作业管理重复 */
export function ClassAnalyticsWorkspaceNote() {
  return (
    <p className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-black/[0.06] pt-4 text-[0.65rem] text-ink-muted">
      <span>发布作业、收交试卷、审阅成绩请使用</span>
      <AppLink
        to="/workspace"
        className="inline-flex items-center gap-1 font-bold text-brand hover:underline"
      >
        <ClipboardList className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
        作业管理
      </AppLink>
    </p>
  );
}
