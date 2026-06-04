export const GRADING_UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/webp,image/bmp,image/gif,.jpg,.jpeg,.png,.webp,.bmp,.gif,application/pdf,.pdf";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/bmp", "image/gif"]);
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "bmp", "gif"]);

export const GRADING_UPLOAD_HINT =
  "支持 JPG / PNG / WebP / BMP / GIF / PDF；PDF 将按页转为图片批改。建议正对纸张、光线均匀。";

export function isPdfFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return file.type === "application/pdf" || ext === "pdf";
}

export function isAllowedGradingUploadFile(file: File): boolean {
  if (isPdfFile(file)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_IMAGE_TYPES.has(file.type) || ALLOWED_IMAGE_EXTENSIONS.has(ext);
}

export type ExpandGradingUploadResult = {
  files: File[];
  pdfErrors: string[];
  pdfTruncated: boolean;
};

/** 展开 PDF 为多张图片，并与普通图片合并、排序 */
export async function expandGradingUploadFiles(raw: File[]): Promise<ExpandGradingUploadResult> {
  const pdfErrors: string[] = [];
  let pdfTruncated = false;
  const expanded: File[] = [];

  const sorted = [...raw].sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));

  for (const file of sorted) {
    if (!isAllowedGradingUploadFile(file)) continue;

    if (isPdfFile(file)) {
      try {
        const { pdfFileToImageFiles } = await import("@/lib/pdfToImages");
        const { files, truncated } = await pdfFileToImageFiles(file);
        if (!files.length) {
          pdfErrors.push(`「${file.name}」未解析到有效页面`);
          continue;
        }
        expanded.push(...files);
        if (truncated) pdfTruncated = true;
      } catch (e) {
        pdfErrors.push(`「${file.name}」：${e instanceof Error ? e.message : "解析失败"}`);
      }
      continue;
    }

    expanded.push(file);
  }

  return {
    files: expanded.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN")),
    pdfErrors,
    pdfTruncated,
  };
}
