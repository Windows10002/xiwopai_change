import { type ReactNode } from "react";
import { MathPrettyText } from "@/components/atoms/MathPrettyText";
import { normalizeLearningReportMarkdown } from "@/lib/learningReportFormat";

function renderInline(text: string, keyPrefix: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const bold = /^\*\*(.+)\*\*$/.exec(part);
    if (bold) {
      return (
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-ink">
          {bold[1]}
        </strong>
      );
    }
    if (!part) return null;
    return <MathPrettyText key={`${keyPrefix}-t-${i}`} text={part} />;
  });
}

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

function parseBlocks(text: string): Block[] {
  const lines = normalizeLearningReportMarkdown(text).split("\n");
  const blocks: Block[] = [];
  let ul: string[] = [];
  let ol: string[] = [];

  const flushLists = () => {
    if (ul.length) {
      blocks.push({ type: "ul", items: ul });
      ul = [];
    }
    if (ol.length) {
      blocks.push({ type: "ol", items: ol });
      ol = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushLists();
      continue;
    }

    const heading = /^#{1,3}\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushLists();
      blocks.push({ type: "heading", text: heading[1]!.replace(/\*\*/g, "") });
      continue;
    }

    const ulItem = /^[-*•]\s+(.+)$/.exec(trimmed);
    if (ulItem) {
      if (ol.length) {
        blocks.push({ type: "ol", items: ol });
        ol = [];
      }
      ul.push(ulItem[1]!);
      continue;
    }

    const olItem = /^\d+[.)]\s+(.+)$/.exec(trimmed);
    if (olItem) {
      if (ul.length) {
        blocks.push({ type: "ul", items: ul });
        ul = [];
      }
      ol.push(olItem[1]!);
      continue;
    }

    flushLists();
    blocks.push({ type: "paragraph", text: trimmed });
  }

  flushLists();
  return blocks;
}

/** 学情报告正文：标题/段落/列表排版，不展示原始 #、** 等 Markdown 符号 */
export function LearningReportBody({ text, className }: { text: string; className?: string }) {
  if (!text.trim()) return null;
  const blocks = parseBlocks(text);

  return (
    <div className={`space-y-3 text-small leading-relaxed text-ink-muted [text-wrap:pretty] ${className ?? ""}`}>
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h3 key={i} className="pt-1 text-small font-extrabold text-[#006D41]">
              {block.text}
            </h3>
          );
        }
        if (block.type === "paragraph") {
          return (
            <p key={i} className="text-ink-muted">
              {renderInline(block.text, `p-${i}`)}
            </p>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5 text-ink-muted">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item, `ul-${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <ol key={i} className="list-decimal space-y-1.5 pl-5 text-ink-muted">
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item, `ol-${i}-${j}`)}</li>
            ))}
          </ol>
        );
      })}
    </div>
  );
}
