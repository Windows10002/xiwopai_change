import { AppLink } from "@/components/atoms/AppLink";
import {
  ChevronRight,
  ClipboardList,
  History,
  LayoutGrid,
  MessageSquareWarning,
  MessagesSquare,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useAppSession } from "@/hooks/useAppSession";
import { useTeacherPendingCounts } from "@/hooks/useTeacherPendingCounts";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { PiAssistantFab } from "@/components/atoms/PiAssistantFab";
import { Navbar } from "@/components/atoms/Navbar";
import { SubjectCard } from "@/components/molecules/SubjectCard";
import { IpBrandFace } from "@/components/atoms/IpMascot";
import { sessionDisplayLabel } from "@/lib/appSession";
import { analyticsPath, workspacePath } from "@/lib/teacherRoutes";

const TEACHER_TOOLS = [
  {
    to: "/workspace",
    title: "作业管理",
    desc: "发布任务、收发作业、订正",
    icon: ClipboardList,
    accent: "green",
  },
  {
    to: "/class-analytics",
    title: "学情中心",
    desc: "班级/学生学情、薄弱趋势与简报",
    icon: LayoutGrid,
    accent: "teal",
  },
  {
    to: "/class-analytics?tab=history",
    title: "批改历史",
    desc: "本机批改记录，可编辑与删除",
    icon: History,
    accent: "teal",
  },
  {
    to: "/feedback-dashboard",
    title: "判题反馈",
    desc: "汇总教师判题异议",
    icon: MessagesSquare,
    accent: "amber",
  },
  {
    to: "/product-feedback",
    title: "产品反馈",
    desc: "π 助手用户建议（可导出）",
    icon: Sparkles,
    accent: "amber",
  },
  {
    to: "/disputes",
    title: "学生申诉",
    desc: "处理学生判题异议",
    icon: MessageSquareWarning,
    accent: "violet",
    disputeBadge: true,
  },
] as const;

type ToolAccent = (typeof TEACHER_TOOLS)[number]["accent"];

const TOOL_ACCENT: Record<
  ToolAccent,
  { shell: string; icon: string; chevron: string; shadow: string }
> = {
  green: {
    shell: "border-l-primary bg-gradient-to-br from-primary-tint via-white to-[#ecfdf5]/60 hover:border-primary/40 hover:from-primary-tint",
    icon: "bg-[#d9f7be] text-[#389e0d] ring-primary/25 group-hover:bg-[#b7eb8f]",
    chevron: "group-hover:text-primary",
    shadow: "hover:shadow-[0_10px_32px_rgba(82,196,26,0.18)]",
  },
  teal: {
    shell: "border-l-teal-500 bg-gradient-to-br from-teal-50 via-white to-emerald-50/50 hover:border-teal-400/60",
    icon: "bg-teal-100 text-teal-700 ring-teal-200/80 group-hover:bg-teal-200",
    chevron: "group-hover:text-teal-600",
    shadow: "hover:shadow-[0_10px_32px_rgba(20,184,166,0.2)]",
  },
  amber: {
    shell: "border-l-amber-400 bg-gradient-to-br from-amber-50 via-white to-[#FEF9C3]/40 hover:border-amber-400/60",
    icon: "bg-amber-100 text-amber-700 ring-amber-200/80 group-hover:bg-amber-200",
    chevron: "group-hover:text-amber-600",
    shadow: "hover:shadow-[0_10px_32px_rgba(251,191,36,0.2)]",
  },
  violet: {
    shell: "border-l-violet-500 bg-gradient-to-br from-violet-50 via-white to-purple-50/50 hover:border-violet-400/60",
    icon: "bg-violet-100 text-violet-700 ring-violet-200/80 group-hover:bg-violet-200",
    chevron: "group-hover:text-violet-600",
    shadow: "hover:shadow-[0_10px_32px_rgba(139,92,246,0.18)]",
  },
};

