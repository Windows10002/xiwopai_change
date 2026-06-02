/**
 * 用户偏好（纯前端 localStorage），与账号会话分离。
 */

import type { ExportDimensionFilter, ExportFilterOptions } from "@/lib/exportGrading";
import { applyGlassThemeToDom, clampGlassOpacity, GLASS_OPACITY_DEFAULT } from "@/lib/glassTheme";

export type InsightTabPref = "summary" | "strengths" | "improve";

export type UserPreferences = {
  reduceMotion: boolean;
  largerText: boolean;
  showHomeFabHelp: boolean;
  showGradingFabHelp: boolean;
  /** 数学批改：预览图右侧叠对/错标记 */
  showMathPaperMarks: boolean;
  /** 分项较多时默认收起列表 */
  compactDimensionList: boolean;
  /** 分项行显示「判题有误」与顶栏「整卷反馈」 */
  showQuestionFeedback: boolean;
  /** 打开新批改结果时默认选中的总评 Tab */
  defaultInsightTab: InsightTabPref;
  /** 选图弹窗记住并预填年级/备注，确认后写回偏好 */
  rememberGradingContext: boolean;
  defaultGradeLevel: string;
  defaultTeacherNote: string;
  exportDimensions: ExportDimensionFilter;
  exportIncludeSummary: boolean;
  exportIncludeStrengths: boolean;
  exportIncludeImprovements: boolean;
  exportIncludeWeakTags: boolean;
  exportIncludeLearningReport: boolean;
  exportIncludeVariants: boolean;
  /** 毛玻璃面板浓淡：0 更透，100 更实 */
  glassOpacity: number;
};

const STORAGE_KEY = "seewo_pi_user_prefs_v2";

export const APP_PREFS_CHANGED = "seewo-pi-prefs-changed";

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  reduceMotion: false,
  largerText: false,
  showHomeFabHelp: true,
  showGradingFabHelp: true,
  showMathPaperMarks: true,
  compactDimensionList: false,
  showQuestionFeedback: true,
  defaultInsightTab: "summary",
  rememberGradingContext: true,
  defaultGradeLevel: "",
  defaultTeacherNote: "",
  exportDimensions: "all",
  exportIncludeSummary: true,
  exportIncludeStrengths: true,
  exportIncludeImprovements: true,
  exportIncludeWeakTags: true,
  exportIncludeLearningReport: true,
  exportIncludeVariants: true,
  glassOpacity: GLASS_OPACITY_DEFAULT,
};

function emitPrefsChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(APP_PREFS_CHANGED));
  }
}

function parseInsightTab(v: unknown): InsightTabPref {
  if (v === "strengths" || v === "improve") return v;
  return "summary";
}

function parseExportDimensions(v: unknown): ExportDimensionFilter {
  if (v === "errors" || v === "correct") return v;
  return "all";
}

function normalizePartial(o: Partial<UserPreferences> | Record<string, unknown>): UserPreferences {
  const d = DEFAULT_USER_PREFERENCES;
  return {
    reduceMotion: Boolean(o.reduceMotion ?? d.reduceMotion),
    largerText: Boolean(o.largerText ?? d.largerText),
    showHomeFabHelp: o.showHomeFabHelp !== false,
    showGradingFabHelp: o.showGradingFabHelp !== false,
    showMathPaperMarks: o.showMathPaperMarks !== false,
    compactDimensionList: Boolean(o.compactDimensionList),
    showQuestionFeedback: o.showQuestionFeedback !== false,
    defaultInsightTab: parseInsightTab(o.defaultInsightTab),
    rememberGradingContext: o.rememberGradingContext !== false,
    defaultGradeLevel: typeof o.defaultGradeLevel === "string" ? o.defaultGradeLevel : d.defaultGradeLevel,
    defaultTeacherNote: typeof o.defaultTeacherNote === "string" ? o.defaultTeacherNote.slice(0, 800) : d.defaultTeacherNote,
    exportDimensions: parseExportDimensions(o.exportDimensions),
    exportIncludeSummary: o.exportIncludeSummary !== false,
    exportIncludeStrengths: o.exportIncludeStrengths !== false,
    exportIncludeImprovements: o.exportIncludeImprovements !== false,
    exportIncludeWeakTags: o.exportIncludeWeakTags !== false,
    exportIncludeLearningReport: o.exportIncludeLearningReport !== false,
    exportIncludeVariants: o.exportIncludeVariants !== false,
    glassOpacity: clampGlassOpacity(Number(o.glassOpacity ?? d.glassOpacity)),
  };
}

export function loadUserPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_USER_PREFERENCES };
    return normalizePartial(JSON.parse(raw) as Partial<UserPreferences>);
  } catch {
    return { ...DEFAULT_USER_PREFERENCES };
  }
}

export function saveUserPreferences(next: Partial<UserPreferences>): UserPreferences {
  const merged = normalizePartial({ ...loadUserPreferences(), ...next });
  if (typeof merged.defaultTeacherNote === "string") {
    merged.defaultTeacherNote = merged.defaultTeacherNote.slice(0, 800);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  syncUserPreferencesToDom(merged);
  emitPrefsChanged();
  return merged;
}

export function syncUserPreferencesToDom(p: UserPreferences): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("pref-reduce-motion", p.reduceMotion);
  document.documentElement.classList.toggle("pref-large-text", p.largerText);
  applyGlassThemeToDom(p.glassOpacity);
}

export function exportFilterFromPreferences(p?: UserPreferences): ExportFilterOptions {
  const prefs = p ?? loadUserPreferences();
  return {
    dimensions: prefs.exportDimensions,
    includeSummary: prefs.exportIncludeSummary,
    includeStrengths: prefs.exportIncludeStrengths,
    includeImprovements: prefs.exportIncludeImprovements,
    includeWeakTags: prefs.exportIncludeWeakTags,
    includeLearningReport: prefs.exportIncludeLearningReport,
    includeVariants: prefs.exportIncludeVariants,
  };
}
