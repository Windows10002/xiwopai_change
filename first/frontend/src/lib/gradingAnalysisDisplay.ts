/**
 * 数学分项「解析」展示层：去冗余标签、统一换行，便于阅读。
 */

/** 去掉首尾空白与连续空白，便于与订正区比对 */
export function normalizeAnalysisCompare(s: string): string {
  return s.replace(/\s+/g, "").replace(/解析[:：]/g, "").replace(/分数解析[:：]/g, "");
}

/** 从「订正」单条中取出题号后的正文（去掉首行「第 n 题（错误）」） */
export function improvementBodyForCompare(improvementLine: string): string {
  const t = improvementLine.trim();
  const lines = t.split(/\n/);
  if (lines[0] && /^第\s*\d+\s*题/.test(lines[0])) {
    return lines.slice(1).join("\n").trim();
  }
  return t;
}

/**
 * 移除【正确答案】段（正确步骤中已含最终结果时前端不再重复展示）。
 * 去掉文末重复的「正确步骤：…答案：…」行（与模板段重复时）。
 */
export function formatMathDimensionDetail(raw: string): string {
  let t = raw.trim();
  if (!t) return "";

  // 去掉模型偶发的整段划线占位（用户标注类字符一般不出现，防御性去掉常见装饰线）
  t = t.replace(/^[\s_\-─=＝~～]+/gm, "").trim();

  // 删除【正确答案】…（到下一个【或结尾）
  t = t.replace(/【正确答案】[^【]*/g, "");
  t = t.replace(/【正确答案】/g, "");

  // 每个【标签】独占一行
  t = t.replace(/\s*【/g, "\n【");
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  t = t.replace(/^\n+/, "");

  // 去掉与【正确步骤】数值链完全重复的尾行「正确步骤：…答案：…」
  const stepMatch = t.match(/【正确步骤】([^【]*)/);
  if (stepMatch) {
    const stepInner = stepMatch[1].trim();
    const tailDup = new RegExp(
      `(?:^|\\n)\\s*正确步骤[:：]\\s*[^\\n]+答案[:：][^\\n]+\\s*$`,
      "gm",
    );
    let m: RegExpExecArray | null;
    const re = new RegExp(tailDup.source, "gm");
    while ((m = re.exec(t)) !== null) {
      const tail = m[0].replace(/^\s+/, "").trim();
      const compact = (s: string) => s.replace(/\s+/g, "").replace(/[=＝]/g, "=");
      if (stepInner && compact(tail).length > 8 && compact(tail).includes(compact(stepInner).slice(0, Math.min(20, compact(stepInner).length)))) {
        t = t.slice(0, m.index).trimEnd();
        break;
      }
    }
    const lines = t.split("\n");
    while (lines.length >= 2 && lines[lines.length - 1] === lines[lines.length - 2]) {
      lines.pop();
    }
    t = lines.join("\n");
  }

  return t.trim();
}

/** 分项解析是否与对应题的订正文重复（可隐藏分项内解析框） */
export function shouldHideDimensionDetailBecauseDuplicate(
  detailRaw: string,
  improvementForQuestion: string | undefined,
): boolean {
  if (!detailRaw?.trim() || !improvementForQuestion?.trim()) return false;
  const body = improvementBodyForCompare(improvementForQuestion);
  if (!body) return false;
  const d = normalizeAnalysisCompare(formatMathDimensionDetail(detailRaw));
  const b = normalizeAnalysisCompare(body);
  if (!d || !b) return false;
  if (d === b) return true;
  // 订正区通常含「第 n 题」头 + 四段标签；分项 detail 若被完整包含则视为重复
  if (b.includes(d) && d.length >= 24) return true;
  if (d.includes(b) && b.length >= 24) return true;
  return false;
}

/** 从分项 label「第 3 题 · …」取题号 */
export function questionIdFromDimensionLabel(label: string): string | null {
  const m = label.match(/^第\s*(\d+)/);
  return m ? m[1] : null;
}

/** 订正 Tab 中单条：保留首行题头，其余走与分项一致的格式化 */
export function formatMathImprovementBlock(text: string): string {
  const t = text.trim();
  if (!t) return "";
  const lines = t.split(/\n/);
  const head = lines[0]?.trim() ?? "";
  if (/^第\s*\d+\s*题/.test(head)) {
    const rest = lines.slice(1).join("\n").trim();
    return rest ? `${head}\n${formatMathDimensionDetail(rest)}` : head;
  }
  return formatMathDimensionDetail(t);
}

export function findImprovementLineForQuestion(improvements: string[], qid: string): string | undefined {
  const re = new RegExp(`^第\\s*${qid}\\s*题`);
  return improvements.find((line) => re.test(line.trim()));
}