function ToolCard({
  to,
  title,
  desc,
  icon: Icon,
  accent,
  badge,
}: {
  to: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  accent: ToolAccent;
  badge?: number;
}) {
  const tone = TOOL_ACCENT[accent];
  return (
    <AppLink
      to={to}
      className={`group flex min-h-[5.25rem] items-center gap-4 rounded-2xl border border-black/[0.06] border-l-[5px] p-5 shadow-card transition-all duration-hover hover:-translate-y-0.5 md:min-h-[5.75rem] md:p-6 ${tone.shell} ${tone.shadow}`}
    >
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 transition-all duration-hover group-hover:scale-105 ${tone.icon}`}
      >
        <Icon className="h-6 w-6" {...CUTE_ICON} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-body font-extrabold text-ink md:text-lg">{title}</span>
          {badge != null && badge > 0 ? (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[0.65rem] font-black leading-none text-white shadow-sm">
              {badge > 99 ? "99+" : badge}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-small leading-snug text-ink-muted md:text-base">{desc}</span>
      </span>
      <ChevronRight
        className={`h-5 w-5 shrink-0 text-ink-subtle transition-all group-hover:translate-x-0.5 ${tone.chevron}`}
        {...CUTE_ICON}
        aria-hidden
      />
    </AppLink>
  );
}

/** 教师端首页：开始批改 + 与顶栏一致的工作台入口 */
export function HomePageTeacher() {
  const prefs = useUserPreferences();
  const session = useAppSession();
  const { counts } = useTeacherPendingCounts(true);

  const workspaceTo =
    counts.inboxTotal > 0 ? workspacePath("review") : workspacePath("homework");

  return (
    <div className="page-bg-hero-stunning relative flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 md:px-6 md:py-10 lg:py-12">
        <div className="rounded-[28px] bg-white/95 px-5 py-9 shadow-[0_28px_90px_rgba(15,90,75,0.14)] ring-1 ring-white/90 backdrop-blur-sm sm:px-8 sm:py-10 md:px-11 md:py-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            <div className="mx-auto max-w-xl flex-1 text-center lg:mx-0 lg:text-left">
              <h1 className="select-none text-3xl font-extrabold tracking-tight text-ink md:text-[2rem] lg:text-4xl">
                智能作业批改
                <span className="text-brand"> π</span>
              </h1>
              <p className="mt-3 text-lg font-bold text-[#006D41] md:text-xl">上传照片，查看过程分与评语</p>
              {session ? (
                <p className="mt-3 text-small font-semibold text-ink-muted md:text-base">
                  {sessionDisplayLabel(session)}
                </p>
              ) : null}
            </div>
            <div className="flex justify-center lg:justify-end lg:pr-2">
              <IpBrandFace size="hero" decorative className="shrink-0" />
            </div>
          </div>

          {counts.inboxTotal > 0 || counts.studentDisputes > 0 ? (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-caption lg:justify-start">
              <span className="font-bold text-amber-950">待处理</span>
              {counts.pendingReview + counts.unpublishedGraded > 0 ? (
                <AppLink
                  to={workspacePath("review")}
                  className="rounded-full bg-white px-2.5 py-1 font-bold text-[#006D41] ring-1 ring-primary/20 hover:bg-primary-tint"
                >
                  {counts.pendingReview + counts.unpublishedGraded} 份待审阅
                </AppLink>
              ) : null}
              {counts.correctionsPending > 0 ? (
                <AppLink
                  to={workspacePath("review")}
                  className="rounded-full bg-white px-2.5 py-1 font-bold text-sky-800 ring-1 ring-sky-200 hover:bg-sky-50"
                >
                  {counts.correctionsPending} 份待验收订正
                </AppLink>
              ) : null}
              {counts.studentDisputes > 0 ? (
                <AppLink
                  to="/disputes"
                  className="rounded-full bg-white px-2.5 py-1 font-bold text-violet-800 ring-1 ring-violet-200 hover:bg-violet-50"
                >
                  {counts.studentDisputes} 条学生申诉
                </AppLink>
              ) : null}
            </div>
          ) : null}

          <section
            className="mt-8 rounded-2xl bg-gradient-to-br from-primary-tint via-[#ecfdf5]/70 to-teal-50/50 p-5 ring-1 ring-primary/20 sm:p-6"
            aria-labelledby="grade-start-heading"
          >
            <h2
              id="grade-start-heading"
              className="select-none text-center text-xl font-extrabold text-[#006D41] md:text-2xl"
            >
              开始批改
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-center text-small text-ink-muted md:text-base">
              拍正、少反光，系统自动识别手写并给出分项得分
            </p>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SubjectCard
                emphasis
                title="数学作业"
                description="逐题判分 · 过程分 · 薄弱点"
                to="/math"
                theme="math"
                badge="理科"
              />
              <SubjectCard
                emphasis
                title="英语作业"
                description="内容 · 语言 · 结构"
                to="/english"
                theme="english"
                badge="外语"
              />
              <SubjectCard
                emphasis
                title="语文作业"
                description="字词 · 阅读 · 书写规范"
                to="/chinese"
                theme="chinese"
                badge="文科"
              />
            </div>
          </section>

          <section className="mt-8" aria-labelledby="teacher-workbench-heading">
            <div className="mb-4">
              <h2 id="teacher-workbench-heading" className="text-xl font-extrabold text-ink md:text-2xl">
                教师工作台
              </h2>
              <p className="mt-1 text-small text-ink-muted">
                常用功能入口 · 学情来自本机批改，作业数据在作业管理
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {TEACHER_TOOLS.map((item) => (
                <ToolCard
                  key={item.to}
                  to={item.to === "/workspace" ? workspaceTo : item.to}
                  title={item.title}
                  desc={item.desc}
                  icon={item.icon}
                  accent={item.accent}
                  badge={
                    item.to === "/workspace" || item.to.startsWith("/workspace")
                      ? counts.inboxTotal
                      : "disputeBadge" in item && item.disputeBadge
                        ? counts.studentDisputes
                        : undefined
                  }
                />
              ))}
            </div>
            <p className="mt-4 text-center text-[0.65rem] text-ink-subtle sm:text-left">
              删除作业不会自动清除学情中的本机批改历史；
              <AppLink to={analyticsPath({ tab: "history" })} className="mx-1 font-bold text-brand hover:underline">
                批改历史
              </AppLink>
              需单独管理。
            </p>
          </section>
        </div>
      </main>

      <PiAssistantFab show={prefs.showHomeFabHelp} />
    </div>
  );
}
