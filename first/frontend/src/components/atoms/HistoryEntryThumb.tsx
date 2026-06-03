import { useEffect, useState } from "react";

import { getHistoryImageBlob } from "@/lib/gradingHistoryImageDb";

type HistoryEntryThumbProps = {
  entryId: string;
  /** 旧数据可能仍有 base64 缩略图 */
  legacyThumbDataUrl?: string;
  className?: string;
};

/** 历史列表缩略图：优先 IndexedDB 原图，避免 localStorage 只能存一张图的问题 */
export function HistoryEntryThumb({ entryId, legacyThumbDataUrl, className = "h-9 w-9 shrink-0 rounded-md object-cover" }: HistoryEntryThumbProps) {
  const [url, setUrl] = useState<string | null>(legacyThumbDataUrl ?? null);

  useEffect(() => {
    if (legacyThumbDataUrl) {
      setUrl(legacyThumbDataUrl);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    void getHistoryImageBlob(entryId).then((blob) => {
      if (!blob || cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [entryId, legacyThumbDataUrl]);

  if (!url) {
    return (
      <div className={`flex items-center justify-center rounded-md bg-surface-page text-[0.55rem] text-ink-muted ${className}`}>
        图
      </div>
    );
  }

  return <img src={url} alt="" className={className} />;
}
