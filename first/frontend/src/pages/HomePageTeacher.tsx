import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  LayoutGrid,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { Navbar } from "@/components/atoms/Navbar";
import { FabHelp } from "@/components/atoms/FabHelp";
import { SubjectCard } from "@/components/molecules/SubjectCard";
import { IpBrandFace } from "@/components/atoms/IpMascot";
import { AiHelpModal } from "@/components/organisms/AiHelpModal";
import { fetchInboxCounts } from "@/lib/workspaceApi";
import { loadAuthToken } from "@/lib/apiClient";

const ADVANTAGES = [
  { title: "看清字迹", desc: "拍正、少反光，便于识别手写。" },
  { title: "分项给分", desc: "过程分与结果分分开呈现。" },
  { title: "评语要点", desc: "总评、错因与薄弱点一页汇总。" },
] as const;

const TEACHER_NAV = [
  {
    to: "/workspace",
    title: "作业管理",
    desc: "发布任务、收发作业、变式题与订正",
    icon: ClipboardList,
    wide: true,
  },
  { to: "/student-analytics", title: "学生学情", desc: "薄弱点与得分趋势", icon: BarChart3, wide: false },
  { to: "/class-analytics", title: "班级看板", desc: "批次均分与共性错题", icon: LayoutGrid, wide: false },
  { to: "/feedback-dashboard", title: "判题反馈", desc: "汇总判题意见", icon: MessagesSquare, wide: true },
] as const;

const CARD_SHELL =
  "group relative flex gap-4 rounded-card border border-black/[0.08] border-l-[5px] border-l-primary bg-surface-card p-5 pl-[1.15rem] shadow-card transition-all duration-hover ease-smooth hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_14px_40px_rgba(82,196,26,0.16)] md:p-6 md:pl-7";

function SectionHeading({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-body font-extrabold text-ink md:text-lg">{title}</h2>
      {desc ? <p className="mt-1 text-caption leading-relaxed text-ink-muted">{desc}</p> : null}
    </div>
  );
}

function TeacherNavCard({
  to,
  title,
  desc,
  icon: Icon,
  badge,
}: {
  to: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  badge?: number;
}) {
  return (
    <Link to={to} className={CARD_SHELL}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-brand ring-1 ring-primary/15 transition-transform duration-hover group-hover:scale-105 md:h-14 md:w-14">
        <Icon className="h-6 w-6 md:h-7 md:w-7" {...CUTE_ICON} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-body font-bold text-ink">{title}</span>
            {badge != null && badge > 0 ? (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[0.625rem] font-black leading-none text-white">
                {badge > 99 ? "99+" : badge}
              </span>
            ) : null}
          </span>
          <ChevronRight
            className="mt-0.5 h-5 w-5 shrink-0 text-ink-subtle transition-all group-hover:translate-x-0.5 group-hover:text-primary"
            {...CUTE_ICON}
            aria-hidden
          />
        </span>
        <span className="mt-1 block text-small leading-snug text-ink-muted">{desc}</span>
      </span>
    </Link>
  );
}

/** 教师端首页 */
export function HomePageTeacher() {
  const prefs = useUserPreferences();
  const [helpOpen, setHelpOpen] = useState(false);
  const [inboxPending, setInboxPending] = useState(0);

  useEffect(() => {
    if (!loadAuthToken()) return;
    void fetchInboxCounts()
      .then((c) => setInboxPending(c.unpublished_graded + c.corrections_pending))
      .catch(() => setInboxPending(0));
  }, []);

  return (
    <div className="page-bg-hero-stunning relative flex min-h-screen flex-col">
      <div className="relative z-10 flex flex-1 flex-col">
        <Navbar />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 md:px-6 md:py-10 lg:py-12">
          <div className="rounded-[28px] bg-white/95 px-5 py-9 shadow-[0_28px_90px_rgba(15,90,75,0.14)] ring-1 ring-white/90 backdrop-blur-sm sm:px-8 sm:py-10 md:px-11 md:py-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
              <div className="mx-auto max-w-xl flex-1 text-center lg:mx-0 lg:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                  <span className="rounded-full bg-[#ecfccb] px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[#3f6212] ring-1 ring-lime-200/80">
                    演示环境
                  </span>
                  <span className="text-caption font-bold tracking-wide text-brand">教师端</span>
                </div>
                <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink md:text-[2rem] lg:text-4xl">
                  智能作业批改
                </h1>
                <p className="mt-3 text-lg font-bold text-ink md:text-xl">
                  希沃智教<span className="text-brand">π</span>
                </p>
                <p className="mx-auto mt-4 max-w-lg text-small leading-relaxed text-ink-muted lg:mx-0">
                  拍照批改、过程性评分、学情分析与作业下发，帮助你在课前课后快速掌握班级情况。
                </p>
              </div>
              <div className="flex justify-center lg:justify-end lg:pr-2">
                <IpBrandFace size="hero" />
              </div>
            </div>

            <div className="mx-auto mt-10 max-w-3xl space-y-10">
              <section aria-labelledby="teacher-nav-heading">
                <SectionHeading title="教师工作台" desc="管理作业、查看学情与反馈" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {TEACHER_NAV.map((item) => (
                    <div key={item.to} className={item.wide ? "sm:col-span-2" : undefined}>
                      <TeacherNavCard
                        to={item.to}
                        title={item.title}
                        desc={item.desc}
                        icon={item.icon}
                        badge={item.to === "/workspace" ? inboxPending : undefined}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section aria-labelledby="teacher-grade-heading">
                <SectionHeading title="开始批改" desc="选择学科上传作业；填写学生姓名后可下发至学生端。" />
                <div className="mb-4 flex flex-wrap gap-2">
                  {["上传照片", "查看过程分", "发送给学生"].map((step, i) => (
                    <span key={step} className="inline-flex items-center gap-2 text-caption font-semibold text-ink-muted">
                      {i > 0 ? <span className="text-ink-subtle" aria-hidden>→</span> : null}
                      <span className="campus-flow-chip">{step}</span>
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SubjectCard
                    title="数学作业"
                    description="逐题过程分与薄弱知识点。"
                    to="/math"
                    theme="math"
                    badge="理科"
                  />
                  <SubjectCard
                    title="英语作文"
                    description="内容、语言、结构多维评分。"
                    to="/english"
                    theme="english"
                    badge="作文"
                  />
                </div>
              </section>

              <section
                className="rounded-card border border-black/[0.08] border-l-[5px] border-l-primary bg-surface-card px-5 py-4 shadow-card md:px-6"
                aria-label="批改说明"
              >
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
                  {ADVANTAGES.map((item, i) => (
                    <li key={item.title} className="flex gap-3 sm:flex-col sm:items-center sm:text-center">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-small font-black text-white shadow-sm ring-2 ring-[#FEF9C3]/90"
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-small font-bold text-ink">{item.title}</p>
                        <p className="mt-0.5 text-caption leading-snug text-ink-muted">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </main>
        {prefs.showHomeFabHelp ? <FabHelp onClick={() => setHelpOpen(true)} /> : null}
      </div>
      <AiHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
