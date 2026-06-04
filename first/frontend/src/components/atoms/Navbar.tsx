import { type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Gift, GraduationCap, LogOut, Settings, UserRound } from "lucide-react";
import { GradingNavDropdown } from "@/components/molecules/GradingNavDropdown";
import { NavMoreMenu } from "@/components/molecules/NavMoreMenu";
import { useStudentPendingCounts } from "@/hooks/useStudentPendingCounts";
import { useStudentRewards } from "@/hooks/useStudentRewards";
import { useTeacherPendingCounts } from "@/hooks/useTeacherPendingCounts";
import { IpBrandFace } from "@/components/atoms/IpMascot";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { loginPath, withAuthSlot } from "@/lib/authSlot";
import { clearSession, isAppLoggedIn, sessionDisplayLabel } from "@/lib/appSession";
import { useAppSession } from "@/hooks/useAppSession";
import { countWrongBookItems } from "@/lib/wrongQuestionBook";
import { hasPermission } from "@/lib/rolePermissions";

import {
  HistoryDropdown,
  type HistoryDropdownProps,
  type HistoryDropdownVariant,
} from "@/components/molecules/HistoryDropdown";
export type { HistoryDropdownProps, HistoryDropdownVariant };
export { HistoryDropdown };

type NavbarProps = {
  brandLabel?: string;
  onLogin?: () => void;
  /** 内层内容最大宽度（批改页可加宽） */
  contentMaxClassName?: string;
  /**
   * 顶栏「批改历史」快捷入口（已并入学情中心，默认关闭以免与学情重复）。
   * 批改页工具条仍单独使用 HistoryDropdown。
   */
  showHistoryDropdown?: boolean;
};

/**
 * 导航项：<a> 本身承担 padding 与最小触控高度，避免「只有文字可点」。
 */
function SoftNavLink({
  to,
  children,
  className,
  title,
  "aria-label": ariaLabel,
}: {
  to: string;
  children: ReactNode;
  className: (isActive: boolean) => string;
  title?: string;
  "aria-label"?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <span
      role="link"
      tabIndex={0}
      title={title}
      aria-label={ariaLabel}
      aria-current={isActive ? "page" : undefined}
      className={className(isActive)}
      onClick={() => navigate(withAuthSlot(to))}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(withAuthSlot(to));
        }
      }}
    >
      {children}
    </span>
  );
}

function NavItem({ to, children }: { to: string; children: ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <SoftNavLink
      to={to}
      className={(active) =>
        [
          "group relative inline-flex min-h-11 shrink-0 flex-col items-center justify-center rounded-full px-5 py-2.5 text-small font-semibold outline-none transition-colors duration-button ease-smooth",
          "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          active ? "bg-primary-light text-ink-navActive" : "text-ink/80 hover:bg-gray-50 hover:text-ink",
        ].join(" ")
      }
    >
      <>
        <span className="relative z-10 px-0.5 leading-none">{children}</span>
        <span
          className={[
            "pointer-events-none absolute inset-x-4 bottom-1.5 z-0 h-[3px] rounded-full bg-primary transition-all duration-button ease-smooth",
            isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-[0.65] group-hover:opacity-50 group-hover:scale-x-95",
          ].join(" ")}
          aria-hidden
        />
      </>
    </SoftNavLink>
  );
}

/**
 * 顶部导航：Logo + 演示角标 · 站内链接（激活浅绿底 + 主色下划线铺满可用宽度）· 薄荷绿登录
 */
