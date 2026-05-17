import { useEffect } from "react";
import { X } from "lucide-react";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";

type AiHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

const SECTIONS = [
  {
    title: "怎么拍出更易识别的作业？",
    body: "尽量正对纸张、避免强反光与严重阴影；多张图可按题号命名，便于文件夹批改时排序。",
  },
  {
    title: "单张与整个文件夹批改",
    body: "点击「选择图片」上传单张；「选择文件夹」或把文件夹拖入虚线框，可一次导入多张可批改图片。识别张数后，点「开始批改」会按顺序逐张请求后端，进度条与上传区百分比会同步推进。",
  },
  {
    title: "历史记录保存多久？",
    body: "浏览器本地会保留约一年内成功的批改摘要，并尽量附带作业缩略图；「清空本学科」只删除当前数学/英语页面对应的记录，其它学科不受影响。清除站点数据会一并清空。",
  },
  {
    title: "导出 Word / Excel",
    body: "批改完成后可导出标准 Office Open XML：.docx（Word）与 .xlsx（Excel）。首次使用请在 frontend 目录执行 npm install 安装 docx、exceljs。",
  },
] as const;

export function AiHelpModal({ open, onClose }: AiHelpModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="ai-help-title">
      <button type="button" className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" aria-label="关闭帮助" onClick={onClose} />
      <div className="relative z-10 flex max-h-[min(92vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-[1.35rem] border border-black/[0.08] bg-white shadow-[0_24px_80px_rgba(15,90,75,0.2)]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
          <div>
            <h2 id="ai-help-title" className="text-body font-extrabold text-ink">
              AI 使用帮助
            </h2>
            <p className="mt-1 text-caption text-ink-muted">希沃智教π · 作业批改演示</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white text-ink-muted transition hover:border-primary/30 hover:text-ink"
            aria-label="关闭"
          >
            <X className="h-5 w-5" {...CUTE_ICON} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ol className="space-y-4">
            {SECTIONS.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-primary/12 bg-primary-tint/50 px-4 py-3.5">
                <p className="text-small font-bold text-ink-navActive">
                  {i + 1}. {s.title}
                </p>
                <p className="mt-2 text-caption leading-relaxed text-ink-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
