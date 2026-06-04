/** 学情中心工作台：侧栏视图（URL `?tab=`） */
export const CLASS_ANALYTICS_VIEWS = {
  history: {
    tab: "history",
    label: "批改历史",
    description: "查阅单条批改记录",
  },
  batch: {
    tab: "batch",
    label: "单次学情",
    description: "按每次上传或文件夹汇总",
  },
  class: {
    tab: "class",
    label: "班级学情",
    description: "班级整体趋势与维度",
  },
  student: {
    tab: "student",
    label: "学生学情",
    description: "按学生查看个体表现",
  },
  weak: {
    tab: "weak",
    label: "薄弱趋势",
    description: "薄弱知识点出现频次",
  },
} as const;

export const CLASS_ANALYTICS_MODULE = {
  title: "学情中心",
  subtitle: "本机批改学情 · 正式任务请用作业管理",
} as const;

/** 侧栏 Tab 顺序 */
export const CLASS_ANALYTICS_TAB_ORDER = [
  "history",
  "batch",
  "class",
  "student",
  "weak",
] as const satisfies readonly ClassAnalyticsTab[];

export type ClassAnalyticsTab = keyof typeof CLASS_ANALYTICS_VIEWS;

const LAST_TAB_KEY = "seewo_pi_class_analytics_last_tab_v1";

export function rememberClassAnalyticsTab(tab: ClassAnalyticsTab): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(LAST_TAB_KEY, tab);
  } catch {
    /* ignore */
  }
}

export function parseClassAnalyticsTab(tabParam: string | null): ClassAnalyticsTab {
  if (tabParam && tabParam in CLASS_ANALYTICS_VIEWS) return tabParam as ClassAnalyticsTab;
  if (typeof sessionStorage !== "undefined") {
    try {
      const stored = sessionStorage.getItem(LAST_TAB_KEY);
      if (stored && stored in CLASS_ANALYTICS_VIEWS) return stored as ClassAnalyticsTab;
    } catch {
      /* ignore */
    }
  }
  return "class";
}

export function classAnalyticsMobileTitle(tab: ClassAnalyticsTab): string {
  return CLASS_ANALYTICS_VIEWS[tab].label;
}

/** 支持学科筛选与导出简报的视图 */
export function tabUsesAnalyticsToolbar(tab: ClassAnalyticsTab): boolean {
  return tab !== "history";
}
