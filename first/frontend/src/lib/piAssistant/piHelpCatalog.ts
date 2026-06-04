/** FAQ，供 π 助手检索（与历史 AiHelpModal 内容对齐并扩充） */
export const PI_HELP_SECTIONS = [
  {
    title: "怎么拍出更易识别的作业？",
    body: "尽量正对纸张、避免强反光与严重阴影；多张图可按题号命名，便于文件夹批改时排序。",
    keywords: ["拍照", "识别", "反光", "模糊", "上传", "光线"],
  },
  {
    title: "单张与整个文件夹批改",
    body: "点击「选择图片」上传单张；「选择文件夹」或拖入文件夹可批量导入。点「开始批改」会按顺序逐张处理。",
    keywords: ["文件夹", "批量", "多张", "选图", "拖入"],
  },
  {
    title: "学情中心与作业管理的区别",
    body: "学情中心汇总本机批改：批改历史、班级/学生学情、薄弱趋势；可学科筛选、导出简报。发布、删除作业请在「作业管理」。",
    keywords: ["学情", "分析", "薄弱", "简报", "历史", "区别", "作业管理"],
  },
  {
    title: "批改历史如何删除",
    body: "学情中心 → 批改历史 → 单条「删除」或「清空本学科」。删除后不可恢复，关联缩略图会一并清除。",
    keywords: ["删除", "历史", "清空"],
  },
  {
    title: "作业有提交还能删吗",
    body: "教师端作业管理支持删除已有学生提交的任务，会二次确认；删除后其它标签页可通过切换窗口或刷新同步列表。",
    keywords: ["删作业", "删除任务", "提交", "二次确认"],
  },
  {
    title: "错题本与家长代拍",
    body: "学生端错题本自动收录错题。家长端可代孩子拍照批改，并在首页查看本机学情摘要；代拍时请填写孩子姓名。",
    keywords: ["错题", "家长", "代拍", "孩子"],
  },
  {
    title: "导出 Word / Excel",
    body: "批改完成后可导出 .docx 与 .xlsx；可在设置中配置默认导出项。",
    keywords: ["导出", "word", "excel", "下载", "docx"],
  },
  {
    title: "并行登录多个身份",
    body: "开发环境可在登录页使用不同 slot 开多个标签（教师/学生/家长/教务），各标签令牌互不覆盖。",
    keywords: ["并行", "登录", "slot", "多开", "标签"],
  },
  {
    title: "π 助学怎么用",
    body: "学生端「π 助学」可选错题本中的题目分析错因与订正建议，也可直接输入不会的题目。规则模式离线可用；智能问答需 Agnes API。",
    keywords: ["助学", "分析", "讲解", "辅导", "不会", "π助学"],
  },
  {
    title: "如何提交产品反馈",
    body: "点击右下角 π 助手 →「反馈建议」，或说「反馈」打开表单。教师/教务还可在「产品反馈」看板查看汇总。",
    keywords: ["反馈", "建议", "bug", "π", "助手"],
  },
] as const;

export function searchPiHelp(query: string): (typeof PI_HELP_SECTIONS)[number] | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  let best: (typeof PI_HELP_SECTIONS)[number] | null = null;
  let bestScore = 0;
  for (const s of PI_HELP_SECTIONS) {
    let score = 0;
    if (s.title.toLowerCase().includes(q) || q.includes(s.title.slice(0, 2))) score += 2;
    for (const kw of s.keywords) {
      if (q.includes(kw.toLowerCase())) score += kw.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return bestScore > 0 ? best : null;
}
