import type { ReactNode } from "react";

/** 竖式分式（分子/分母） */
function StackedFrac({ num, den }: { num: string; den: string }) {
  return (
    <span className="mx-px inline-flex flex-col items-center align-middle text-[0.92em] leading-[1.08]">
      <span className="min-w-[0.85em] border-b border-current px-0.5 text-center font-semibold tabular-nums">{num}</span>
      <span className="min-w-[0.85em] px-0.5 text-center font-semibold tabular-nums">{den}</span>
    </span>
  );
}

const HEAD =
  /^(\d+\s+\d+\s*\/\s*\d+)|^(\d+\s*\/\s*\d+)|^\^(\([^)]+\)|\d+)|^([×÷=+\-*/()[\]{}|.,:;…\s]|[\u4e00-\u9fff]+|[a-zA-Z]+|\d+(?:\.\d+)?)/;

function parseMixedOrFrac(token: string): ReactNode | null {
  const mx = /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(token.trim());
  if (mx) {
    const [, w, n, d] = mx;
    if (d === "0") return token;
    return (
      <span className="inline-flex items-baseline gap-0.5">
        <span className="tabular-nums">{w}</span>
        <StackedFrac num={n} den={d} />
      </span>
    );
  }
  const fr = /^(\d+)\s*\/\s*(\d+)$/.exec(token.trim());
  if (fr) {
    const [, n, d] = fr;
    if (d === "0" || n.length > 6 || d.length > 6) return token;
    return <StackedFrac num={n} den={d} />;
  }
  return null;
}

/**
 * 接近教材排版的算式片段：竖式分式、带分数、上标（如 x^2、(-2)^4）。
 */
export function MathPrettyText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  const nodes: ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest.length) {
    const m = rest.match(HEAD);
    if (!m || m.index !== 0) {
      nodes.push(rest[0]);
      rest = rest.slice(1);
      continue;
    }
    const full = m[0];
    if (m[1]) {
      const p = parseMixedOrFrac(full);
      nodes.push(<span key={key++}>{p ?? full}</span>);
    } else if (m[2]) {
      const p = parseMixedOrFrac(full);
      nodes.push(<span key={key++}>{p ?? full}</span>);
    } else if (m[3]) {
      const inner = m[3];
      const body = /^\d+$/.test(inner) ? inner : inner.startsWith("(") ? inner.slice(1, -1) : inner;
      nodes.push(
        <sup key={key++} className="ml-px text-[0.72em] font-semibold leading-none">
          {body}
        </sup>
      );
    } else if (m[4]) {
      const ch = m[4];
      if (ch === "×") nodes.push(<span key={key++}>×</span>);
      else if (ch === "÷") nodes.push(<span key={key++}>÷</span>);
      else nodes.push(<span key={key++}>{ch}</span>);
    }
    rest = rest.slice(full.length);
  }
  return <span className={className}>{nodes}</span>;
}
