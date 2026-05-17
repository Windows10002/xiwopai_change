import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";

import { Navbar } from "@/components/atoms/Navbar";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { GRADE_LEVEL_OPTIONS } from "@/components/molecules/GradingContextModal";
import { clearSession } from "@/lib/appSession";
import { useAppSession } from "@/hooks/useAppSession";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import {
  DEFAULT_USER_PREFERENCES,
  saveUserPreferences,
  syncUserPreferencesToDom,
  type InsightTabPref,
  type UserPreferences,
} from "@/lib/userPreferences";
import type { ExportDimensionFilter } from "@/lib/exportGrading";
import { StudentGradingDisputePanel, TeacherGradingDisputePanel } from "@/components/molecules/GradingDisputePanels";

function gradeLabel(g: number | null, role: string): string {
  if (role === "teacher") return "—（教师）";
  if (g == null) return "—";
  if (g <= 6) return `${g} 年级（小学）`;
  if (g <= 9) return `${g} 年级（初中）`;
  return `${g} 年级（高中）`;
}

function PrefSection({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="mt-10 border-t border-primary/10 pt-8 first:mt-8 first:border-t-0 first:pt-0">
      <h2 className="text-body font-bold text-ink">{title}</h2>
      {desc ? <p className="mt-1 text-caption leading-relaxed text-ink-muted">{desc}</p> : null}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function PrefToggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer select-none items-start gap-3 rounded-xl border border-black/[0.06] bg-surface-page/80 px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-gray-300 accent-accent-mint"
      />
      <span>
        <span className="block text-small font-bold text-ink">{label}</span>
        <span className="mt-0.5 block text-caption leading-relaxed text-ink-muted">{hint}</span>
      </span>
    </label>
  );
}

function applyPrefs(partial: Partial<UserPreferences>) {
  const next = saveUserPreferences(partial);
  syncUserPreferencesToDom(next);
}

