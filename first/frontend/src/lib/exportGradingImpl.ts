import ExcelJS from "exceljs";
import { Document, HeadingLevel, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import type { BatchInsightsResponse } from "@/lib/gradingBatchInsights";
import type { DimensionScore, GradingResultDetail } from "@/types/grading";

/** 导出前筛选：分项列表 */
export type ExportDimensionFilter = "all" | "errors" | "correct";

/** Word / Excel 导出选项（批改结果页勾选） */
export type ExportFilterOptions = {
  dimensions: ExportDimensionFilter;
  includeSummary: boolean;
  includeStrengths: boolean;
  includeImprovements: boolean;
  includeWeakTags: boolean;
  /** 批量学情分析报告（需已生成或导出时自动本地汇总） */
  includeLearningReport: boolean;
  /** 知识点归纳与变形题建议 */
  includeVariants: boolean;
};

export const DEFAULT_EXPORT_FILTER: ExportFilterOptions = {
  dimensions: "all",
  includeSummary: true,
  includeStrengths: true,
  includeImprovements: true,
  includeWeakTags: true,
  includeLearningReport: true,
  includeVariants: true,
};

function appendInsightsDocx(children: Paragraph[], insights: BatchInsightsResponse, filter: ExportFilterOptions) {
  const report = insights.learning_report;
  const variants = insights.knowledge_variants;

  if (filter.includeLearningReport && report) {
    children.push(
      new Paragraph({ text: "学情分析报告", heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 } }),
    );
    if (report.summary_md) {
      report.summary_md.split(/\n+/).forEach((line) => {
        const t = line.replace(/^#+\s*/, "").trim();
        if (!t) return;
        if (line.startsWith("###")) {
          children.push(new Paragraph({ text: t, heading: HeadingLevel.HEADING_3, spacing: { before: 120, after: 80 } }));
        } else if (line.startsWith("##")) {
          children.push(new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 160, after: 100 } }));
        } else {
          children.push(new Paragraph({ text: t, spacing: { after: 80 } }));
        }
      });
    }
    (report.teaching_suggestions ?? []).forEach((s, i) => {
      children.push(new Paragraph({ text: `${i + 1}. ${s}`, spacing: { after: 60 } }));
    });
  }

  if (filter.includeVariants && variants) {
    children.push(
      new Paragraph({ text: "知识点与变形题", heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 } }),
    );
    if (variants.intro) {
      children.push(new Paragraph({ text: variants.intro, spacing: { after: 120 } }));
    }
    (variants.knowledge_summary ?? []).forEach((k) => {
      children.push(
        new Paragraph({
          text: `${k.name}（出现 ${k.frequency} 次${k.mastery_hint ? ` · ${k.mastery_hint}` : ""}）`,
          spacing: { after: 60 },
        }),
      );
    });
    (variants.variant_problems ?? []).forEach((v, i) => {
      children.push(
        new Paragraph({
          text: `${i + 1}. 【${v.knowledge_point}】${v.difficulty} · ${v.variation_type}`,
          spacing: { before: 100, after: 40 },
        }),
        new Paragraph({ text: v.stem, spacing: { after: 40 } }),
        new Paragraph({
          children: [new TextRun({ text: "参考答案要点：", bold: true }), new TextRun(v.answer_hint)],
          spacing: { after: 100 },
        }),
      );
    });
  }
}

