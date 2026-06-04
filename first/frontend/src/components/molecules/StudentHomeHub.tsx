import type { ReactNode } from "react";
import { LayoutGrid } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";

/** 学生首页四宫格工作台容器 */
export function StudentHomeHub({ children }: { children: ReactNode }) {
  return (
    <section
      className="animate-fade-up-in stagger-3 mt-6 w-full"
      aria-labelledby="student-hub-heading"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-tint text-primary ring-1 ring-primary/20">
            <LayoutGrid className="h-4 w-4" {...CUTE_ICON} aria-hidden />
          </span>
          <div>
            <h2 id="student-hub-heading" className="text-body font-extrabold text-ink">
              我的学习台
            </h2>
            <p className="text-[0.65rem] font-semibold text-ink-muted sm:text-caption">交作业 · 看结果 · 练错题 · 问 π · 领奖励</p>
          </div>
        </div>
        <span className="campus-tag campus-tag--mint text-[0.65rem]">点击卡片进入</span>
      </div>

      <div className="relative rounded-[1.35rem] bg-gradient-to-br from-white/60 via-primary-tint/25 to-amber-50/30 p-3 ring-1 ring-primary/10 sm:p-4">
        <div
          className="pointer-events-none absolute inset-0 rounded-[1.35rem] opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(22,101,52,0.06) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
          aria-hidden
        />
        <div className="relative grid grid-cols-2 items-stretch gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5 lg:gap-3">
          {children}
        </div>
      </div>
    </section>
  );
}
