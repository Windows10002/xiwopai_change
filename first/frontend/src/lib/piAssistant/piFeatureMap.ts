import type { AppSession } from "@/lib/appSession";
import { pathBoostForFeature } from "@/lib/piAssistant/piPathContext";

type PiRole = AppSession["role"] | null;

export type PiNavAction = { label: string; to: string };

export type PiFeatureEntry = {
  keywords: string[];
  title: string;
  steps: string[];
  to?: string;
};

const TEACHER_FEATURES: PiFeatureEntry[] = [
  {
    keywords: ["作业", "任务", "发布", "考试", "试卷", "收发", "课堂测验", "发卷", "删作业", "删除作业", "成绩"],
    title: "作业管理",
    steps: ["顶栏点「作业」", "可发布日常作业或课堂考试", "卡片「⋯」可编辑、删除（有提交需确认）、查看成绩"],
    to: "/workspace",
  },
  {
    keywords: ["学情", "分析", "薄弱", "简报", "历史", "班级", "批改历史", "趋势", "单次学情"],
    title: "学情中心",
    steps: ["顶栏点「学情」", "批改历史可编辑/删除单条记录", "班级/学生学情与薄弱趋势在对应 Tab", "发布作业请用「作业管理」"],
    to: "/class-analytics",
  },
  {
    keywords: ["批改", "数学", "英语", "语文", "拍照", "上传", "开始批改"],
    title: "开始批改",
    steps: ["首页选择学科卡片，或顶栏「批改」进入数学页", "上传作业照片后点「开始批改」", "支持选择文件夹批量批改"],
    to: "/math",
  },
  {
    keywords: ["申诉", "异议", "学生申诉"],
    title: "学生申诉",
    steps: ["首页「学生申诉」或顶栏「更多」", "处理学生发起的判题异议"],
    to: "/disputes",
  },
  {
    keywords: ["判题反馈", "判题异议", "模型反馈", "教师反馈"],
    title: "判题反馈",
    steps: ["首页或「更多」进入「判题反馈」", "汇总教师提交的判题异议，用于优化模型"],
    to: "/feedback-dashboard",
  },
  {
    keywords: ["产品反馈", "π助手", "用户建议", "产品看板", "助手反馈"],
    title: "产品反馈",
    steps: ["进入「产品反馈」看板", "可筛选 π 助手提交的建议/Bug", "支持导出 CSV / JSONL"],
    to: "/product-feedback",
  },
  {
    keywords: ["设置", "名册", "导出", "偏好"],
    title: "设置",
    steps: ["右上角齿轮进入设置", "维护学生名册、导出偏好、界面与助手开关"],
    to: "/settings",
  },
];

const STUDENT_FEATURES: PiFeatureEntry[] = [
  {
    keywords: ["待办", "交作业", "提交", "上传作业", "下发"],
    title: "待办任务",
    steps: ["顶栏「待办」", "填写与名册一致的姓名", "选择任务后上传作业照片"],
    to: "/todo",
  },
  {
    keywords: ["作业", "成绩", "结果", "我的作业", "批改结果"],
    title: "我的作业",
    steps: ["顶栏「我的作业」", "查看教师下发的任务与批改结果", "可对结果发起申诉"],
    to: "/my-work",
  },
  {
    keywords: ["错题", "错题本", "订正"],
    title: "错题本",
    steps: ["顶栏「错题本」", "自动收录批改错题", "可标记订正状态"],
    to: "/wrong-book",
  },
  {
    keywords: ["申诉", "异议", "判题"],
    title: "判题申诉",
    steps: ["在「我的作业」打开已批改任务", "对有疑问的题目提交申诉", "等待教师处理"],
    to: "/my-work",
  },
  {
    keywords: ["批改", "数学", "拍照", "自助", "方程"],
    title: "数学自助批改",
    steps: ["首页点「数学作业」或顶栏进入", "上传照片后点「开始批改」", "错题会进入错题本"],
    to: "/math",
  },
  {
    keywords: ["批改", "英语", "作文", "自助"],
    title: "英语自助批改",
    steps: ["首页点「英语作业」", "上传作文或作业照片", "查看多维评分与评语"],
    to: "/english",
  },
  {
    keywords: ["批改", "语文", "字词", "阅读", "自助"],
    title: "语文自助批改",
    steps: ["首页点「语文作业」", "上传作业照片开始批改", "关注书写与阅读维度"],
    to: "/chinese",
  },
  {
    keywords: ["设置", "姓名", "偏好", "助手"],
    title: "设置",
    steps: ["右上角齿轮进入设置", "填写与教师一致的姓名", "可切换 π 助手规则/智能问答"],
    to: "/settings",
  },
  {
    keywords: ["奖励", "徽章", "兑换", "积分", "π奖励"],
    title: "π 奖励",
    steps: ["首页或顶栏进入「π 奖励」", "完成作业按准确率获得徽章", "用积分兑换虚拟好礼"],
    to: "/rewards",
  },
  {
    keywords: ["助学", "分析", "错题分析", "讲解", "不会", "π助学", "辅导", "问π"],
    title: "π 助学",
    steps: ["首页「π 助学」或顶栏入口", "左侧选错题可分析错因", "右侧提问不会的题，可切智能问答"],
    to: "/pi-tutor",
  },
];

