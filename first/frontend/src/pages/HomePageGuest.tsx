import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { Navbar } from "@/components/atoms/Navbar";
import { FabHelp } from "@/components/atoms/FabHelp";
import { SubjectCard } from "@/components/molecules/SubjectCard";
import { IpBrandFace } from "@/components/atoms/IpMascot";
import { AiHelpModal } from "@/components/organisms/AiHelpModal";
import { useState } from "react";

/** 未登录默认首页：仅展示批改入口 */
export function HomePageGuest() {
  const prefs = useUserPreferences();
  const [helpOpen, setHelpOpen] = useState(false);

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

            <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-primary/20 bg-primary-tint/40 px-4 py-4 text-center ring-1 ring-primary/10 sm:flex-row sm:justify-between sm:text-left">
              <p className="flex items-center justify-center gap-2 text-small font-semibold text-[#006D41] sm:justify-start">
                <Lock className="h-4 w-4 shrink-0" {...CUTE_ICON} aria-hidden />
                请登录后解锁作业管理、学情看板等其他功能
              </p>
              <Link
                to="/login"
                className="btn-accent-mint-solid inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl px-5 text-caption font-bold"
              >
                去登录
              </Link>
            </div>
          </div>
        </main>

        {prefs.showHomeFabHelp ? <FabHelp onClick={() => setHelpOpen(true)} /> : null}
      </div>
      <AiHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
