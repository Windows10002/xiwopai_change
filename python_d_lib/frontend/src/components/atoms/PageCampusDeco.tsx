import { BookOpen, Pencil, Sparkles, Star, Sun } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";

const STICKERS = [
  { Icon: Star, pos: "campus-sticker-1", tone: "text-amber-400", size: "h-5 w-5" },
  { Icon: Pencil, pos: "campus-sticker-2", tone: "text-sky-500", size: "h-5 w-5" },
  { Icon: BookOpen, pos: "campus-sticker-3", tone: "text-emerald-500", size: "h-5 w-5" },
  { Icon: Sparkles, pos: "campus-sticker-4", tone: "text-violet-400", size: "h-4 w-4" },
  { Icon: Sun, pos: "campus-sticker-5", tone: "text-orange-400", size: "h-5 w-5" },
] as const;

/** 全页校园青春装饰：点阵底纹 + 气泡 + 漂浮贴纸 */
export function PageCampusDeco() {
  return (
    <div className="page-campus-deco" aria-hidden>
      <span className="campus-grid-pattern" />
      <span className="deco-bubble deco-bubble-1" />
      <span className="deco-bubble deco-bubble-2" />
      <span className="deco-bubble deco-bubble-3" />
      <span className="deco-bubble deco-bubble-4" />
      {STICKERS.map(({ Icon, pos, tone, size }) => (
        <span key={pos} className={`campus-sticker ${pos}`}>
          <Icon className={`${size} ${tone}`} {...CUTE_ICON} />
        </span>
      ))}
    </div>
  );
}