export function Navbar({
  brandLabel = "希沃智教π",
  onLogin,
  contentMaxClassName = "max-w-6xl",
  showHistoryDropdown = false,
}: NavbarProps) {
  const navigate = useNavigate();
  const session = useAppSession();
  const loggedIn = isAppLoggedIn();
  const isTeacher = session?.role === "teacher" || session?.role === "admin";
  const isStudent = session?.role === "student";
  const wrongCount = isStudent ? countWrongBookItems() : 0;
  const { counts: teacherPending } = useTeacherPendingCounts(isTeacher && loggedIn);
  const { counts: studentPending } = useStudentPendingCounts(isStudent && loggedIn);
  const showWrongBook = hasPermission(session, "wrong_book");
  const showMyWork = hasPermission(session, "workspace.view_own");
  const showTodo = hasPermission(session, "workspace.submit");
  const showDisputeBadge = hasPermission(session, "disputes.review");
  const showClass = hasPermission(session, "analytics.class");
  const showWorkspace = hasPermission(session, "workspace.manage");
  const showGrading = hasPermission(session, "grading.access");
  const showRewards = hasPermission(session, "rewards.view");
  const showPiTutor = hasPermission(session, "pi.tutor");
  const { earnedCount: rewardBadgeCount } = useStudentRewards(isStudent && loggedIn);

  const disputePending = teacherPending.studentDisputes;
  const showFeedbackNav = hasPermission(session, "feedback.dashboard");

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.05] bg-white/[0.93] shadow-[0_1px_0_rgba(15,45,35,0.04)] backdrop-blur-md">
      <div
        className={`mx-auto grid min-h-[3.25rem] w-full max-w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-2 md:min-h-14 md:gap-4 md:px-6 ${contentMaxClassName}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            role="link"
            tabIndex={0}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-1 text-small font-bold tracking-tight text-ink transition-colors duration-button ease-smooth hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
            onClick={() => navigate(withAuthSlot("/"))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(withAuthSlot("/"));
              }
            }}
          >
            <IpBrandFace size="md" className="-translate-y-px" decorative />
            <span className="truncate">{brandLabel}</span>
          </span>
        </div>

        <nav
          aria-label="主导航"
          className="flex min-w-0 items-center justify-center gap-0.5 overflow-x-auto py-0.5 [scrollbar-width:none] md:gap-1 [&::-webkit-scrollbar]:hidden"
        >
          <NavItem to="/">首页</NavItem>
          {isTeacher && showClass ? <NavItem to="/class-analytics">学情</NavItem> : null}
          {isTeacher && showWorkspace ? <NavItem to="/workspace">作业</NavItem> : null}
          {showGrading ? <GradingNavDropdown /> : null}
          {showTodo ? (
            isStudent && studentPending.todoCount > 0 ? (
              <SoftNavLink
                to="/todo"
                className={(isActive) =>
                  [
                    "group relative inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-small font-semibold outline-none transition-colors duration-button ease-smooth",
                    "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                    isActive ? "bg-primary-light text-ink-navActive" : "text-ink/80 hover:bg-gray-50 hover:text-ink",
                  ].join(" ")
                }
              >
                <>
                  待办
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[0.625rem] font-black leading-none text-white">
                    {studentPending.todoCount > 99 ? "99+" : studentPending.todoCount}
                  </span>
                </>
              </SoftNavLink>
            ) : (
              <NavItem to="/todo">待办</NavItem>
            )
          ) : null}
          {showMyWork ? <NavItem to="/my-work">我的作业</NavItem> : null}
          {showPiTutor ? (
            <SoftNavLink
              to="/pi-tutor"
              className={(isActive) =>
                [
                  "group relative inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-small font-semibold outline-none transition-colors duration-button ease-smooth",
                  "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                  isActive ? "bg-primary-light text-ink-navActive" : "text-ink/80 hover:bg-gray-50 hover:text-ink",
                ].join(" ")
              }
            >
              <>
                <GraduationCap className="h-4 w-4 text-cyan-600" {...CUTE_ICON} aria-hidden />
                π 助学
              </>
            </SoftNavLink>
          ) : null}
          {showRewards ? (
            <SoftNavLink
              to="/rewards"
              className={(isActive) =>
                [
                  "group relative inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-small font-semibold outline-none transition-colors duration-button ease-smooth",
                  "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                  isActive ? "bg-primary-light text-ink-navActive" : "text-ink/80 hover:bg-gray-50 hover:text-ink",
                ].join(" ")
              }
            >
              <>
                <Gift className="h-4 w-4 text-amber-600" {...CUTE_ICON} aria-hidden />
                奖励
                {rewardBadgeCount > 0 ? (
                  <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[0.625rem] font-black leading-none text-white">
                    {rewardBadgeCount > 9 ? "9+" : rewardBadgeCount}
                  </span>
                ) : null}
              </>
            </SoftNavLink>
          ) : null}
          {showWrongBook ? (
            <SoftNavLink
              to="/wrong-book"
              className={(isActive) =>
                [
                  "group relative inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-small font-semibold outline-none transition-colors duration-button ease-smooth",
                  "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                  isActive ? "bg-primary-light text-ink-navActive" : "text-ink/80 hover:bg-gray-50 hover:text-ink",
                ].join(" ")
              }
            >
              <>
                错题本
                {wrongCount > 0 ? (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[0.625rem] font-black leading-none text-white">
                    {wrongCount > 99 ? "99+" : wrongCount}
                  </span>
                ) : null}
              </>
            </SoftNavLink>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-2">
          {isTeacher && loggedIn ? (
            <NavMoreMenu
              showFeedback={showFeedbackNav}
              showDisputes={showDisputeBadge}
              disputePending={disputePending}
            />
          ) : null}
          {showHistoryDropdown ? <HistoryDropdown variant="nav" subjectScope="all" requireLogin={!loggedIn} /> : null}
          {loggedIn ? (
            <SoftNavLink
              to="/settings"
              title={
                disputePending > 0 ? `设置（${disputePending} 条学生申诉待处理）` : "设置"
              }
              aria-label="设置"
              className={(isActive) =>
                [
                  "relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border shadow-sm transition duration-button ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white md:min-h-11 md:min-w-11",
                  isActive
                    ? "border-brand/35 bg-primary-light text-[#006D41] ring-2 ring-primary/20"
                    : "border-black/[0.06] bg-white text-ink-muted hover:border-primary/25 hover:text-[#006D41]",
                ].join(" ")
              }
            >
              <>
                <Settings className="h-5 w-5" {...CUTE_ICON} aria-hidden />
                {showDisputeBadge && disputePending > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[0.6rem] font-black text-white ring-2 ring-white">
                    {disputePending > 9 ? "9+" : disputePending}
                  </span>
                ) : null}
              </>
            </SoftNavLink>
          ) : (
            <span
              role="link"
              tabIndex={0}
              title="设置（需登录）"
              aria-label="设置（需登录）"
              className="relative inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-full border border-black/[0.06] bg-white text-ink-muted shadow-sm transition duration-button ease-smooth hover:border-primary/25 hover:text-[#006D41] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white md:min-h-11 md:min-w-11"
              onClick={() => navigate(loginPath("/settings"))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(loginPath("/settings"));
                }
              }}
            >
              <Settings className="h-5 w-5" {...CUTE_ICON} aria-hidden />
            </span>
          )}
          {loggedIn ? (
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <span
                className="inline-flex max-w-[7.5rem] items-center gap-1.5 rounded-full border border-primary/20 bg-primary-tint/90 px-2.5 py-1.5 text-[0.65rem] font-bold text-[#006D41] shadow-sm sm:max-w-none sm:px-3 sm:text-caption"
                title={session ? sessionDisplayLabel(session) : undefined}
              >
                <UserRound className="h-4 w-4 shrink-0" {...CUTE_ICON} aria-hidden />
                <span className="truncate">
                  {session?.role === "teacher"
                    ? "教师端"
                    : session?.role === "student"
                      ? "学生端"
                      : session?.role === "parent"
                        ? "家长端"
                        : session?.role === "admin"
                          ? "教务端"
                          : "已登录"}
                </span>
              </span>
              <button
                type="button"
                title="退出登录"
                aria-label="退出登录"
                onClick={() => clearSession()}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-black/[0.08] bg-white text-ink-muted shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white md:min-h-11 md:min-w-11"
              >
                <LogOut className="h-4 w-4" {...CUTE_ICON} aria-hidden />
              </button>
            </div>
          ) : onLogin ? (
            <button type="button" onClick={onLogin} className="btn-accent-mint-solid min-h-10 shrink-0 px-5 text-small md:min-h-11 md:px-6">
              登录
            </button>
          ) : (
            <span
              role="link"
              tabIndex={0}
              className="btn-accent-mint-solid min-h-10 shrink-0 cursor-pointer px-5 text-small md:min-h-11 md:px-6"
              onClick={() => navigate(withAuthSlot("/login"))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(withAuthSlot("/login"));
                }
              }}
            >
              登录
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
