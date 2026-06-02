/** 浏览器打印友好：打开只含批改摘要的新窗口 */
export function printGradingReport(title: string, htmlBody: string): void {
  const w = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
  if (!w) {
    alert("请允许弹出窗口以打印报告");
    return;
  }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;line-height:1.6;color:#1a1a1a}h1{font-size:1.25rem}</style></head><body>
<h1>${title}</h1>${htmlBody}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}
