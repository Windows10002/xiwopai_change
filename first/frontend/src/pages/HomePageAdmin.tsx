import { Link } from "react-router-dom";
import { BarChart3, ClipboardList, MessageSquareWarning, Settings, Shield } from "lucide-react";

import { Navbar } from "@/components/atoms/Navbar";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { IpBrandFace } from "@/components/atoms/IpMascot";

const TILES = [
  { to: "/student-analytics", label: "学生学情", desc: "按学生汇总批改与薄弱点", icon: BarChart3 },
  { to: "/class-analytics", label: "班级看板", desc: "按批次/文件夹班级分析", icon: ClipboardList },
  { to: "/feedback-dashboard", label: "判题反馈", desc: "教师反馈与模型优化线索", icon: MessageSquareWarning },
  { to: "/math", label: "数学批改", desc: "抽检或演示批改（教务权限）", icon: Shield },
  { to: "/english", label: "英语批改", desc: "抽检或演示批改", icon: Shield },
  { to: "/settings", label: "系统设置", desc: "名册、导出偏好、申诉处理", icon: Settings },
] as const;

/** 教务系统端首页 */
export function HomePageAdmin() {
  return (
    <div className="page-bg-hero-stunning relative flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 md:px-6 md:py-10">
        <div className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-sky-50/60 px-6 py-9 shadow-card">
          <div className="flex flex-wrap items-center gap-4">
            <IpBrandFace size="md" />
            <div>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-caption font-bold text-white">教务系统端</span>
              <h1 className="mt-2 text-2xl font-extrabold text-ink">校级学情与质检工作台</h1>
              <p className="mt-1 max-w-xl text-small text-ink-muted">
                可查看全校/全班学情、处理申诉与反馈；支持抽检批改，不参与日常课堂批改时可仅使用分析模块。
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TILES.map(({ to, label, desc, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex gap-3 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
                  <Icon className="h-5 w-5" {...CUTE_ICON} aria-hidden />
                </span>
                <span>
                  <span className="text-body font-bold text-ink">{label}</span>
                  <span className="mt-0.5 block text-caption text-ink-muted">{desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
