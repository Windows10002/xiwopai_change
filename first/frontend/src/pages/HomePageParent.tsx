import { useMemo } from "react";

import { Camera, Eye, Heart, TrendingUp } from "lucide-react";



import { Navbar } from "@/components/atoms/Navbar";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";

import { IpBrandFace } from "@/components/atoms/IpMascot";

import { SubjectCard } from "@/components/molecules/SubjectCard";

import { loadGradingHistory } from "@/lib/gradingHistory";

import { loadWrongBookItems } from "@/lib/wrongQuestionBook";



/** 家长端首页：代孩子批改 + 只读学情摘要 */

export function HomePageParent() {

  const history = useMemo(() => loadGradingHistory().slice(0, 15), []);

  const wrongCount = loadWrongBookItems().length;

  const avg =

    history.length > 0

      ? Math.round((history.reduce((a, e) => a + e.detail.scorePercent, 0) / history.length) * 10) / 10

      : null;



  return (

    <div className="page-bg-hero-stunning relative flex min-h-screen flex-col">

      <Navbar />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 md:max-w-4xl md:px-6 md:py-10">

        <div className="rounded-[28px] bg-gradient-to-br from-rose-50/95 via-white to-amber-50/80 px-6 py-9 shadow-card ring-1 ring-rose-100/80">

          <div className="flex flex-col items-center text-center sm:flex-row sm:text-left">

            <IpBrandFace size="md" className="shrink-0" />

            <div className="mt-4 sm:ml-5 sm:mt-0">

              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-caption font-bold text-rose-900">

                <Heart className="h-3 w-3" {...CUTE_ICON} aria-hidden />

                家长端

              </span>

              <h1 className="mt-2 text-2xl font-extrabold text-ink">孩子成长一览</h1>

              <p className="mt-2 text-small text-ink-muted">

                可代孩子拍照批改数学、英语作业；学情与错题统计来自本机浏览器记录（与学生端共用存储）。

              </p>

            </div>

          </div>



          <div className="mt-8 text-center sm:text-left">

            <p className="flex items-center justify-center gap-2 text-body font-bold text-ink sm:justify-start">

              <Camera className="h-4 w-4 text-primary" {...CUTE_ICON} aria-hidden />

              代孩子批改

            </p>

            <p className="mt-1 text-caption text-ink-muted">上传前请填写孩子姓名，便于在学情列表中区分</p>

          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">

            <SubjectCard

              title="数学作业"

              description="逐题过程分与薄弱点，帮你看清孩子哪里要巩固。"

              to="/math"

              theme="math"

              badge="代拍"

            />

            <SubjectCard

              title="英语作文"

              description="内容、语言、结构多维打分，亮点与纠错一次看完。"

              to="/english"

              theme="english"

              badge="代拍"

            />

          </div>



          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">

            <div className="rounded-xl bg-white/90 px-4 py-3 text-center ring-1 ring-rose-100">

              <p className="text-caption text-ink-muted">最近批改</p>

              <p className="text-2xl font-black text-ink">{history.length}</p>

            </div>

            <div className="rounded-xl bg-sky-50 px-4 py-3 text-center ring-1 ring-sky-100">

              <p className="text-caption text-ink-muted">平均得分率</p>

              <p className="text-2xl font-black text-sky-900">{avg != null ? `${avg}%` : "—"}</p>

            </div>

            <div className="col-span-2 rounded-xl bg-amber-50 px-4 py-3 text-center ring-1 ring-amber-100 sm:col-span-1">

              <p className="text-caption text-ink-muted">错题收录</p>

              <p className="text-2xl font-black text-amber-950">{wrongCount}</p>

            </div>

          </div>



          <div className="mt-6 rounded-2xl border border-black/[0.06] bg-white/80 p-4">

            <p className="flex items-center gap-2 text-caption font-bold text-ink">

              <TrendingUp className="h-4 w-4 text-primary" {...CUTE_ICON} aria-hidden />

              最近作业

            </p>

            <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">

              {history.length === 0 ? (

                <li className="text-caption text-ink-muted">暂无记录，请先完成一次代拍批改</li>

              ) : (

                history.map((e) => (

                  <li key={e.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-surface-page/70 px-3 py-2 text-caption">

                    <span className="font-semibold text-ink">

                      {e.studentName || "未标注"} · {e.subject === "math" ? "数学" : "英语"}

                    </span>

                    <span className="text-ink-muted">

                      {e.detail.scorePercent}% · {e.detail.overallLabel}

                    </span>

                  </li>

                ))

              )}

            </ul>

          </div>



          <p className="mt-6 flex items-start gap-2 rounded-xl border border-sky-200/70 bg-sky-50/80 px-3 py-2.5 text-caption text-sky-950">

            <Eye className="mt-0.5 h-4 w-4 shrink-0" {...CUTE_ICON} aria-hidden />

            家长端不能修改分数、审核申诉或查看班级看板；如需教师改分请使用教师端登录。

          </p>

        </div>

      </main>

    </div>

  );

}


