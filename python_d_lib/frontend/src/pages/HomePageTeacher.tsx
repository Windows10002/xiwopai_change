import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { Navbar } from "@/components/atoms/Navbar";
import { FabHelp } from "@/components/atoms/FabHelp";
import { SubjectCard } from "@/components/molecules/SubjectCard";
import { IpBrandFace } from "@/components/atoms/IpMascot";
import { AiHelpModal } from "@/components/organisms/AiHelpModal";

const ADVANTAGES = [
  { title: "看清字迹", desc: "尽量拍正、少反光，方便辨认手写与算式。" },
  { title: "分项给分", desc: "数学按题看过程分，英语按内容、语言、结构几项打分。" },
  { title: "评语与要点", desc: "一页里汇总总评、错因提示和需要加强的知识。" },
] as const;

/** 教师端 / 未登录：简洁首页（无校园装饰） */
export function HomePageTeacher() {
  const prefs = useUserPreferences();
  const [helpOpen, setHelpOpen] = useState(false);

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
                  <span className="text-caption font-bold tracking-wide text-brand">作业批改 · 演示</span>
                </div>
                <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink md:text-[2rem] lg:text-4xl">
                  智能作业批改
                </h1>
                <p className="mt-3 text-lg font-bold text-ink md:text-xl">
                  希沃智教<span className="text-brand">π</span>
                </p>
                <p className="mx-auto mt-4 max-w-lg text-small leading-relaxed text-ink-muted lg:mx-0">
                  数学作业、英语作文：拍照上传后给出分数、简要评语和需要巩固的点。右上角「批改历史」可按学科查看本机最近记录。
                </p>
                <p className="mx-auto mt-4 inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-caption font-semibold text-ink-navActive lg:mx-0 lg:justify-start">
                  <span>上传照片</span>
                  <span aria-hidden className="text-ink-subtle">
                    →
                  </span>
                  <span>查看分数与过程分</span>
                  <span aria-hidden className="text-ink-subtle">
                    →
                  </span>
                  <span>阅读评语</span>
                </p>
              </div>
              <div className="flex justify-center lg:justify-end lg:pr-2">
                <IpBrandFace size="hero" />
              </div>
            </div>

            <Link
              to="/student-analytics"
              className="mx-auto mt-8 flex max-w-2xl items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary-tint/70 px-4 py-3 text-small font-bold text-ink-navActive shadow-sm transition hover:border-primary/35 hover:bg-primary-tint"
            >
              <BarChart3 className="h-5 w-5 shrink-0 text-primary" {...CUTE_ICON} aria-hidden />
              学生个性化学情分析
              <span className="font-normal text-ink-muted">（按姓名汇总多次批改）</span>
            </Link>

            <hr className="my-10 border-0 border-t border-dashed border-primary/15" />

            <div className="text-center">
              <p className="text-lg font-bold text-ink md:text-xl">选择学科进入批改</p>
              <p className="mx-auto mt-2 max-w-lg text-small text-ink-muted">
                选择学科进入批改流程：上传作业照片，查看过程性评分与学情反馈。
              </p>
            </div>

            <div className="mx-auto mt-8 grid w-full max-w-4xl grid-cols-1 gap-4 md:mt-10 md:grid-cols-2 md:gap-5">
              <SubjectCard
                title="数学作业"
                description="拍照上传数学题，查看逐题过程分与薄弱知识点。"
                to="/math"
              />
              <SubjectCard
                title="英语作文"
                description="上传作文稿纸，获取多维过程分、亮点与纠错建议。"
                to="/english"
              />
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 border-t border-primary/10 pt-10 sm:grid-cols-3 sm:gap-5">
              {ADVANTAGES.map((item, i) => (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-2xl bg-gradient-to-br from-primary-tint/90 to-[#FEFCE8]/80 px-4 py-4 ring-1 ring-primary/10 sm:flex-col sm:items-center sm:text-center sm:px-5"
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-black text-white shadow-[0_6px_16px_rgba(82,196,26,0.35)] ring-2 ring-[#FEF9C3]/90 sm:h-12 sm:w-12"
                    aria-hidden
                  >
                    {i + 1}
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
