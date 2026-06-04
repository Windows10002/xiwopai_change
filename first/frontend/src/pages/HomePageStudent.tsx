import { Sparkles } from "lucide-react";

import { AppLink } from "@/components/atoms/AppLink";
import { Navbar } from "@/components/atoms/Navbar";
import { PiAssistantFab } from "@/components/atoms/PiAssistantFab";
import { SubjectCard } from "@/components/molecules/SubjectCard";
import { StudentHomeEntry } from "@/components/molecules/StudentHomeEntry";
import { StudentHomeHub } from "@/components/molecules/StudentHomeHub";
import { IpBrandFace } from "@/components/atoms/IpMascot";
import { PageCampusDeco } from "@/components/atoms/PageCampusDeco";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { StudentBadgeEarnedToast } from "@/components/molecules/StudentBadgeEarnedToast";
import { useStudentPendingCounts } from "@/hooks/useStudentPendingCounts";
import { useStudentRewards } from "@/hooks/useStudentRewards";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { sessionDisplayLabel } from "@/lib/appSession";
import { useAppSession } from "@/hooks/useAppSession";
import { myWorkPath, piTutorPath, rewardsPath, todoPath, wrongBookPath } from "@/lib/studentRoutes";

const ADVANTAGES = [
  { title: "看清字迹", desc: "拍正、少反光，像课堂展示作业一样清楚。", emoji: "📷" },
  { title: "分项给分", desc: "过程分看得见，哪里写得好、哪里要加油一目了然。", emoji: "✏️" },
  { title: "评语与要点", desc: "总评 + 错因 + 薄弱点，放学回家也知道怎么改。", emoji: "🌱" },
] as const;

const CAMPUS_TAGS = ["课后巩固", "过程分看得见", "错题有反馈"] as const;

