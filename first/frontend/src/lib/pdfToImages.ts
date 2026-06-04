import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

const DEFAULT_MAX_PAGES = 30;
const RENDER_SCALE = 2;

export type PdfToImagesResult = {
  files: File[];
  totalPages: number;
  truncated: boolean;
};

/** 将 PDF 每页渲染为 JPEG，供现有图片批改管线使用 */
export async function pdfFileToImageFiles(
  file: File,
  opts?: { maxPages?: number },
): Promise<PdfToImagesResult> {
  const maxPages = opts?.maxPages ?? DEFAULT_MAX_PAGES;
  const base = file.name.replace(/\.pdf$/i, "").trim() || "作业";
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;
  const totalPages = pdf.numPages;
  const pageCount = Math.min(totalPages, maxPages);
  const files: File[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法创建画布以解析 PDF");

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error(`PDF 第 ${pageNum} 页导出失败`))),
        "image/jpeg",
        0.9,
      );
    });

    const suffix = totalPages > 1 ? `-第${pageNum}页` : "";
    files.push(new File([blob], `${base}${suffix}.jpg`, { type: "image/jpeg" }));
  }

  return { files, totalPages, truncated: totalPages > maxPages };
}
