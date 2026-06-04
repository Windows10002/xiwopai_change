import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  TeacherWorkbenchLayout,
  WorkbenchSideNavButton,
} from "@/components/organisms/TeacherWorkbenchLayout";
import { TeacherGradingDisputePanelBody } from "@/components/molecules/GradingDisputePanels";

type DisputeTab = "pending" | "all";

export function DisputesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: DisputeTab = searchParams.get("tab") === "all" ? "all" : "pending";
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const setTab = (next: DisputeTab) => {
    setSearchParams(next === "all" ? { tab: "all" } : {}, { replace: true });
  };

  const onRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const sideNav = (
    <>
      <WorkbenchSideNavButton
        active={tab === "pending"}
        label="待处理"
        badge={pendingCount}
        onClick={() => setTab("pending")}
      />
      <WorkbenchSideNavButton active={tab === "all"} label="全部记录" onClick={() => setTab("all")} />
    </>
  );

  const mobileSideNav = (
    <>
      <button
        type="button"
        onClick={() => setTab("pending")}
        className={`shrink-0 rounded-xl px-3 py-1.5 text-caption font-bold ${
          tab === "pending" ? "bg-brand text-white" : "bg-white/90 text-ink-muted ring-1 ring-black/[0.06]"
        }`}
      >
        待处理{pendingCount > 0 ? ` ${pendingCount}` : ""}
      </button>
      <button
        type="button"
        onClick={() => setTab("all")}
        className={`shrink-0 rounded-xl px-3 py-1.5 text-caption font-bold ${
          tab === "all" ? "bg-brand text-white" : "bg-white/90 text-ink-muted ring-1 ring-black/[0.06]"
        }`}
      >
        全部记录
      </button>
    </>
  );

  return (
    <TeacherWorkbenchLayout
      moduleTitle="学生申诉"
      moduleSubtitle={pendingCount > 0 ? `待处理 ${pendingCount} 条` : "暂无待处理"}
      mobileTitle="学生申诉"
      onRefresh={onRefresh}
      sideNav={
        <>
          <div className="hidden md:contents">{sideNav}</div>
          <div className="contents md:hidden">{mobileSideNav}</div>
        </>
      }
    >
      <div className="glass-panel rounded-2xl p-5 md:p-6">
        <p className="text-small text-ink-muted">
          学生认为判题有误时可在此申诉。确认后将写入反馈日志用于优化判题；若原判无误可驳回并说明理由。
          {tab === "pending" ? " 当前仅显示待处理条目。" : ""}
        </p>
        <div key={refreshKey} className="mt-4">
          <TeacherGradingDisputePanelBody
            onPendingCountChange={setPendingCount}
            filterTab={tab}
          />
        </div>
      </div>
    </TeacherWorkbenchLayout>
  );
}
