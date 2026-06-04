import { useCallback, useEffect, useState } from "react";
import { ClipboardList, MessageSquareWarning, Settings, Shield } from "lucide-react";

import { AppLink } from "@/components/atoms/AppLink";
import { PiAssistantFab } from "@/components/atoms/PiAssistantFab";
import { Navbar } from "@/components/atoms/Navbar";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { IpBrandFace } from "@/components/atoms/IpMascot";
import { useWorkspaceAssignmentsSync } from "@/hooks/useWorkspaceAssignmentsSync";
import { fetchAllAssignments, type WorkspaceAssignment } from "@/lib/workspaceApi";
import { loadAuthToken } from "@/lib/apiClient";

const SUBJECT_CN = { math: "数学", english: "英语", chinese: "语文" } as const;

const TILES = [
  { to: "/workspace", label: "作业总览", desc: "全校任务发布与审阅同步", icon: ClipboardList },
  { to: "/class-analytics", label: "学情中心", desc: "本机批改汇总、按学生分析", icon: ClipboardList },
  { to: "/feedback-dashboard", label: "判题反馈", desc: "教师判题异议与模型优化线索", icon: MessageSquareWarning },
  { to: "/product-feedback", label: "产品反馈", desc: "π 助手用户建议与 Bug 汇总导出", icon: MessageSquareWarning },
  { to: "/math", label: "数学批改", desc: "抽检或演示批改（教务权限）", icon: Shield },
  { to: "/english", label: "英语批改", desc: "抽检或演示批改", icon: Shield },
  { to: "/chinese", label: "语文批改", desc: "抽检或演示批改", icon: Shield },
  { to: "/settings", label: "系统设置", desc: "名册、导出偏好、申诉处理", icon: Settings },
] as const;

function formatWhen(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

/** 教务系统端首页 */
export function HomePageAdmin() {
  const prefs = useUserPreferences();
  const [assignments, setAssignments] = useState<WorkspaceAssignment[]>([]);

  const loadAssignments = useCallback(() => {
    if (!loadAuthToken()) return;
    void fetchAllAssignments()
      .then(setAssignments)
      .catch(() => setAssignments([]));
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useWorkspaceAssignmentsSync(loadAssignments);

  return (
    <div className="page-bg-hero-stunning relative flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 md:px-6 md:py-10 lg:py-12">
        <div className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-sky-50/60 px-5 py-9 shadow-[0_28px_90px_rgba(15,90,75,0.14)] ring-1 ring-white/90 backdrop-blur-sm sm:px-8 sm:py-10 md:px-11 md:py-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            <div className="min-w-0 flex-1">
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-small font-bold text-white">教务系统端</span>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink md:text-[2rem] lg:text-4xl">
                校级学情与质检工作台
              </h1>
              <p className="mt-3 max-w-xl text-lg text-ink-muted md:text-xl">
                可查看全校任务与学情、处理申诉与反馈；教师端发布/编辑的任务会同步显示在下方总览。
              </p>
            </div>
            <div className="flex justify-center lg:justify-end lg:pr-2">
              <IpBrandFace size="hero" className="shrink-0" />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TILES.map(({ to, label, desc, icon: Icon }) => (
              <AppLink
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
              </AppLink>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white/95 p-5">
            <h2 className="text-body font-extrabold text-ink">全校任务同步 ({assignments.length})</h2>
            <p className="mt-1 text-caption text-ink-muted">与教师端作业管理实时一致，便于教务督导</p>
            {assignments.length === 0 ? (
              <p className="mt-6 text-caption text-ink-muted">暂无任务，教师发布后将在此显示</p>
            ) : (
              <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                {assignments.map((a) => (
                  <li key={a.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-caption">
                    <span className="font-semibold text-ink">
                      {SUBJECT_CN[a.subject]} · {a.title}
                    </span>
                    <span className="text-ink-muted">
                      {a.class_name} · 提交 {a.submission_count ?? 0} · {formatWhen(a.published_at || a.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
      <PiAssistantFab show={prefs.showHomeFabHelp} />
    </div>
  );
}
