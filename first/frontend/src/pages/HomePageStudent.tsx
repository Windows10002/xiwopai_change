import { useState } from "react";
import { Link } from "react-router-dom";
import { BookMarked, ClipboardList, Sparkles } from "lucide-react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Navbar } from "@/components/atoms/Navbar";
import { FabHelp } from "@/components/atoms/FabHelp";
import { SubjectCard } from "@/components/molecules/SubjectCard";
import { IpBrandFace } from "@/components/atoms/IpMascot";
import { AiHelpModal } from "@/components/organisms/AiHelpModal";
import { PageCampusDeco } from "@/components/atoms/PageCampusDeco";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { countWrongBookItems } from "@/lib/wrongQuestionBook";

const ADVANTAGES = [
  { title: "看清字迹", desc: "拍正、少反光，像课堂展示作业一样清楚。", emoji: "📷" },
  { title: "分项给分", desc: "过程分看得见，哪里写得好、哪里要加油一目了然。", emoji: "✏️" },
  { title: "评语与要点", desc: "总评 + 错因 + 薄弱点，放学回家也知道怎么改。", emoji: "🌱" },
] as const;

const CAMPUS_TAGS = ["课后巩固", "过程分看得见", "错题有反馈"] as const;

/** 学生端：校园青春风首页 */
export function HomePageStudent() {
  const prefs = useUserPreferences();
  const [helpOpen, setHelpOpen] = useState(false);
  const wrongCount = countWrongBookItems();

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
                <p className="mx-auto mt-4 max-w-lg text-small leading-relaxed text-ink-muted lg:mx-0">
                  数学作业、英语作文：拍一拍就能看分数、过程分和评语。错题会自动收录到错题本。
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

            <Link
              to="/todo"
              className="campus-banner-strip animate-fade-up-in stagger-3 mx-auto mt-6 flex max-w-2xl items-center justify-center gap-2 transition hover:border-primary/40 hover:shadow-md"
            >
              <ClipboardList className="h-4 w-4 shrink-0 text-primary" {...CUTE_ICON} aria-hidden />
              <span>待办任务</span>
              <span className="text-ink-subtle" aria-hidden>
                ·
              </span>
              <span className="text-ink-muted">完成教师布置的作业</span>
            </Link>

            <Link
              to="/my-work"
              className="campus-banner-strip animate-fade-up-in stagger-3 mx-auto mt-3 flex max-w-2xl items-center justify-center gap-2 transition hover:border-primary/40 hover:shadow-md"
            >
              <BookMarked className="h-4 w-4 shrink-0 text-primary" {...CUTE_ICON} aria-hidden />
              <span>我的作业</span>
              {wrongCount > 0 ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-black text-white">
                  {wrongCount}
                </span>
              ) : null}
              <span className="text-ink-subtle" aria-hidden>
                ·
              </span>
              <span className="text-ink-muted">查看教师下发的批改结果</span>
            </Link>

            <Link
              to="/wrong-book"
              className="campus-banner-strip animate-fade-up-in stagger-3 mx-auto mt-3 flex max-w-2xl items-center justify-center gap-2 transition hover:border-primary/40 hover:shadow-md"
            >
              <BookMarked className="h-4 w-4 shrink-0 text-primary" {...CUTE_ICON} aria-hidden />
              <span>我的错题本</span>
              {wrongCount > 0 ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-black text-white">
                  {wrongCount}
                </span>
              ) : null}
              <span className="text-ink-subtle" aria-hidden>
                ·
              </span>
              <span className="text-ink-muted">批改后自动收录错题</span>
            </Link>

            <hr className="animate-fade-up-in stagger-3 my-8 border-0 border-t border-dashed border-primary/20" />

            <div className="animate-fade-up-in stagger-3 text-center">
              <p className="text-lg font-bold text-ink md:text-xl">今天想练哪一科？</p>
              <p className="mx-auto mt-2 max-w-lg text-small text-ink-muted">
                选一门课开始，上传作业照片，过程性评分和学情反馈马上呈现。
              </p>
            </div>

            <div className="mx-auto mt-8 grid w-full max-w-4xl grid-cols-1 gap-4 md:mt-10 md:grid-cols-2 md:gap-5">
              <SubjectCard
                title="数学作业"
                description="方程、几何、应用题——逐题过程分，薄弱点帮你记下来。"
                to="/math"
                theme="math"
                badge="理科笔记本"
                className="animate-fade-up-in stagger-4"
              />
              <SubjectCard
                title="英语作文"
                description="内容、语言、结构多维打分，亮点与纠错一次看完。"
                to="/english"
                theme="english"
                badge="作文本"
                className="animate-fade-up-in stagger-5"
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
        {prefs.showHomeFabHelp ? <FabHelp onClick={() => setHelpOpen(true)} /> : null}
      </div>
      <AiHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