const PARENT_FEATURES: PiFeatureEntry[] = [
  {
    keywords: ["任务", "答案", "参考", "课堂", "孩子作业"],
    title: "孩子课堂任务",
    steps: ["家长端首页查看教师布置的任务", "可对照参考答案（无需交卷）"],
    to: "/",
  },
  {
    keywords: ["代拍", "批改", "拍照", "代孩子"],
    title: "代孩子批改",
    steps: ["首页选择学科进行代拍批改", "填写孩子姓名便于学情区分"],
    to: "/math",
  },
  {
    keywords: ["学情", "摘要", "成绩"],
    title: "孩子学情",
    steps: ["家长首页可查看本机学情摘要", "详细分析以教师端学情中心为准"],
    to: "/",
  },
];

const ADMIN_FEATURES: PiFeatureEntry[] = [
  {
    keywords: ["全校", "任务", "总览", "作业", "督导"],
    title: "全校任务总览",
    steps: ["首页「作业总览」或顶栏「作业」", "与教师端作业管理数据同步"],
    to: "/workspace",
  },
  {
    keywords: ["学情", "质检", "抽检"],
    title: "学情中心",
    steps: ["进入学情中心查看本机批改汇总", "可抽检各学科批改页"],
    to: "/class-analytics",
  },
  {
    keywords: ["判题反馈", "模型", "异议汇总"],
    title: "判题反馈",
    steps: ["查看教师判题异议汇总", "用于模型优化线索"],
    to: "/feedback-dashboard",
  },
  {
    keywords: ["产品反馈", "π", "助手", "用户建议", "bug", "导出"],
    title: "产品反馈",
    steps: ["「产品反馈」看板筛选用户建议", "可导出 CSV / JSONL 给开发同学"],
    to: "/product-feedback",
  },
  {
    keywords: ["设置", "名册", "系统"],
    title: "系统设置",
    steps: ["进入设置维护名册与导出选项", "处理申诉相关配置"],
    to: "/settings",
  },
];

const BY_ROLE: Record<string, PiFeatureEntry[]> = {
  teacher: TEACHER_FEATURES,
  student: STUDENT_FEATURES,
  parent: PARENT_FEATURES,
  admin: ADMIN_FEATURES,
};

export function matchPiFeature(query: string, role: PiRole, pathname = "/"): PiFeatureEntry | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const list = (role && BY_ROLE[role]) ?? TEACHER_FEATURES;
  let best: PiFeatureEntry | null = null;
  let bestScore = 0;
  for (const f of list) {
    let score = pathBoostForFeature(f.to, pathname);
    for (const kw of f.keywords) {
      if (q.includes(kw.toLowerCase())) score += kw.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = f;
    }
  }
  return bestScore > 0 ? best : null;
}

export function listPiQuickNav(role: PiRole, pathname = "/"): PiNavAction[] {
  const list = (role && BY_ROLE[role]) ?? TEACHER_FEATURES;
  const withRoute = list.filter((f) => f.to);
  const onPage = withRoute.find((f) => pathBoostForFeature(f.to, pathname) > 0);
  const rest = withRoute.filter((f) => f !== onPage);
  const ordered = onPage ? [onPage, ...rest] : withRoute;
  return ordered.slice(0, 4).map((f) => ({ label: f.title, to: f.to! }));
}