export function SettingsPage() {
  const prefs = useUserPreferences();
  const sessionInfo = useAppSession();

  const resetPrefs = () => {
    const next = saveUserPreferences({ ...DEFAULT_USER_PREFERENCES });
    syncUserPreferencesToDom(next);
  };

  return (
    <div className="page-bg-hero-stunning relative flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 md:px-6 md:py-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-small font-semibold text-brand transition hover:text-brand-hover"
        >
          <ArrowLeft className="h-4 w-4" {...CUTE_ICON} aria-hidden />
          返回首页
        </Link>

        <div className="rounded-[1.25rem] border border-black/[0.08] bg-white/95 p-6 shadow-card ring-1 ring-primary/10 md:p-8">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary ring-1 ring-primary/15">
              <SlidersHorizontal className="h-5 w-5" {...CUTE_ICON} aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-ink">设置</h1>
              <p className="mt-1 text-small text-ink-muted">偏好保存在本机浏览器，修改后立即作用于首页、批改与导出。</p>
            </div>
          </div>

          <PrefSection title="当前登录信息（演示）">
            {sessionInfo ? (
              <ul className="space-y-2 text-small text-ink-muted">
                <li>
                  身份：<strong className="text-ink">{sessionInfo.role === "teacher" ? "教师" : "学生"}</strong>
                </li>
                <li>
                  年级：<strong className="text-ink">{gradeLabel(sessionInfo.studentGrade, sessionInfo.role)}</strong>
                </li>
              </ul>
            ) : (
              <p className="text-small text-ink-muted">尚未登录；批改页进入前会要求登录。</p>
            )}
            {sessionInfo ? (
              <button
                type="button"
                onClick={() => clearSession()}
                className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-2.5 text-caption font-bold text-red-700 transition hover:bg-red-100"
              >
                退出演示账号
              </button>
            ) : null}
          </PrefSection>

          {sessionInfo?.role === "teacher" ? <TeacherGradingDisputePanel /> : null}
          {sessionInfo?.role === "student" ? (
            <StudentGradingDisputePanel studentGrade={sessionInfo.studentGrade} />
          ) : null}

          <PrefSection title="界面与辅助" desc="影响全站字号、动画与帮助入口。">
            <PrefToggle
              label="减少动画"
              hint="减弱页面淡入、步骤切换等动画。"
              checked={prefs.reduceMotion}
              onChange={(v) => applyPrefs({ reduceMotion: v })}
            />
            <PrefToggle
              label="稍大字号"
              hint="根字号略放大，便于阅读长评语。"
              checked={prefs.largerText}
              onChange={(v) => applyPrefs({ largerText: v })}
            />
            <PrefToggle
              label="首页显示右下角帮助"
              hint="关闭后首页不再显示浮动帮助按钮。"
              checked={prefs.showHomeFabHelp}
              onChange={(v) => applyPrefs({ showHomeFabHelp: v })}
            />
            <PrefToggle
              label="批改页显示右下角帮助"
              hint="关闭后数学/英语批改页不再显示浮动帮助。"
              checked={prefs.showGradingFabHelp}
              onChange={(v) => applyPrefs({ showGradingFabHelp: v })}
            />
            <div className="rounded-xl border border-black/[0.06] bg-surface-page/80 px-4 py-3">
              <label htmlFor="pref-insight-tab" className="block text-small font-bold text-ink">
                批改结果默认打开的标签
              </label>
              <p className="mt-0.5 text-caption text-ink-muted">每次出新批改结果时，总评区默认选中的 Tab。</p>
              <select
                id="pref-insight-tab"
                value={prefs.defaultInsightTab}
                onChange={(e) => applyPrefs({ defaultInsightTab: e.target.value as InsightTabPref })}
                className="mt-2 w-full rounded-lg border border-black/[0.1] bg-white px-3 py-2.5 text-small text-ink outline-none focus:border-primary/35 focus:ring-2 focus:ring-primary/15"
              >
                <option value="summary">总评</option>
                <option value="strengths">亮点</option>
                <option value="improve">订正</option>
              </select>
            </div>
          </PrefSection>

          <PrefSection title="批改与预览" desc="影响左侧原图标记、分项列表与反馈入口。">
            <PrefToggle
              label="数学预览显示逐题对/错标记"
              hint="在数学作业原图右侧叠题号与对错符号（关闭后仅显示图片）。"
              checked={prefs.showMathPaperMarks}
              onChange={(v) => applyPrefs({ showMathPaperMarks: v })}
            />
            <PrefToggle
              label="分项较多时默认收起"
              hint="超过 14 项时，右侧分项列表初始为收起状态。"
              checked={prefs.compactDimensionList}
              onChange={(v) => applyPrefs({ compactDimensionList: v })}
            />
            <PrefToggle
              label="显示批改反馈入口"
              hint="分项「判题有误」与顶栏「整卷反馈」；关闭后仅保留导出功能。"
              checked={prefs.showQuestionFeedback}
              onChange={(v) => applyPrefs({ showQuestionFeedback: v })}
            />
          </PrefSection>

          <PrefSection
            title="批改默认上下文"
            desc="上传作业前的年级与备注；开启「记住」后会在选图弹窗预填，并在确认后写回此处。"
          >
            <PrefToggle
              label="记住年级与备注"
              hint="关闭后每次选图弹窗为空；开启后使用下方默认值，并在确认选图后更新。"
              checked={prefs.rememberGradingContext}
              onChange={(v) => applyPrefs({ rememberGradingContext: v })}
            />
            <div className="rounded-xl border border-black/[0.06] bg-surface-page/80 px-4 py-3">
              <label htmlFor="pref-default-grade" className="block text-small font-bold text-ink">
                默认年级（选图弹窗）
              </label>
              <select
                id="pref-default-grade"
                value={prefs.defaultGradeLevel}
                disabled={!prefs.rememberGradingContext}
                onChange={(e) => applyPrefs({ defaultGradeLevel: e.target.value })}
                className="mt-2 w-full rounded-lg border border-black/[0.1] bg-white px-3 py-2.5 text-small text-ink outline-none focus:border-primary/35 focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
              >
                {GRADE_LEVEL_OPTIONS.map((o) => (
                  <option key={o.value || "empty"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-xl border border-black/[0.06] bg-surface-page/80 px-4 py-3">
              <label htmlFor="pref-default-note" className="block text-small font-bold text-ink">
                默认教师备注（选图弹窗）
              </label>
              <textarea
                id="pref-default-note"
                rows={3}
                maxLength={800}
                disabled={!prefs.rememberGradingContext}
                value={prefs.defaultTeacherNote}
                onChange={(e) => applyPrefs({ defaultTeacherNote: e.target.value.slice(0, 800) })}
                placeholder="例：本次为单元测验，侧重过程分。"
                className="mt-2 w-full resize-y rounded-lg border border-black/[0.1] bg-white px-3 py-2.5 text-small text-ink outline-none focus:border-primary/35 focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
              />
              <p className="mt-1 text-[0.65rem] text-ink-muted">{prefs.defaultTeacherNote.length}/800</p>
            </div>
          </PrefSection>

          <PrefSection title="导出 Word / Excel 默认" desc="点击「导出」时弹窗中的初始勾选项。">
            <div className="rounded-xl border border-black/[0.06] bg-surface-page/80 px-4 py-3">
              <label htmlFor="pref-export-dim" className="block text-small font-bold text-ink">
                默认导出分项范围
              </label>
              <select
                id="pref-export-dim"
                value={prefs.exportDimensions}
                onChange={(e) => applyPrefs({ exportDimensions: e.target.value as ExportDimensionFilter })}
                className="mt-2 w-full rounded-lg border border-black/[0.1] bg-white px-3 py-2.5 text-small text-ink outline-none focus:border-primary/35 focus:ring-2 focus:ring-primary/15"
              >
                <option value="all">全部分项</option>
                <option value="errors">仅错题与未作答</option>
                <option value="correct">仅正确与过程不规范</option>
              </select>
            </div>
            <PrefToggle
              label="导出总评"
              hint="Word/Excel 中包含综合评语段落。"
              checked={prefs.exportIncludeSummary}
              onChange={(v) => applyPrefs({ exportIncludeSummary: v })}
            />
            <PrefToggle
              label="导出亮点"
              hint="包含优点与亮点列表。"
              checked={prefs.exportIncludeStrengths}
              onChange={(v) => applyPrefs({ exportIncludeStrengths: v })}
            />
            <PrefToggle
              label="导出订正建议"
              hint="包含改进与订正要点。"
              checked={prefs.exportIncludeImprovements}
              onChange={(v) => applyPrefs({ exportIncludeImprovements: v })}
            />
            <PrefToggle
              label="导出薄弱知识点标签"
              hint="包含知识点/能力标签汇总。"
              checked={prefs.exportIncludeWeakTags}
              onChange={(v) => applyPrefs({ exportIncludeWeakTags: v })}
            />
          </PrefSection>

          <button
            type="button"
            onClick={resetPrefs}
            className="mt-10 w-full rounded-xl border border-black/[0.1] bg-white px-4 py-3 text-caption font-bold text-ink-muted transition hover:bg-black/[0.03]"
          >
            恢复全部默认偏好
          </button>
        </div>
      </main>
    </div>
  );
}