/** 学生端：校园青春风首页 */
export function HomePageStudent() {
  const prefs = useUserPreferences();
  const session = useAppSession();
  const { counts } = useStudentPendingCounts(Boolean(session));
  const { earnedCount } = useStudentRewards();

  const myWorkBadge = counts.pendingReleaseCount + counts.variantsPendingCount;

  return (
    <div className="page-bg-hero-stunning relative flex min-h-screen flex-col">
      <PageCampusDeco />
      <div className="relative z-10 flex flex-1 flex-col">
        <Navbar />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 md:px-6 md:py-10 lg:py-12">
          <div className="home-hero-card campus-tape-card notebook-card animate-fade-up-in rounded-[28px] px-5 py-9 shadow-[0_28px_90px_rgba(15,90,75,0.14)] ring-1 ring-white/90 backdrop-blur-sm sm:px-8 sm:py-10 md:px-11 md:py-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
              <div className="animate-fade-up-in stagger-1 mx-auto max-w-xl flex-1 text-center lg:mx-0 lg:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                  <span className="campus-tag campus-tag--sun animate-pop-in stagger-1">
                    <Sparkles className="h-3 w-3" {...CUTE_ICON} aria-hidden />
                    校园实验室
                  </span>
                  <span className="campus-tag campus-tag--mint">学生端</span>
                </div>
                <h1 className="animate-pop-in stagger-2 mt-4 text-3xl font-extrabold tracking-tight text-ink md:text-[2rem] lg:text-4xl">
                  校园智能批改站
                </h1>
                <p className="mt-3 text-lg font-bold text-ink md:text-xl">
                  希沃智教<span className="text-brand">π</span>
                  <span className="ml-2 text-small font-semibold text-ink-muted">· 和同桌一起更轻松交作业</span>
                </p>
                {session ? (
                  <p className="mt-2 text-small font-semibold text-ink-muted">{sessionDisplayLabel(session)}</p>
                ) : null}
                <p className="mx-auto mt-4 max-w-lg text-small leading-relaxed text-ink-muted lg:mx-0">
                  数学、英语、语文作业：拍一拍就能看分数、过程分和评语。完成作业还能收集 π 徽章兑换奖励。
                </p>
                <div className="mx-auto mt-4 flex flex-wrap justify-center gap-2 lg:mx-0 lg:justify-start">
                  {CAMPUS_TAGS.map((tag) => (
                    <span key={tag} className="campus-tag campus-tag--sky">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mx-auto mt-4 inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 lg:mx-0 lg:justify-start">
                  <span className="campus-flow-chip">拍一拍作业</span>
                  <span aria-hidden className="animate-flow-arrow text-lg text-primary">
                    →
                  </span>
                  <span className="campus-flow-chip">看懂分数</span>
                  <span aria-hidden className="animate-flow-arrow text-lg text-primary [animation-delay:0.35s]">
                    →
                  </span>
                  <span className="campus-flow-chip">收获评语</span>
                </p>
              </div>

              <div className="animate-fade-up-in stagger-2 flex justify-center lg:justify-end lg:pr-2">
                <div className="relative">
                  <span
                    className="campus-tag campus-tag--pink animate-pop-in absolute -left-2 top-2 z-10 -rotate-6 shadow-sm"
                    aria-hidden
                  >
                    加油呀 ✨
                  </span>
                  <IpBrandFace size="hero" className="animate-float-gentle" />
                </div>
              </div>
            </div>

            {counts.actionTotal > 0 ? (
              <div className="animate-fade-up-in stagger-3 mt-6 flex w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-sky-200/80 bg-sky-50/85 px-4 py-3 text-caption lg:justify-start">
                <span className="font-bold text-sky-950">待处理</span>
                {counts.todoCount > 0 ? (
                  <AppLink
                    to={todoPath()}
                    className="rounded-full bg-white px-2.5 py-1 font-bold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50"
                  >
                    {counts.todoCount} 项待交作业
                  </AppLink>
                ) : null}
                {counts.pendingReleaseCount > 0 ? (
                  <AppLink
                    to={myWorkPath("work")}
                    className="rounded-full bg-white px-2.5 py-1 font-bold text-sky-800 ring-1 ring-sky-200 hover:bg-sky-50"
                  >
                    {counts.pendingReleaseCount} 份新批改待查看
                  </AppLink>
                ) : null}
                {counts.variantsPendingCount > 0 ? (
                  <AppLink
                    to={myWorkPath("variants")}
                    className="rounded-full bg-white px-2.5 py-1 font-bold text-violet-800 ring-1 ring-violet-200 hover:bg-violet-50"
                  >
                    {counts.variantsPendingCount} 道变式待完成
                  </AppLink>
                ) : null}
              </div>
            ) : null}

            <StudentHomeHub>
              <StudentHomeEntry
                to={todoPath()}
                title="待办任务"
                description="教师布置的作业，拍照一键交卷"
                iconVariant="todo"
                tone="mint"
                badge={counts.todoCount}
              />
              <StudentHomeEntry
                to={myWorkPath()}
                title="我的作业"
                description="批改结果、分数评语与变式题"
                iconVariant="work"
                tone="violet"
                badge={myWorkBadge > 0 ? myWorkBadge : undefined}
              />
              <StudentHomeEntry
                to={wrongBookPath()}
                title="错题本"
                description="自动收录错题，标记订正复习"
                iconVariant="wrongbook"
                tone="teal"
                badge={counts.wrongBookCount > 0 ? counts.wrongBookCount : undefined}
              />
              <StudentHomeEntry
                to={piTutorPath()}
                title="π 助学"
                description="分析错题、讲解不会的题"
                iconVariant="tutor"
                tone="cyan"
                tagLabel="AI"
              />
              <StudentHomeEntry
                to={rewardsPath()}
                title="π 奖励"
                description={
                  earnedCount > 0
                    ? `已收集 ${earnedCount} 枚 IP 徽章`
                    : "完成作业，收集 π 徽章兑好礼"
                }
                iconVariant="rewards"
                tone="grape"
                badge={earnedCount > 0 ? earnedCount : undefined}
              />
            </StudentHomeHub>

            <hr className="animate-fade-up-in stagger-3 my-8 border-0 border-t border-dashed border-primary/20" />

            <div className="animate-fade-up-in stagger-3 text-center">
              <p className="text-lg font-bold text-ink md:text-xl">今天想练哪一科？</p>
              <p className="mx-auto mt-2 max-w-lg text-small text-ink-muted">
                选一门课开始，上传作业照片，过程性评分和学情反馈马上呈现。
              </p>
            </div>

            <div className="mt-8 grid w-full grid-cols-1 gap-4 md:mt-10 md:grid-cols-3 md:gap-5">
              <SubjectCard
                title="数学作业"
                description="方程、几何、应用题——逐题过程分，薄弱点帮你记下来。"
                to="/math"
                theme="math"
                badge="理科笔记本"
                className="animate-fade-up-in stagger-4"
              />
              <SubjectCard
                title="英语作业"
                description="内容、语言、结构多维打分，亮点与纠错一次看完。"
                to="/english"
                theme="english"
                badge="外语"
                className="animate-fade-up-in stagger-5"
              />
              <SubjectCard
                title="语文作业"
                description="字词、阅读、书写规范——多维度点评与薄弱点。"
                to="/chinese"
                theme="chinese"
                badge="语文"
                className="animate-fade-up-in stagger-6"
              />
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 border-t border-dashed border-primary/15 pt-10 sm:grid-cols-3 sm:gap-5">
              {ADVANTAGES.map((item, i) => (
                <div
                  key={item.title}
                  className={`animate-fade-up-in flex gap-4 rounded-2xl border border-white/60 bg-gradient-to-br from-primary-tint/90 to-[#FEFCE8]/85 px-4 py-4 shadow-sm ring-1 ring-primary/10 transition-all duration-hover ease-smooth hover:-translate-y-1.5 hover:shadow-[0_12px_28px_rgba(82,196,26,0.16)] sm:flex-col sm:items-center sm:text-center sm:px-5 ${i === 0 ? "stagger-3" : i === 1 ? "stagger-4" : "stagger-5"}`}
                >
                  <span
                    className="animate-wiggle-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-md ring-2 ring-[#FEF9C3]/90 sm:h-12 sm:w-12"
                    style={{ animationDelay: `${i * 0.35}s` }}
                    aria-hidden
                  >
                    {item.emoji}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-body font-bold text-ink">{item.title}</h3>
                    <p className="mt-1.5 text-small leading-relaxed text-ink-muted">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <PiAssistantFab show={prefs.showHomeFabHelp} />
        <StudentBadgeEarnedToast />
      </div>
    </div>
  );
}
