import type { GradingResultDetail } from "@/types/grading";

export type ScoringStrategySection = {
  key: string;
  title: string;
  bullets: string[];
};

export type ScoringStrategyModel =
  | {
      subject: "math";
      headline: string;
      stats: {
        pct: number;
        total: number;
        ok: number;
        half: number;
        bad: number;
        /** 「正确」状态条数 ÷ 分项条数，与加权得分率不是同一算法 */
        statusCorrectSharePct: number | null;
      };
      sections: ScoringStrategySection[];
    }
  | {
      subject: "english";
      headline: string;
      pct: number;
      sections: ScoringStrategySection[];
    };

/** 结构化给分策略（弹窗富展示与纯文本共用数据源） */
export function buildScoringStrategyModel(subject: "math" | "english", detail: GradingResultDetail): ScoringStrategyModel {
  const pct = detail.scorePercent;
  const dims = detail.dimensions ?? [];

  if (subject === "math") {
    const ok = dims.filter((d) => d.status === "正确").length;
    const half = dims.filter((d) => d.status === "过程不规范").length;
    const bad = dims.filter((d) => d.status === "错误" || d.status === "未作答").length;
    const total = dims.length;
    const statusCorrectSharePct =
      total > 0 ? Math.min(100, Math.max(0, Math.round((ok / total) * 1000) / 10)) : null;
    return {
      subject: "math",
      headline: "数学 · 给分策略说明",
      stats: { pct, total, ok, half, bad, statusCorrectSharePct },
      sections: [
        {
          key: "output",
          title: "模型输出",
          bullets: [
            "每道题由大模型结合图片 OCR 给出过程分(0–6)、结果分(0–3)、规范分(0–1)，并映射为右侧「0–10」条形得分。",
            "系统会做本地算术复核：等号链不成立、仅抄题干、串题等情况会收紧或归零。",
          ],
        },
        {
          key: "stats",
          title: "本题统计（按分项状态粗算）",
          bullets: [
            `分项条数：${dims.length}；判定为「正确」约 ${ok} 条、「过程不规范」约 ${half} 条、「错误/未作答」约 ${bad} 条。`,
            `加权得分率：${pct}%（各题 0–10 分折算后与首页一致；错题也可能有部分过程分，故不必等于「正确条数÷总条数」）。`,
            statusCorrectSharePct != null
              ? `若按「正确」状态条数粗算占比：约 ${statusCorrectSharePct}%（${ok}/${total}），仅作参考，与上一行加权率可能不同。`
              : "",
          ].filter(Boolean),
        },
        {
          key: "rules",
          title: "常见扣分点（与提示词一致）",
          bullets: [
            "未写、只抄原题无有效变形：过程/结果/规范均为 0。",
            "纯算术脱式：第一个等号即不成立，或第一步左侧已与题干整体数值不符，后续不再给过程分。",
            "含未知数/配方/开方±/多根的方程类书写：不做「相邻两步纯数字验算」的机械否决（与后端一致）。",
            "中间某步才错：仅错误发生前的步骤可酌情给过程分。",
          ],
        },
      ],
    };
  }

  return {
    subject: "english",
    headline: "英语作文 · 给分策略说明",
    pct,
    sections: [
      {
        key: "dims",
        title: "维度",
        bullets: ["内容、语言、结构三项独立计分，再折算为综合得分率。"],
      },
      {
        key: "this",
        title: "本次",
        bullets: [`综合得分率：${pct}%。`, "亮点与订正来自模型对原文的逐条反馈。"],
      },
    ],
  };
}

/** 纯文本版（导出、无障碍朗读或与旧逻辑兼容） */
export function buildScoringStrategyDetail(
  subject: "math" | "english" | "chinese",
  detail: GradingResultDetail,
): string {
  const pipeline = subject === "english" ? "english" : "math";
  const m = buildScoringStrategyModel(pipeline, detail);
  const roman = ["一", "二", "三", "四"] as const;
  if (m.subject === "math") {
    const lines = [`【${m.headline}】`, ""];
    m.sections.forEach((sec, i) => {
      lines.push(`${roman[i] ?? String(i + 1)}、${sec.title}`);
      sec.bullets.forEach((b) => lines.push(`· ${b}`));
      lines.push("");
    });
    return lines.join("\n").trimEnd();
  }
  const lines = [`【${m.headline}】`, ""];
  m.sections.forEach((sec, i) => {
    lines.push(`${roman[i] ?? String(i + 1)}、${sec.title}`);
    sec.bullets.forEach((b) => lines.push(`· ${b}`));
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}
