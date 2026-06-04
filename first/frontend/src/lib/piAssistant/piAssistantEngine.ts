import type { AppSession } from "@/lib/appSession";
import { matchPiFeature, listPiQuickNav, type PiNavAction } from "@/lib/piAssistant/piFeatureMap";
import { searchPiHelp } from "@/lib/piAssistant/piHelpCatalog";
import { resolvePiPathContext } from "@/lib/piAssistant/piPathContext";

type PiRole = AppSession["role"] | null;

export type PiChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  actions?: PiNavAction[];
  /** 规则 / 大模型；pending 为加载占位 */
  source?: "rules" | "llm" | "pending";
};

function id() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

/** 产品反馈（π 表单），优先于功能导航里的「反馈」类关键词 */
export function isProductFeedbackIntent(q: string) {
  return /^(反馈|建议|投诉|意见)$|产品反馈|提交反馈|bug|缺陷/i.test(q.trim());
}

function isGreeting(q: string) {
  return /^(你好|您好|hi|hello|π|派).{0,6}$/i.test(q.trim());
}

function isNavIntent(q: string) {
  return /在哪|哪里|怎么找|入口|打开|前往|怎么去/.test(q);
}

function roleLabel(role: PiRole) {
  if (role === "teacher") return "教师";
  if (role === "student") return "学生";
  if (role === "parent") return "家长";
  if (role === "admin") return "教务";
  return "用户";
}

function pathContextBlock(pathname: string): string {
  const ctx = resolvePiPathContext(pathname);
  if (!ctx) return "";
  const tips = ctx.pageTips.map((t) => `· ${t}`).join("\n");
  return `\n\n【当前页面：${ctx.pageLabel}】\n${ctx.welcomeLine}\n${tips}`;
}

export function buildPiWelcome(role: PiRole, pathname = "/"): PiChatMessage {
  const ctx = resolvePiPathContext(pathname);
  const base = `你好，我是 π 助手。可以帮你找功能、解答使用问题，或把建议反馈给开发团队（当前身份：${roleLabel(role)}端）。`;
  const pageBit = ctx ? `\n${ctx.welcomeLine}` : "";
  return {
    id: id(),
    role: "assistant",
    text: base + pageBit,
    actions: listPiQuickNav(role, pathname),
  };
}

export function buildPiReply(userText: string, role: PiRole, pathname = "/"): PiChatMessage {
  const q = userText.trim();
  if (!q) {
    return {
      id: id(),
      role: "assistant",
      text: "请输入问题，或点击下方快捷入口。",
      actions: listPiQuickNav(role, pathname),
    };
  }

  if (isGreeting(q)) {
    const ctx = resolvePiPathContext(pathname);
    const hint = ctx ? `你现在在${ctx.pageLabel}，需要找哪个功能，还是想了解怎么用？` : "需要找哪个功能，还是想了解怎么用？";
    return {
      id: id(),
      role: "assistant",
      text: `你好呀！${hint}也可以直接说「反馈」提交建议。`,
      actions: listPiQuickNav(role, pathname),
    };
  }

  if (isProductFeedbackIntent(q)) {
    return {
      id: id(),
      role: "assistant",
      text: "感谢愿意反馈！请在下方的反馈表单中填写类型与描述（选填联系方式），提交后会保存到服务器；教师/教务可在「产品反馈」看板查看与导出。",
    };
  }

  const feature = matchPiFeature(q, role, pathname);
  if (feature) {
    const steps = feature.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
    const actions: PiNavAction[] = feature.to ? [{ label: `前往${feature.title}`, to: feature.to }] : [];
    const onPage =
      feature.to && (pathname === feature.to || pathname.startsWith(`${feature.to}/`))
        ? "\n（你已在相关页面，可按上述步骤操作。）"
        : "";
    return {
      id: id(),
      role: "assistant",
      text: `【${feature.title}】\n${steps}${onPage}`,
      actions,
    };
  }

  const help = searchPiHelp(q);
  if (help) {
    return {
      id: id(),
      role: "assistant",
      text: `【${help.title}】\n${help.body}${pathContextBlock(pathname)}`,
    };
  }

  if (isNavIntent(q)) {
    return {
      id: id(),
      role: "assistant",
      text: `没匹配到具体名称，这些入口最常用：${pathContextBlock(pathname) || "\n· 作业管理 · 学情中心 · 待办/我的作业"}`,
      actions: listPiQuickNav(role, pathname),
    };
  }

  const ctx = resolvePiPathContext(pathname);
  const fallback = ctx
    ? `暂未匹配到「${q}」。在${ctx.pageLabel}你可以：\n${ctx.pageTips.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n也可以说「作业管理」「学情」「反馈」等。`
    : "暂未匹配到具体功能。你可以试试：\n· 说「作业管理」「学情中心」「待办」等找入口\n· 说「拍照」「导出」等查使用说明\n· 说「反馈」提交建议给开发者";

  return {
    id: id(),
    role: "assistant",
    text: fallback,
    actions: listPiQuickNav(role, pathname),
  };
}

export function appendUserMessage(text: string): PiChatMessage {
  return { id: id(), role: "user", text: text.trim() };
}
