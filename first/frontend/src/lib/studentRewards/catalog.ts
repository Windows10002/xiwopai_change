import type { GradeSubject } from "@/lib/gradeSubject";

export type BadgeTier = "bronze" | "silver" | "gold" | "special";

export type BadgeDef = {
  id: string;
  title: string;
  description: string;
  tier: BadgeTier;
  /** 兑换积分 */
  points: number;
  emoji: string;
};

export type RewardDef = {
  id: string;
  title: string;
  description: string;
  cost: number;
  emoji: string;
  /** 至少拥有多少枚徽章（不含本奖励）才可兑换 */
  minBadges?: number;
};

export const BADGE_CATALOG: BadgeDef[] = [
  { id: "first_done", title: "初识 π", description: "完成第一次作业提交或自助批改", tier: "bronze", points: 2, emoji: "🌱" },
  { id: "score_70", title: "进步新秀", description: "单次作业准确率 ≥ 70%", tier: "bronze", points: 2, emoji: "📈" },
  { id: "score_80", title: "准确达人", description: "单次作业准确率 ≥ 80%", tier: "silver", points: 3, emoji: "⭐" },
  { id: "score_90", title: "学霸之星", description: "单次作业准确率 ≥ 90%", tier: "gold", points: 5, emoji: "🌟" },
  { id: "score_100", title: "满分 π 神", description: "获得一次 100% 准确", tier: "gold", points: 8, emoji: "👑" },
  { id: "done_3", title: "连续闯关", description: "累计完成 3 次作业", tier: "silver", points: 3, emoji: "🔥" },
  { id: "done_7", title: "一周坚持", description: "累计完成 7 次作业", tier: "gold", points: 6, emoji: "💪" },
  { id: "subject_math", title: "数学小 π", description: "完成一次数学作业（≥70%）", tier: "bronze", points: 2, emoji: "🔢" },
  { id: "subject_english", title: "英语小 π", description: "完成一次英语作业（≥70%）", tier: "bronze", points: 2, emoji: "🔤" },
  { id: "subject_chinese", title: "语文小 π", description: "完成一次语文作业（≥70%）", tier: "bronze", points: 2, emoji: "📖" },
  { id: "collector_5", title: "徽章收藏家", description: "集齐 5 枚不同徽章", tier: "special", points: 5, emoji: "🎖️" },
  { id: "collector_8", title: "π 终极伙伴", description: "集齐 8 枚不同徽章", tier: "special", points: 10, emoji: "🏆" },
];

export const REWARD_CATALOG: RewardDef[] = [
  { id: "sticker", title: "π 限定贴纸", description: "虚拟校园贴纸一套，可展示在主页", cost: 6, emoji: "✨" },
  { id: "praise", title: "课堂表扬券", description: "向老师展示你的努力（演示用虚拟券）", cost: 10, emoji: "🎫", minBadges: 2 },
  { id: "avatar_frame", title: "IP 头像光环", description: "首页 IP 形象增加闪亮光环", cost: 14, emoji: "💫", minBadges: 3 },
  { id: "wrongbook_skin", title: "错题本皮肤", description: "错题本页启用薄荷绿主题皮肤", cost: 18, emoji: "📗", minBadges: 4 },
  { id: "desk_corner", title: "书桌「学霸角」", description: "解锁专属称号与首页角标", cost: 24, emoji: "🎓", minBadges: 6 },
];

export const BADGE_BY_ID = Object.fromEntries(BADGE_CATALOG.map((b) => [b.id, b])) as Record<string, BadgeDef>;
export const REWARD_BY_ID = Object.fromEntries(REWARD_CATALOG.map((r) => [r.id, r])) as Record<string, RewardDef>;

export const TIER_RING: Record<BadgeTier, string> = {
  bronze: "from-amber-600 via-amber-400 to-yellow-300",
  silver: "from-slate-500 via-slate-300 to-white",
  gold: "from-yellow-600 via-amber-400 to-yellow-200",
  special: "from-violet-600 via-fuchsia-500 to-pink-400",
};

export function subjectBadgeId(subject: GradeSubject): string {
  return `subject_${subject}`;
}
