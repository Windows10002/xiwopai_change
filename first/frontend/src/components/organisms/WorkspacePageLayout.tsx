import type { ReactNode } from "react";
import { AppLink } from "@/components/atoms/AppLink";
import {
  ArrowLeft,
  ClipboardList,
  GraduationCap,
  Inbox,
  LayoutGrid,
  Plus,
  RefreshCw,
  Settings,
} from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { IpBrandFace } from "@/components/atoms/IpMascot";
import { PrimaryButton } from "@/components/atoms/PrimaryButton";

export type WorkspaceTab = "homework" | "exams" | "review";

type WorkspacePageLayoutProps = {
  tab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  publishedCount: number;
  pendingReviewCount: number;
  homeworkCount: number;
  examCount: number;
  reviewBadge: number;
  onRefresh: () => void;
  onPublishHomework: () => void;
  onPublishExam: () => void;
  mobileTitle: string;
  children: ReactNode;
};

const TAB_META: Record<WorkspaceTab, { label: string; icon: typeof ClipboardList }> = {
  homework: { label: "日常作业", icon: ClipboardList },
  exams: { label: "课堂考试", icon: GraduationCap },
  review: { label: "待审阅", icon: Inbox },
};

function NavItem({
  active,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  icon: typeof ClipboardList;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-small font-semibold transition ${
        active
          ? "bg-primary-light text-ink-navActive shadow-sm ring-1 ring-primary/15"
          : "text-ink-muted hover:bg-white/80 hover:text-ink"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-85" {...CUTE_ICON} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge != null && badge > 0 ? (
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.6rem] font-bold tabular-nums text-amber-900 ring-1 ring-amber-200/80">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function SidebarLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof LayoutGrid;
  label: string;
}) {
  return (
    <AppLink
      to={to}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-caption font-semibold text-ink-muted transition hover:bg-white/80 hover:text-ink"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" {...CUTE_ICON} aria-hidden />
      {label}
    </AppLink>
  );
}

export function WorkspacePageLayout({
  tab,
  onTabChange,
  publishedCount,
  pendingReviewCount,
  homeworkCount,
  examCount,
  reviewBadge,
  onRefresh,
  onPublishHomework,
  onPublishExam,
  mobileTitle,
  children,
}: WorkspacePageLayoutProps) {
  const tabs: Array<{ id: WorkspaceTab; badge?: number; count?: number }> = [
    { id: "homework", count: homeworkCount },
    { id: "exams", count: examCount },
    { id: "review", badge: reviewBadge },
  ];

  const showHomeworkPublish = tab === "homework";
  const showExamPublish = tab === "exams";

  return (
    <div className="page-bg-hero-stunning flex min-h-screen w-full flex-col md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-black/[0.06] bg-white/92 backdrop-blur-md md:w-[15rem] md:border-r lg:w-[16rem]">
        <div className="hidden min-h-screen flex-col md:flex">
          <AppLink
            to="/"
            className="flex items-center gap-2.5 border-b border-black/[0.06] px-4 py-3.5 text-ink transition hover:bg-primary-tint/40"
          >
            <IpBrandFace size="sm" decorative />
            <span className="min-w-0 flex-1 truncate text-small font-bold">希沃智教π</span>
            <ArrowLeft className="h-4 w-4 shrink-0 text-ink-muted" {...CUTE_ICON} aria-hidden />
          </AppLink>

          <div className="mx-3 mt-4 rounded-xl border border-primary/15 bg-gradient-to-br from-primary-tint via-white to-[#ecfdf5]/70 px-3.5 py-3.5 shadow-card ring-1 ring-primary/10">
            <h1 className="text-body font-extrabold text-ink">作业管理</h1>
            <p className="mt-1.5 text-[0.65rem] leading-relaxed text-ink-muted">
              进行中 {publishedCount}
              <span className="mx-1 opacity-40">·</span>
              待审阅 {pendingReviewCount}
            </p>
          </div>

          <div className="mt-4 space-y-2 px-3">
            {showHomeworkPublish ? (
              <PrimaryButton
                className="min-h-10 w-full justify-center gap-2 text-small"
                onClick={onPublishHomework}
              >
                <Plus className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                发布作业
              </PrimaryButton>
            ) : null}
            {showExamPublish ? (
              <PrimaryButton
                className="min-h-10 w-full justify-center gap-2 text-small"
                onClick={onPublishExam}
              >
                <GraduationCap className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                发起考试
              </PrimaryButton>
            ) : null}
            {tab === "review" ? (
              <p className="rounded-xl bg-amber-50/90 px-3 py-2 text-[0.65rem] leading-relaxed text-amber-950 ring-1 ring-amber-200/80">
                审阅通过后，学生才能在「我的作业」里看到成绩
              </p>
            ) : null}
          </div>

          <nav className="mt-5 flex flex-1 flex-col gap-0.5 px-2" aria-label="作业管理视图">
            {tabs.map(({ id, badge, count }) => {
              const meta = TAB_META[id];
              const label = count != null ? `${meta.label} (${count})` : meta.label;
              return (
                <NavItem
                  key={id}
                  active={tab === id}
                  icon={meta.icon}
                  label={label}
                  badge={badge}
                  onClick={() => onTabChange(id)}
                />
              );
            })}
          </nav>

          <div className="mt-auto space-y-0.5 border-t border-black/[0.06] p-2">
            <SidebarLink to="/class-analytics" icon={LayoutGrid} label="班级学情（看板）" />
            <button
              type="button"
              onClick={onRefresh}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-caption font-semibold text-ink-muted transition hover:bg-white/80 hover:text-ink"
            >
              <RefreshCw className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
              刷新数据
            </button>
            <SidebarLink to="/settings" icon={Settings} label="设置" />
          </div>
        </div>

        <div className="border-b border-black/[0.06] bg-white/90 p-3 md:hidden">
          <div className="flex items-center gap-2">
            <AppLink
              to="/"
              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl bg-primary-tint/60 ring-1 ring-primary/15"
            >
              <ArrowLeft className="h-4 w-4 text-ink-muted" {...CUTE_ICON} aria-hidden />
            </AppLink>
            <div className="min-w-0 flex-1">
              <h1 className="text-small font-extrabold text-ink">{mobileTitle}</h1>
              <p className="text-[0.65rem] text-ink-muted">
                进行中 {publishedCount} · 待审阅 {pendingReviewCount}
              </p>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl text-ink-muted"
            >
              <RefreshCw className="h-4 w-4" {...CUTE_ICON} aria-hidden />
            </button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {tabs.map(({ id, badge, count }) => {
              const meta = TAB_META[id];
              const short = count != null ? `${meta.label}(${count})` : meta.label;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTabChange(id)}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-caption font-bold ${
                    tab === id
                      ? "bg-brand text-white shadow-sm"
                      : "bg-white/90 text-ink-muted ring-1 ring-black/[0.06]"
                  }`}
                >
                  {short}
                  {badge != null && badge > 0 ? ` ${badge}` : ""}
                </button>
              );
            })}
            <AppLink
              to="/class-analytics"
              className="shrink-0 rounded-xl bg-white/90 px-3 py-1.5 text-caption font-bold text-ink-muted ring-1 ring-black/[0.06]"
            >
              班级学情
            </AppLink>
          </div>
        </div>
      </aside>

      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col md:min-h-screen">
        <div className="flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-8">{children}</div>
      </section>
    </div>
  );
}
