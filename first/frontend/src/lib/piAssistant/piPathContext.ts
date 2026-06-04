/** 根据当前路由为 π 助手提供页面上下文（欢迎语、功能匹配加权） */

export type PiPathContext = {
  pageLabel: string;
  welcomeLine: string;
  /** 与 PiFeatureEntry.to 对齐，用于提升本页相关功能匹配分 */
  routePrefix: string;
  /** 在本页可回答的快捷提示 */
  pageTips: string[];
};

const PATH_CONTEXTS: PiPathContext[] = [
  {
    routePrefix: "/workspace",
    pageLabel: "作业管理",
    welcomeLine: "你正在作业管理页，可发布日常作业/考试、查看提交与成绩。",
    pageTips: ["发布任务在右上角", "有学生提交也可删除任务（需二次确认）", "其它标签页未更新时可切换窗口刷新"],
  },
  {
    routePrefix: "/class-analytics",
    pageLabel: "学情中心",
    welcomeLine: "你正在学情中心，可查看批改历史、班级/学生学情与薄弱趋势。",
    pageTips: ["批改历史支持按学科筛选与删除", "发布作业请前往作业管理", "数据主要来自本机批改记录"],
  },
  {
    routePrefix: "/feedback-dashboard",
    pageLabel: "判题反馈",
    welcomeLine: "你正在判题反馈页，可查看教师提交的判题异议汇总。",
    pageTips: ["产品建议请用 π 助手「反馈建议」或「产品反馈」看板"],
  },
  {
    routePrefix: "/product-feedback",
    pageLabel: "产品反馈",
    welcomeLine: "你正在产品反馈看板，可筛选、导出 π 助手收集的用户建议。",
    pageTips: ["支持 CSV / JSONL 导出", "可按类型、身份、页面路径筛选"],
  },
  {
    routePrefix: "/todo",
    pageLabel: "待办任务",
    welcomeLine: "你正在待办页，选择教师下发的任务并上传作业。",
    pageTips: ["提交前请填写与教师名册一致的姓名", "支持多张图片上传"],
  },
  {
    routePrefix: "/my-work",
    pageLabel: "我的作业",
    welcomeLine: "你正在我的作业页，可查看已提交任务与批改结果。",
    pageTips: ["待教师批改的任务会显示为进行中", "可进入详情查看分数与评语"],
  },
  {
    routePrefix: "/wrong-book",
    pageLabel: "错题本",
    welcomeLine: "你正在错题本，可复习批改中收录的错题。",
    pageTips: ["批改完成后错题会自动收录", "可标记已订正"],
  },
  {
    routePrefix: "/rewards",
    pageLabel: "π 奖励",
    welcomeLine: "你正在奖励页，可查看已获得的 IP 徽章并用积分兑换好礼。",
    pageTips: ["作业准确率越高徽章越多", "集齐徽章可解锁高级兑换", "数据保存在本机浏览器"],
  },
  {
    routePrefix: "/pi-tutor",
    pageLabel: "π 助学",
    welcomeLine: "你正在 π 助学，可选错题分析或提问不会的题。",
    pageTips: ["左侧点选错题后说「分析当前错题」", "可切换智能问答获得更详细讲解", "讲解仅供参考，以教师评语为准"],
  },
  {
    routePrefix: "/disputes",
    pageLabel: "学生申诉",
    welcomeLine: "你正在申诉处理页，可审核学生发起的判题异议。",
    pageTips: ["学生端在批改结果中提交申诉", "处理后学生可在我的作业中查看"],
  },
  {
    routePrefix: "/settings",
    pageLabel: "设置",
    welcomeLine: "你正在设置页，可调整界面偏好与助手模式。",
    pageTips: ["学生请填写与教师名册一致的姓名", "可开关首页 π 助手悬浮按钮"],
  },
  {
    routePrefix: "/math",
    pageLabel: "数学批改",
    welcomeLine: "你正在数学批改页，上传作业照片后开始批改。",
    pageTips: ["尽量正对纸张、避免强反光", "支持文件夹批量批改", "完成后可导出 Word/Excel"],
  },
  {
    routePrefix: "/english",
    pageLabel: "英语批改",
    welcomeLine: "你正在英语批改页，上传作文或作业后开始批改。",
    pageTips: ["单张或文件夹批量均可", "批改结果会进入学情历史"],
  },
  {
    routePrefix: "/chinese",
    pageLabel: "语文批改",
    welcomeLine: "你正在语文批改页，上传作业后开始批改。",
    pageTips: ["关注字词、阅读与书写规范维度", "结果会记入学情批改历史"],
  },
];