function appendInsightsXlsx(wb: ExcelJS.Workbook, insights: BatchInsightsResponse, filter: ExportFilterOptions) {
  const report = insights.learning_report;
  const variants = insights.knowledge_variants;
  if (!filter.includeLearningReport && !filter.includeVariants) return;

  const ws = wb.addWorksheet("学情与变式", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [{ width: 10 }, { width: 72 }, { width: 14 }];
  const head = ws.addRow(["区块", "内容", "备注"]);
  head.font = { bold: true };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } };

  if (filter.includeLearningReport && report) {
    ws.addRow(["学情分析", "", ""]).font = { bold: true };
    if (report.summary_md) {
      report.summary_md.split(/\n+/).forEach((line) => {
        const t = line.trim();
        if (t) ws.addRow(["", t.replace(/^#+\s*/, ""), ""]);
      });
    }
    (report.weak_knowledge_ranked ?? []).forEach((w) => {
      ws.addRow(["薄弱点", w.tag, `${w.count} 次`]);
    });
    (report.error_patterns ?? []).forEach((p) => {
      ws.addRow(["错题模式", p.pattern, `${p.count} 次`]);
    });
    (report.teaching_suggestions ?? []).forEach((s, i) => {
      ws.addRow(["教学建议", `${i + 1}. ${s}`, ""]);
    });
  }

  if (filter.includeVariants && variants) {
    ws.addRow(["", "", ""]);
    ws.addRow(["变形题", "", ""]).font = { bold: true };
    if (variants.intro) ws.addRow(["说明", variants.intro, ""]);
    (variants.knowledge_summary ?? []).forEach((k) => {
      ws.addRow(["知识点", k.name, `${k.frequency} 次 · ${k.mastery_hint ?? ""}`]);
    });
    (variants.variant_problems ?? []).forEach((v, i) => {
      ws.addRow([`变式 ${i + 1}`, v.stem, `${v.knowledge_point} · ${v.difficulty}`]);
      ws.addRow(["", `答案要点：${v.answer_hint}`, v.variation_type]);
    });
  }
}

function filterDimensionsForExport(
  dimensions: DimensionScore[],
  filter: ExportDimensionFilter,
): DimensionScore[] {
  if (filter === "all") return dimensions;
  if (filter === "errors") {
    return dimensions.filter((d) => d.status === "错误" || d.status === "未作答");
  }
  return dimensions.filter((d) => d.status === "正确" || d.status === "过程不规范");
}

/** Word / Excel 共用：状态文字颜色（RRGGBB，无 #） */
function statusHexColor(status: string | undefined): string | undefined {
  const s = (status ?? "").trim();
  if (s === "正确") return "15803D";
  if (s === "错误") return "DC2626";
  if (s === "未作答") return "CA8A04";
  if (s === "过程不规范") return "C2410C";
  return undefined;
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Office Open XML · Word（.docx） */
export async function exportGradingDocx(
  detail: GradingResultDetail,
  subjectCn: string,
  baseName: string,
  filter: ExportFilterOptions = DEFAULT_EXPORT_FILTER,
  batchInsights: BatchInsightsResponse | null = null,
): Promise<void> {
  const safe = baseName.trim().replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "作业批改";
  const dims = filterDimensionsForExport(detail.dimensions, filter.dimensions);

  const children: Paragraph[] = [
    new Paragraph({
      text: `${subjectCn} · 批改报告`,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "综合得分：", bold: true }),
        new TextRun(`${detail.scorePercent}% · ${detail.overallLabel}`),
      ],
    }),
  ];

  if (filter.includeSummary && detail.summaryText) {
    children.push(
      new Paragraph({ text: "总评", heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } }),
      new Paragraph({
        children: [new TextRun({ text: detail.summaryText })],
        alignment: AlignmentType.LEFT,
        spacing: { after: 200 },
      })
    );
  }

  children.push(
    new Paragraph({
      text: detail.dimensionSectionTitle,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
    })
  );

  dims.forEach((d, i) => {
    const st = d.status?.trim();
    const stColor = statusHexColor(st);
    const runs = [
      new TextRun({ text: `${i + 1}. `, bold: true }),
      new TextRun(`${d.label}  `),
      new TextRun({ text: `${d.value}/${d.max}`, bold: true, color: "15803D" }),
      new TextRun({ text: "  " }),
    ];
    if (st) {
      runs.push(new TextRun({ text: `「${st}」`, bold: true, ...(stColor ? { color: stColor } : {}) }));
    }
    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: runs,
      })
    );
  });

  if (filter.includeStrengths) {
    children.push(
      new Paragraph({ text: "亮点与要点", heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 } })
    );
    detail.feedback.strengths.forEach((t, i) => {
      children.push(new Paragraph({ text: `${i + 1}. ${t}`, spacing: { after: 80 } }));
    });
  }

  if (filter.includeImprovements) {
    children.push(
      new Paragraph({ text: "待加强与订正建议", heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } })
    );
    detail.feedback.improvements.forEach((t, i) => {
      children.push(new Paragraph({ text: `${i + 1}. ${t}`, spacing: { after: 80 } }));
    });
  }

  children.push(
    new Paragraph({ text: "薄弱知识点", heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } }),
    new Paragraph({
      text:
        filter.includeWeakTags && detail.weakKnowledgeTags.length
          ? detail.weakKnowledgeTags.join("、")
          : filter.includeWeakTags
            ? "（无）"
            : "（本次导出已省略薄弱知识点）",
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `导出时间：${new Date().toLocaleString("zh-CN")}`, size: 18, color: "666666" })],
      spacing: { before: 300 },
    })
  );

  if (batchInsights && (filter.includeLearningReport || filter.includeVariants)) {
    appendInsightsDocx(children, batchInsights, filter);
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${safe}_${stamp()}.docx`);
}

/** Office Open XML · Excel（.xlsx） */
export async function exportGradingXlsx(
  detail: GradingResultDetail,
  subjectCn: string,
  baseName: string,
  filter: ExportFilterOptions = DEFAULT_EXPORT_FILTER,
  batchInsights: BatchInsightsResponse | null = null,
): Promise<void> {
  const safe = baseName.trim().replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "作业批改";
  const dims = filterDimensionsForExport(detail.dimensions, filter.dimensions);

  const wb = new ExcelJS.Workbook();
  wb.creator = "grading-ui";
  const ws = wb.addWorksheet("批改结果", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = [{ width: 14 }, { width: 42 }, { width: 8 }, { width: 8 }, { width: 12 }];

  const meta = ws.addRow(["类型", "内容", "得分", "满分", "状态"]);
  meta.font = { bold: true };
  meta.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } };

  ws.addRow(["学科", subjectCn, "", "", ""]);
  ws.addRow(["综合", `${detail.scorePercent}%`, "", "", ""]);
  ws.addRow(["总标题", detail.overallLabel, "", "", ""]);
  if (filter.includeSummary && detail.summaryText) ws.addRow(["总评", detail.summaryText, "", "", ""]);
  ws.addRow(["", "", "", "", ""]);

  const sec = ws.addRow([detail.dimensionSectionTitle, "", "", "", ""]);
  sec.font = { bold: true, size: 12 };
  const head = ws.addRow(["序号", "题项", "得分", "满分", "状态"]);
  head.font = { bold: true };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };

  dims.forEach((d, i) => {
    const row = ws.addRow([i + 1, d.label, d.value, d.max, d.status ?? "—"]);
    const hex = statusHexColor(d.status);
    if (hex) {
      row.getCell(5).font = { bold: true, color: { argb: `FF${hex}` } };
    }
  });

  if (filter.includeStrengths) {
    ws.addRow(["", "", "", "", ""]);
    ws.addRow(["亮点与要点", "", "", "", ""]).font = { bold: true };
    detail.feedback.strengths.forEach((t, i) => ws.addRow([i + 1, t, "", "", ""]));
  }

  if (filter.includeImprovements) {
    ws.addRow(["", "", "", "", ""]);
    ws.addRow(["待加强与订正", "", "", "", ""]).font = { bold: true };
    detail.feedback.improvements.forEach((t, i) => ws.addRow([i + 1, t, "", "", ""]));
  }

  ws.addRow(["", "", "", "", ""]);
  ws.addRow([
    "薄弱知识点",
    filter.includeWeakTags ? detail.weakKnowledgeTags.join("；") || "无" : "（本次导出已省略）",
    "",
    "",
    "",
  ]);

  if (batchInsights && (filter.includeLearningReport || filter.includeVariants)) {
    appendInsightsXlsx(wb, batchInsights, filter);
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, `${safe}_${stamp()}.xlsx`);
}
