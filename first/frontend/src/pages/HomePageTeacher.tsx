import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  ClipboardList,
  LayoutGrid,
  MessageSquareWarning,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useAppSession } from "@/hooks/useAppSession";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { RoleBadge } from "@/components/atoms/DemoEnvBadge";
import { Navbar } from "@/components/atoms/Navbar";
import { FabHelp } from "@/components/atoms/FabHelp";
import { SubjectCard } from "@/components/molecules/SubjectCard";
import { IpBrandFace } from "@/components/atoms/IpMascot";
import { AiHelpModal } from "@/components/organisms/AiHelpModal";
import { fetchInboxCounts } from "@/lib/workspaceApi";
import { fetchGradingDisputes } from "@/lib/gradingDisputeApi";
import { loadAuthToken } from "@/lib/apiClient";

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
    title: "班级看板",
    desc: "批次均分、共性错题、学生学情",
    icon: LayoutGrid,
    accent: "teal",
  },
  {
    to: "/feedback-dashboard",
    title: "反馈看板",
    desc: "汇总判题意见",
    icon: MessagesSquare,
    accent: "amber",
  },
  {
    to: "/settings#disputes",
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
    <Link
      to={to}
      className={`group flex items-center gap-3 rounded-xl border border-black/[0.06] border-l-[4px] p-4 shadow-card transition-all duration-hover hover:-translate-y-0.5 ${tone.shell} ${tone.shadow}`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-all duration-hover group-hover:scale-105 ${tone.icon}`}
      >
        <Icon className="h-5 w-5" {...CUTE_ICON} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-small font-extrabold text-ink">{title}</span>
          {badge != null && badge > 0 ? (
            <span className="rounded-full bg-red-500 px-1.5 py-px text-[0.625rem] font-black leading-none text-white shadow-sm">
              {badge > 99 ? "99+" : badge}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-caption text-ink-muted">{desc}</span>
      </span>
      <ChevronRight
        className={`h-4 w-4 shrink-0 text-ink-subtle transition-all group-hover:translate-x-0.5 ${tone.chevron}`}
        {...CUTE_ICON}
        aria-hidden
      />
    </Link>
  );
}

/** 教师端首页：开始批改 + 与顶栏一致的工作台入口 */
export function HomePageTeacher() {
  const prefs = useUserPreferences();
  const session = useAppSession();
  const [helpOpen, setHelpOpen] = useState(false);
  const [inboxPending, setInboxPending] = useState(0);
  const [disputePending, setDisputePending] = useState(0);

  useEffect(() => {
    if (!loadAuthToken()) return;
    void fetchInboxCounts()
      .then((c) => setInboxPending(c.unpublished_graded + c.corrections_pending))
      .catch(() => setInboxPending(0));
    void fetchGradingDisputes({ status: "pending" })
      .then((items) => setDisputePending(items.filter((x) => x.submitter_role === "student").length))
      .catch(() => setDisputePending(0));
  }, []);

  return (
    <div className="page-bg-hero-stunning relative flex min-h-screen flex-col">
      <div className="relative z-10 flex flex-1 flex-col">
        <Navbar />
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8 md:px-6 md:py-10">
          <div className="rounded-[28px] bg-white/95 px-5 py-8 shadow-[0_28px_90px_rgba(15,90,75,0.14)] ring-1 ring-white/90 backdrop-blur-sm sm:px-9 sm:py-9">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="select-none text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
                  智能作业批改
                  <span className="text-brand"> π</span>
                </h1>
                <p className="mt-1.5 text-small font-medium text-[#006D41]">上传照片，查看过程分与评语</p>
                {session ? (
                  <div className="mt-3">
                    <RoleBadge session={session} className="rounded-full px-2.5 py-1 text-[0.6875rem]" />
                  </div>
                ) : null}
              </div>
              <IpBrandFace size="md" decorative className="hidden shrink-0 sm:block" />
            </div>

            <section
              className="mt-8 rounded-2xl bg-gradient-to-br from-primary-tint via-[#ecfdf5]/70 to-teal-50/50 p-5 ring-1 ring-primary/20 sm:p-6"
              aria-labelledby="grade-start-heading"
            >
              <h2 id="grade-start-heading" className="select-none text-center text-lg font-extrabold text-[#006D41]">
                开始批改
              </h2>
              <p className="mx-auto mt-1 max-w-sm text-center text-caption text-ink-muted">
                拍正、少反光，系统自动识别手写并给出分项得分
              </p>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  title="英语作文"
                  description="内容 · 语言 · 结构"
                  to="/english"
                  theme="english"
                  badge="作文"
                />
              </div>
            </section>

            <section className="mt-8" aria-labelledby="teacher-workbench-heading">
              <div className="mb-4">
                <h2 id="teacher-workbench-heading" className="text-body font-extrabold text-ink">
                  教师工作台
                </h2>
                <p className="mt-1 text-caption text-ink-muted">与顶部导航一致，点击即可进入</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {TEACHER_TOOLS.map((item) => (
                  <ToolCard
                    key={item.to}
                    to={item.to}
                    title={item.title}
                    desc={item.desc}
                    icon={item.icon}
                    accent={item.accent}
                    badge={
                      item.to === "/workspace"
                        ? inboxPending
                        : "disputeBadge" in item && item.disputeBadge
                          ? disputePending
                          : undefined
                    }
                  />
                ))}
              </div>
            </section>
          </div>
        </main>

        {prefs.showHomeFabHelp ? <FabHelp onClick={() => setHelpOpen(true)} /> : null}
      </div>
      <AiHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