export type PiPageQuickChip = { label: string; prompt: string };

const PAGE_QUICK_CHIPS: Record<string, PiPageQuickChip[]> = {
  "/workspace": [
    { label: "待审阅在哪", prompt: "待审阅在哪" },
    { label: "怎么删作业", prompt: "有学生提交怎么删作业" },
    { label: "发布作业", prompt: "怎么发布作业" },
  ],
  "/class-analytics": [
    { label: "批改历史", prompt: "批改历史怎么删除" },
    { label: "和作业区别", prompt: "学情中心和作业管理区别" },
  ],
  "/todo": [
    { label: "怎么交作业", prompt: "待办任务怎么交作业" },
    { label: "姓名要求", prompt: "提交作业姓名要和什么一致" },
  ],
  "/my-work": [
    { label: "看批改结果", prompt: "我的作业怎么看批改结果" },
    { label: "怎么申诉", prompt: "判题申诉怎么提交" },
  ],
  "/wrong-book": [
    { label: "错题来源", prompt: "错题本里的题从哪来" },
    { label: "标记订正", prompt: "错题本怎么标记订正" },
  ],
  "/rewards": [
    { label: "怎么得徽章", prompt: "怎么获得 π 徽章" },
    { label: "积分兑换", prompt: "徽章积分怎么兑换奖励" },
  ],
  "/pi-tutor": [
    { label: "分析错题", prompt: "请分析当前选中的错题" },
    { label: "薄弱点", prompt: "我的薄弱点有哪些" },
    { label: "订正建议", prompt: "这道题怎么订正" },
  ],
  "/math": [{ label: "拍照技巧", prompt: "怎么拍照上传作业" }],
  "/english": [{ label: "作文批改", prompt: "英语作文怎么批改" }],
  "/chinese": [{ label: "语文批改", prompt: "语文作业怎么批改" }],
};

const QUICK_CHIP_PREFIXES = [
  "/workspace",
  "/class-analytics",
  "/my-work",
  "/wrong-book",
  "/rewards",
  "/pi-tutor",
  "/todo",
  "/math",
  "/english",
  "/chinese",
] as const;

export function quickChipsForPath(pathname: string): PiPageQuickChip[] {
  const path = pathname.split("?")[0] ?? pathname;
  for (const prefix of QUICK_CHIP_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return PAGE_QUICK_CHIPS[prefix] ?? [];
    }
  }
  return [];
}

export function resolvePiPathContext(pathname: string): PiPathContext | null {
  const path = pathname.split("?")[0] ?? pathname;
  if (path === "/") {
    return {
      routePrefix: "/",
      pageLabel: "首页",
      welcomeLine: "你正在首页，可从学科卡片或工作台入口开始操作。",
      pageTips: ["教师：作业管理、学情中心、批改", "学生：待办、我的作业、错题本"],
    };
  }
  const sorted = [...PATH_CONTEXTS].sort((a, b) => b.routePrefix.length - a.routePrefix.length);
  for (const ctx of sorted) {
    if (path === ctx.routePrefix || path.startsWith(`${ctx.routePrefix}/`)) {
      return ctx;
    }
  }
  return null;
}

/** 当前页对应功能路由加权（避免误匹配其它入口） */
export function pathBoostForFeature(featureTo: string | undefined, pathname: string): number {
  if (!featureTo) return 0;
  const path = pathname.split("?")[0] ?? pathname;
  if (path === featureTo || path.startsWith(`${featureTo}/`)) return 12;
  if (featureTo === "/math" && /^\/(english|chinese)/.test(path)) return 0;
  if (featureTo === "/english" && path.startsWith("/english")) return 12;
  if (featureTo === "/chinese" && path.startsWith("/chinese")) return 12;
  return 0;
}
