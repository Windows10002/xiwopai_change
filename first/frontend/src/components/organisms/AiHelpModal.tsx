import { AppDialog, APP_DIALOG_PANEL, APP_DIALOG_PANEL_TITLE } from "@/components/molecules/AppDialog";

type AiHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

const SECTIONS = [
  {
    title: "怎么拍出更易识别的作业？",
    body: "尽量正对纸张、避免强反光与严重阴影；多张图可按题号命名，便于文件夹批改时排序。系统会在选图后提示模糊、过暗或分辨率偏低（仍可继续批改）。",
  },
  {
    title: "单张与整个文件夹批改",
    body: "点击「选择图片」上传单张；「选择文件夹」或把文件夹拖入虚线框，可一次导入多张可批改图片。识别张数后，点「开始批改」会按顺序逐张请求后端，进度条与上传区百分比会同步推进。",
  },
  {
    title: "学情分析与班级看板",
    body: "批改完成后可运行「AI 深度学情分析」；教师可在「学生学情」按姓名汇总，或在「班级看板」按文件夹批次查看全班薄弱点与变形题建议。",
  },
  {
    title: "学生名册与备注模板",
    body: "在「设置」中维护学生名册与常用批改备注；选图弹窗可快速选择学生姓名并插入备注模板。",
  },
  {
    title: "错题本与家长代拍",
    body: "学生端错题本自动收录错题，可标记「已订正」并按知识点筛选。家长端可代孩子拍照批改，并在首页查看本机学情摘要。",
  },
  {
    title: "判题反馈与申诉",
    body: "教师可提交判题异议反馈；学生可发起申诉，教师在设置页或反馈看板处理。数据保存在服务端 JSONL 文件中。",
  },
  {
    title: "历史记录保存多久？",
    body: "浏览器本地会保留约一年内成功的批改摘要，并尽量附带作业缩略图；「清空本学科」只删除当前数学/英语页面对应的记录，其它学科不受影响。清除站点数据会一并清空。",
  },
  {
    title: "导出 Word / Excel",
    body: "批改完成后可导出标准 Office Open XML：.docx（Word）与 .xlsx（Excel）。可在设置中配置默认导出项（学情报告、变形题等）。",
  },
  {
    title: "适用年级与隐私",
    body: "支持小学至高中学段；低龄学生登录需家长/教师确认码。演示环境数据存于本机浏览器与服务端 uploads，请勿上传真实隐私信息至公网演示服。",
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
