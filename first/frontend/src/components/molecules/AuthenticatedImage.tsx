import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { fetchAuthenticatedBlobUrl } from "@/lib/authenticatedMedia";

type AuthenticatedImageProps = {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
};

/** 需登录的 /uploads 图片（img 标签无法带 Bearer，故先 fetch 再展示） */
export function AuthenticatedImage({ src, alt, className, wrapperClassName }: AuthenticatedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src.trim()) {
      setBlobUrl(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    let objectUrl = "";
    setFailed(false);
    setBlobUrl(null);
    void fetchAuthenticatedBlobUrl(src)
      .then((url) => {
        objectUrl = url;
        if (!cancelled) setBlobUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!src.trim()) return null;

  if (failed) {
    return (
      <p className={`text-caption text-red-600 ${wrapperClassName ?? ""}`}>图片加载失败，请重新登录后刷新</p>
    );
  }

  if (!blobUrl) {
    return (
      <div
        className={`flex min-h-24 items-center justify-center gap-2 text-caption text-ink-muted ${wrapperClassName ?? ""}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" {...CUTE_ICON} aria-hidden />
        加载图片…
      </div>
    );
  }

  return <img src={blobUrl} alt={alt} className={className} />;
}
