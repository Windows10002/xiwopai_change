/**
 * 将本地图片文件压成 JPEG 缩略图 Data URL，供历史记录等小体积展示。
 */
export async function fileToJpegThumbDataUrl(
  file: File,
  maxSide = 168,
  quality = 0.72
): Promise<string | undefined> {
  try {
    const bmp = await createImageBitmap(file);
    const w = bmp.width;
    const h = bmp.height;
    const scale = Math.min(1, maxSide / Math.max(w, h, 1));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bmp.close();
      return undefined;
    }
    ctx.drawImage(bmp, 0, 0, tw, th);
    bmp.close();
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return undefined;
  }
}

/** 压缩为 JPEG Blob，供 IndexedDB 存历史原图（控制体积）。 */
export async function fileToJpegBlobForStorage(file: File, maxSide = 2400, quality = 0.86): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const w = bmp.width;
  const h = bmp.height;
  const scale = Math.min(1, maxSide / Math.max(w, h, 1));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bmp.close();
    throw new Error("canvas 2d unsupported");
  }
  ctx.drawImage(bmp, 0, 0, tw, th);
  bmp.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("toBlob failed"));
      },
      "image/jpeg",
      quality
    );
  });
}
