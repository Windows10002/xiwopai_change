export type ImageQualityIssue = "blur" | "dark" | "small";

export type ImageQualityResult = {
  ok: boolean;
  issues: ImageQualityIssue[];
  message: string;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法读取图片"));
    };
    img.src = url;
  });
}

function sampleBrightness(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const data = ctx.getImageData(0, 0, w, h).data;
  let sum = 0;
  const step = 16;
  let n = 0;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      n += 1;
    }
  }
  return n ? sum / n : 128;
}

/** 估算拉普拉斯方差，过低视为模糊 */
function estimateBlurScore(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const sw = Math.min(320, w);
  const sh = Math.min(320, h);
  const small = document.createElement("canvas");
  small.width = sw;
  small.height = sh;
  const sctx = small.getContext("2d");
  if (!sctx) return 999;
  sctx.drawImage(ctx.canvas, 0, 0, w, h, 0, 0, sw, sh);
  const data = sctx.getImageData(0, 0, sw, sh).data;
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }
  let sum = 0;
  let sumSq = 0;
  let c = 0;
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const idx = y * sw + x;
      const lap =
        -4 * gray[idx] +
        gray[idx - 1] +
        gray[idx + 1] +
        gray[idx - sw] +
        gray[idx + sw];
      sum += lap;
      sumSq += lap * lap;
      c += 1;
    }
  }
  if (!c) return 0;
  const mean = sum / c;
  return sumSq / c - mean * mean;
}

/** 上传前拍照质量提示（纯前端，不调用批改 API） */
export async function checkImageQuality(file: File): Promise<ImageQualityResult> {
  const issues: ImageQualityIssue[] = [];
  try {
    const img = await loadImage(file);
    const maxSide = Math.max(img.naturalWidth, img.naturalHeight);
    if (maxSide < 480) issues.push("small");

    const scale = Math.min(1, 640 / maxSide);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: true, issues: [], message: "" };
    ctx.drawImage(img, 0, 0, w, h);

    const brightness = sampleBrightness(ctx, w, h);
    if (brightness < 72) issues.push("dark");

    const blurVar = estimateBlurScore(ctx, w, h);
    if (blurVar < 28) issues.push("blur");
  } catch {
    return { ok: true, issues: [], message: "" };
  }

  const parts: string[] = [];
  if (issues.includes("blur")) parts.push("画面可能偏模糊");
  if (issues.includes("dark")) parts.push("光线偏暗");
  if (issues.includes("small")) parts.push("分辨率偏低");
  if (!parts.length) return { ok: true, issues: [], message: "" };
  return {
    ok: false,
    issues,
    message: `${parts.join("、")}，建议重新拍摄：正对纸张、充足光线、少反光。仍可继续批改。`,
  };
}

export async function checkFilesQuality(files: File[]): Promise<Map<string, ImageQualityResult>> {
  const map = new Map<string, ImageQualityResult>();
  await Promise.all(
    files.map(async (f) => {
      const key = `${f.name}:${f.size}`;
      map.set(key, await checkImageQuality(f));
    }),
  );
  return map;
}
