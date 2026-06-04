import type { ReactNode } from "react";
import { ArrowLeft, RefreshCw, Settings } from "lucide-react";

import { AppLink } from "@/components/atoms/AppLink";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { IpBrandFace } from "@/components/atoms/IpMascot";
import { GlassOpacityControl } from "@/components/molecules/GlassOpacityControl";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { saveUserPreferences } from "@/lib/userPreferences";

type TeacherWorkbenchLayoutProps = {
  moduleTitle: string;
  moduleSubtitle?: string;
  mobileTitle?: string;
  /** 侧栏标题区下方：发布按钮等 */
  headerSlot?: ReactNode;
  /** 本模块内二级导航（作业 Tab、学情视图等） */
  sideNav?: ReactNode;
  onRefresh?: () => void;
  children: ReactNode;
};

export function TeacherWorkbenchLayout({
  moduleTitle,
  moduleSubtitle,
  mobileTitle,
  headerSlot,
  sideNav,
  onRefresh,
  children,
}: TeacherWorkbenchLayoutProps) {
  const prefs = useUserPreferences();
  const mobile = mobileTitle ?? moduleTitle;

  return (
    <div className="page-bg-hero-stunning flex min-h-screen w-full flex-col md:flex-row">
      <aside className="glass-workbench-sidebar flex w-full shrink-0 flex-col md:w-[15rem] md:border-r lg:w-[16rem]">
        <div className="hidden min-h-screen flex-col md:flex">
          <AppLink
            to="/"
            className="glass-workbench-sidebar-link flex items-center gap-2.5 border-b border-black/[0.06] px-4 py-3.5 text-ink"
          >
            <IpBrandFace size="sm" decorative />
            <span className="min-w-0 flex-1 truncate text-small font-bold">希沃智教π</span>
            <ArrowLeft className="h-4 w-4 shrink-0 text-ink-muted" {...CUTE_ICON} aria-hidden />
          </AppLink>

          <div className="glass-workbench-module-card mx-3 mt-4 rounded-xl px-3.5 py-3.5">
            <h1 className="text-body font-extrabold text-ink">{moduleTitle}</h1>
            {moduleSubtitle ? (
              <p className="mt-1.5 text-[0.65rem] leading-relaxed text-ink-muted">{moduleSubtitle}</p>
            ) : null}
          </div>

          {headerSlot ? <div className="mt-4 space-y-2 px-3">{headerSlot}</div> : null}

          {sideNav ? (
            <nav className="mt-5 flex flex-1 flex-col gap-0.5 px-2" aria-label={`${moduleTitle}视图`}>
              {sideNav}
            </nav>
          ) : (
            <div className="flex-1" />
          )}

          <div className="mt-auto space-y-2 border-t border-black/[0.06] p-3">
            <GlassOpacityControl
              compact
              value={prefs.glassOpacity}
              onChange={(v) => saveUserPreferences({ glassOpacity: v })}
              className="w-full max-w-none"
            />
            {onRefresh ? (
              <button
                type="button"
                onClick={onRefresh}
                className="glass-workbench-nav-idle flex w-full items-center gap-2 rounded-xl px-3 py-2 text-caption font-semibold text-ink-muted transition hover:text-ink"
              >
                <RefreshCw className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
                刷新数据
              </button>
            ) : null}
            <AppLink
              to="/settings"
              className="glass-workbench-nav-idle flex w-full items-center gap-2 rounded-xl px-3 py-2 text-caption font-semibold text-ink-muted transition hover:text-ink"
            >
              <Settings className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
              设置
            </AppLink>
          </div>
        </div>

        <div className="glass-workbench-sidebar border-b border-black/[0.06] p-3 md:hidden">
          <div className="flex items-center gap-2">
            <AppLink
              to="/"
              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl bg-primary-tint/60 ring-1 ring-primary/15"
            >
              <ArrowLeft className="h-4 w-4 text-ink-muted" {...CUTE_ICON} aria-hidden />
            </AppLink>
            <div className="min-w-0 flex-1">
              <h1 className="text-small font-extrabold text-ink">{mobile}</h1>
              {moduleSubtitle ? <p className="text-[0.65rem] text-ink-muted">{moduleSubtitle}</p> : null}
            </div>
            {onRefresh ? (
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl text-ink-muted"
              >
                <RefreshCw className="h-4 w-4" {...CUTE_ICON} aria-hidden />
              </button>
            ) : null}
          </div>
          {sideNav ? <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{sideNav}</div> : null}
          <div className="mt-2 px-1">
            <GlassOpacityControl
              compact
              value={prefs.glassOpacity}
              onChange={(v) => saveUserPreferences({ glassOpacity: v })}
              className="w-full max-w-none"
            />
          </div>
        </div>
      </aside>

      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col md:min-h-screen">
        <div className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-5 md:px-8 md:py-8">{children}</div>
      </section>
    </div>
  );
}

/** 侧栏内 Tab 按钮 */
export function WorkbenchSideNavButton({
  active,
  label,
  badge,
  title,
  onClick,
}: {
  active: boolean;
  label: string;
  badge?: number;
  /** 悬停说明（如视图维度） */
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-small font-semibold transition ${
        active
          ? "bg-primary-light text-ink-navActive shadow-sm ring-1 ring-primary/15"
          : "text-ink-muted glass-workbench-nav-idle hover:text-ink"
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge != null && badge > 0 ? (
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.6rem] font-bold tabular-nums text-amber-900 ring-1 ring-amber-200/80">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
