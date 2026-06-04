import type { WrongBookItem } from "@/lib/wrongQuestionBook";
import { subjectLabelCn } from "@/lib/gradeSubject";
import { appendUserMessage, type PiChatMessage } from "@/lib/piAssistant/piAssistantEngine";
import { searchPiHelp } from "@/lib/piAssistant/piHelpCatalog";

export type PiTutorContext = {
  selected?: WrongBookItem | null;
  recentItems?: WrongBookItem[];
};

function id() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function formatWrongBookForLlm(item: WrongBookItem): string {
  const tags = item.weakKnowledgeTags.length ? item.weakKnowledgeTags.join("、") : "无";
  return [
    `学科：${subjectLabelCn(item.subject)}`,
    `题目：${item.questionLabel}`,
    `状态：${item.status}`,
    `得分：${item.scoreText}`,
    `来源：${item.groupName ?? item.fileName}`,
    item.detail ? `错因/评语：${item.detail}` : "",
    `薄弱知识点：${tags}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPiTutorWelcome(ctx: PiTutorContext): PiChatMessage {
  const count = ctx.recentItems?.length ?? 0;
  const sel = ctx.selected;
  let text =
    "你好，我是 π 助学。可以帮你分析错题本里的题目、讲解不会的知识点，也可以直接提问。\n\n" +
    (count > 0
      ? `左侧有 ${count} 道最近错题，点选后我可以结合批改评语帮你分析。`
      : "完成批改后错题会自动收录；你也可以直接输入不会的题目。");

  if (sel) {
    text += `\n\n【当前选中】${subjectLabelCn(sel.subject)} · ${sel.questionLabel}`;
  }

  return {
    id: id(),
    role: "assistant",
    text,
    actions: [{ label: "打开错题本", to: "/wrong-book" }],
  };
}

function analyzeWrongItem(item: WrongBookItem): string {
  const subject = subjectLabelCn(item.subject);
  const lines = [
    `【${subject} · ${item.questionLabel}】`,
    `批改标记：${item.status}，得分 ${item.scoreText}。`,
  ];
  if (item.detail?.trim()) {
    lines.push(`评语要点：${item.detail.trim()}`);
  }
  if (item.weakKnowledgeTags.length) {
    lines.push(`薄弱点：${item.weakKnowledgeTags.join("、")}。`);
  }
  lines.push(
    "",
    "可以这样订正：",
    "1. 对照评语，找出是概念不清、计算失误还是未作答；",
    "2. 在草稿纸重做一次，写清关键步骤；",
    "3. 订正后在错题本点「已订正」，方便复习。",
  );
  if (item.subject === "math") {
    lines.push("4. 数学建议：先写公式/定理，再代入计算，最后验算。");
  } else if (item.subject === "english") {
    lines.push("4. 英语建议：检查语法、拼写与句型，对照范文积累好句。");
  } else {
    lines.push("4. 语文建议：注意字词书写、要点概括与规范表述。");
  }
  return lines.join("\n");
}

function summarizeWeakTrend(items: WrongBookItem[]): string {
  if (!items.length) return "暂无错题记录，完成批改后会自动收录。";
  const bySubject = { math: 0, english: 0, chinese: 0 };
  for (const i of items) bySubject[i.subject] += 1;
  const parts = [
    bySubject.math ? `数学 ${bySubject.math} 道` : "",
    bySubject.english ? `英语 ${bySubject.english} 道` : "",
    bySubject.chinese ? `语文 ${bySubject.chinese} 道` : "",
  ].filter(Boolean);
  return `最近错题共 ${items.length} 道（${parts.join("、")}）。建议优先订正「错误」题，再练同类变式。`;
}

export function buildPiTutorReply(userText: string, ctx: PiTutorContext): PiChatMessage {
  const q = userText.trim();
  if (!q) {
    return buildPiTutorWelcome(ctx);
  }

  const wantsAnalysis = /分析|为什么|错因|讲解|解释|怎么做|不会|不懂|帮我看|这题/.test(q);
  const wantsTrend = /薄弱|趋势|汇总|多少道|整体/.test(q);

  if (wantsTrend && ctx.recentItems?.length) {
    return {
      id: id(),
      role: "assistant",
      text: summarizeWeakTrend(ctx.recentItems),
      actions: [{ label: "打开错题本", to: "/wrong-book" }],
    };
  }

  if (ctx.selected && (wantsAnalysis || /当前|这道|这题|选中/.test(q))) {
    return {
      id: id(),
      role: "assistant",
      text: analyzeWrongItem(ctx.selected),
    };
  }

  if (wantsAnalysis && !ctx.selected && ctx.recentItems?.length) {
    return {
      id: id(),
      role: "assistant",
      text: "请先在左侧点选一道错题，我再结合批改评语帮你分析。也可以直接描述题目内容提问。",
    };
  }

  const help = searchPiHelp(q);
  if (help) {
    return { id: id(), role: "assistant", text: `【${help.title}】\n${help.body}` };
  }

  if (/^(你好|您好|hi)/i.test(q)) {
    return buildPiTutorWelcome(ctx);
  }

  return {
    id: id(),
    role: "assistant",
    text:
      `关于「${q}」：\n` +
      "1. 若是错题本里的题，请在左侧选中后说「分析这道题」；\n" +
      "2. 若是课本/练习上的题，请尽量说明学科、题号和你的思路，我会分步讲解；\n" +
      "3. 切换到「智能问答」模式可获得更详细的讲解（需配置 Agnes API）。\n\n" +
      (ctx.selected
        ? `当前已选：${ctx.selected.questionLabel}。可以说「分析当前错题」。`
        : "也可以问「我的薄弱点有哪些」查看错题概况。"),
  };
}

export { appendUserMessage };
