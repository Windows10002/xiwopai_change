import { AppDialog, APP_DIALOG_PANEL, APP_DIALOG_PANEL_TITLE } from "@/components/molecules/AppDialog";

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
  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="AI 使用帮助"
      subtitle="希沃智教π · 作业批改演示"
      titleId="ai-help-title"
      backdropLabel="关闭帮助"
    >
      <ol className="space-y-4">
        {SECTIONS.map((s, i) => (
          <li key={s.title} className={APP_DIALOG_PANEL}>
            <p className={APP_DIALOG_PANEL_TITLE}>
              {i + 1}. {s.title}
            </p>
            <p className="mt-2 text-caption leading-relaxed text-ink-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </AppDialog>
  );
}
