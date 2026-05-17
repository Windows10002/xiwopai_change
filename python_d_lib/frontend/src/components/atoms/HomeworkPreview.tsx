import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImageIcon, Minus, Pin, PinOff, Plus, X } from "lucide-react";
import type { ErrorRegionPct } from "@/types/grading";
import { IpMascotCameraEmpty } from "@/components/atoms/IpMascot";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";

export type PaperMarkKind = "ok" | "bad" | "half" | "neutral";

/** 叠在试卷图上的逐题状态标（与分项列表顺序一致；网格或右侧列） */
export type PaperMark = {
  /** 距预览区顶部的百分比 0–100（仅列布局使用） */
  topPct?: number;
  /** 题号短标签 */
  label: string;
  kind: PaperMarkKind;
};

type HomeworkPreviewProps = {
  imageUrl: string | null;
  errorRegions?: ErrorRegionPct[];
  /** 无图时的补充说明（如历史记录无原图） */
  idleHint?: string;
  /** 有图时在卡片底部显示的说明 */
  imageCaption?: string;
  /** 数学等：在试卷预览上叠对/错/半对标记（与分项列表顺序一致） */
  paperMarks?: PaperMark[] | null;
  /** 将标记铺在卷面内容区的网格上（如 4 列 × 多行，贴近纸质作业排版） */
  paperMarkGrid?: { columns: number } | null;
  /** 主预览是否叠标注；默认 false，避免与纸面题位不一致造成误解 */
  showPaperMarksOnMain?: boolean;
  /** 与左侧栏同高伸展（大屏与右侧解析栏对齐） */
  fillColumn?: boolean;
};

function markStyle(kind: PaperMarkKind): string {
  if (kind === "ok") return "bg-emerald-600 text-white ring-emerald-800/40";
  if (kind === "bad") return "bg-red-600 text-white ring-red-900/30";
  if (kind === "half") return "bg-amber-500 text-white ring-amber-800/35";
  return "bg-slate-500 text-white ring-slate-800/30";
}

function markChar(kind: PaperMarkKind): string {
  if (kind === "ok") return "✓";
  if (kind === "bad") return "✗";
  if (kind === "half") return "◐";
  return "·";
}

function ErrorOverlay({ errorRegions }: { errorRegions: ErrorRegionPct[] }) {
  if (errorRegions.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {errorRegions.map((r, i) => (
        <span
          key={`${r.left}-${r.top}-${i}`}
          className="absolute rounded-md border-[3px] border-red-500/95 bg-red-500/[0.06] shadow-[0_0_0_1px_rgba(239,68,68,0.25)]"
          style={{
            left: `${r.left}%`,
            top: `${r.top}%`,
            width: `${r.width}%`,
            height: `${r.height}%`,
          }}
        />
      ))}
    </div>
  );
}

function PaperMarksOverlay({
  paperMarks,
  paperMarkGrid,
}: {
  paperMarks: PaperMark[];
  paperMarkGrid: { columns: number } | null;
}) {
  if (paperMarkGrid) {
    const cols = Math.max(1, paperMarkGrid.columns);
    return (
      <div
        className="pointer-events-none absolute inset-[9%_5%_11%_5%] grid gap-x-1 gap-y-1"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridAutoRows: "minmax(0, 1fr)",
        }}
        aria-hidden
      >
        {paperMarks.map((m, i) => (
          <div key={`${m.label}-${i}`} className="flex min-h-0 flex-col items-center justify-center gap-0.5 px-0.5">
            <span
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black shadow-md ring-2 ring-inset sm:h-8 sm:w-8 sm:text-base",
                markStyle(m.kind),
              ].join(" ")}
              title={`第 ${m.label} 题`}
            >
              {markChar(m.kind)}
            </span>
            <span className="max-w-full truncate rounded bg-white/90 px-1 py-0.5 text-[0.58rem] font-bold leading-none text-ink shadow-sm ring-1 ring-black/[0.08] sm:text-[0.62rem]">
              {m.label}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-y-2 right-1 flex w-[2.75rem] flex-col sm:right-2 sm:w-12" aria-hidden>
      {paperMarks.map((m, i) => (
        <div
          key={`${m.label}-${i}`}
          className="absolute right-0 flex translate-y-[-50%] flex-col items-center gap-0.5"
          style={{ top: `${m.topPct ?? ((i + 0.5) / paperMarks.length) * 100}%` }}
        >
          <span
            className={[
              "flex h-7 w-7 items-center justify-center rounded-full text-sm font-black shadow-md ring-2 ring-inset sm:h-8 sm:w-8 sm:text-base",
              markStyle(m.kind),
            ].join(" ")}
            title={`题 ${m.label}`}
          >
            {markChar(m.kind)}
          </span>
          <span className="rounded bg-white/90 px-1 py-0.5 text-[0.6rem] font-bold leading-none text-ink shadow-sm ring-1 ring-black/[0.08] sm:text-[0.65rem]">
            {m.label}
          </span>
        </div>
      ))}
    </div>
  );
}

type PinBox = { x: number; y: number; w: number; h: number };

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

const PIN_MIN_W = 220;
const PIN_MIN_H = 180;
const PIN_HEADER = 36;
const PIN_PAD = 8;

/**
 * 作业预览：图片 + 可选红框层（仅旧数据）；无图时 IP 拿相机引导上传。
 */
export function HomeworkPreview({
  imageUrl,
  errorRegions = [],
  idleHint,
  imageCaption,
  paperMarks,
  paperMarkGrid = null,
  showPaperMarksOnMain = false,
  fillColumn = false,
}: HomeworkPreviewProps) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [pinned, setPinned] = useState(false);
  const [pinBox, setPinBox] = useState<PinBox | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [pinPan, setPinPan] = useState({ x: 0, y: 0 });
  const [pinScale, setPinScale] = useState(1);

  const dragRef = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
  const resizeRef = useRef<{ ox: number; oy: number; sw: number; sh: number; sx: number; sy: number } | null>(null);
  const pinImageDragRef = useRef(false);

  useEffect(() => {
    setImgFailed(false);
  }, [imageUrl]);

  useEffect(() => {
    if (!zoomOpen) setZoomScale(1);
  }, [zoomOpen]);

  useEffect(() => {
    if (!pinned) {
      setPinScale(1);
      setPinPan({ x: 0, y: 0 });
    }
  }, [pinned]);

  const onPinWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setPinScale((s) => clamp(Math.round((s + delta) * 100) / 100, 0.35, 4));
  }, []);

  const onZoomWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoomScale((s) => clamp(Math.round((s + delta) * 100) / 100, 0.35, 5));
  }, []);

  useLayoutEffect(() => {
    if (!pinned || typeof window === "undefined") return;
    setPinBox((prev) => {
      if (prev) return prev;
      const w = clamp(Math.round(window.innerWidth * 0.38), PIN_MIN_W, Math.min(520, window.innerWidth - 24));
      const h = clamp(Math.round(window.innerHeight * 0.42), PIN_MIN_H, Math.min(640, window.innerHeight - 48));
      const x = clamp(window.innerWidth - w - 16, 8, window.innerWidth - w - 8);
      const y = clamp(88, 8, window.innerHeight - h - 8);
      return { x, y, w, h };
    });
  }, [pinned]);

  const onPinImagePanMove = useCallback((e: MouseEvent) => {
    if (!pinImageDragRef.current) return;
    const lim = 3600;
    setPinPan((p) => ({
      x: clamp(p.x + e.movementX, -lim, lim),
      y: clamp(p.y + e.movementY, -lim, lim),
    }));
  }, []);

  const onPinImagePanUp = useCallback(() => {
    pinImageDragRef.current = false;
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", onPinImagePanMove);
    window.removeEventListener("mouseup", onPinImagePanUp);
  }, [onPinImagePanMove]);

  const onPinViewportMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      pinImageDragRef.current = true;
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onPinImagePanMove);
      window.addEventListener("mouseup", onPinImagePanUp);
    },
    [onPinImagePanMove, onPinImagePanUp],
  );

  const onDragMove = useCallback(
    (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      setPinBox((box) => {
        if (!box) return box;
        const nx = clamp(e.clientX - d.ox, 0, window.innerWidth - box.w);
        const ny = clamp(e.clientY - d.oy, 0, window.innerHeight - box.h);
        return { ...box, x: nx, y: ny };
      });
    },
    [],
  );

  const onDragUp = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", onDragUp);
  }, [onDragMove]);

  const onPinHeaderDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const box = pinBox;
      if (!box) return;
      dragRef.current = { ox: e.clientX - box.x, oy: e.clientY - box.y, sx: box.x, sy: box.y };
      window.addEventListener("mousemove", onDragMove);
      window.addEventListener("mouseup", onDragUp);
    },
    [pinBox, onDragMove, onDragUp],
  );

  const onResizeMove = useCallback((e: MouseEvent) => {
    const r = resizeRef.current;
    if (!r) return;
    setPinBox((box) => {
      if (!box) return box;
      const dw = e.clientX - r.ox;
      const dh = e.clientY - r.oy;
      const nw = clamp(r.sw + dw, PIN_MIN_W, window.innerWidth - box.x - 8);
      const nh = clamp(r.sh + dh, PIN_MIN_H + PIN_HEADER, window.innerHeight - box.y - 8);
      return { ...box, w: nw, h: nh };
    });
  }, []);

  const onResizeUp = useCallback(() => {
    resizeRef.current = null;
    window.removeEventListener("mousemove", onResizeMove);
    window.removeEventListener("mouseup", onResizeUp);
  }, [onResizeMove]);

  const onResizeDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || !pinBox) return;
      e.preventDefault();
      e.stopPropagation();
      resizeRef.current = { ox: e.clientX, oy: e.clientY, sw: pinBox.w, sh: pinBox.h, sx: pinBox.x, sy: pinBox.y };
      window.addEventListener("mousemove", onResizeMove);
      window.addEventListener("mouseup", onResizeUp);
    },
    [pinBox, onResizeMove, onResizeUp],
  );

  useEffect(() => {
    if (pinned) return;
    setPinBox(null);
    dragRef.current = null;
    resizeRef.current = null;
    pinImageDragRef.current = false;
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", onDragUp);
    window.removeEventListener("mousemove", onResizeMove);
    window.removeEventListener("mouseup", onResizeUp);
    window.removeEventListener("mousemove", onPinImagePanMove);
    window.removeEventListener("mouseup", onPinImagePanUp);
  }, [pinned, onDragMove, onDragUp, onResizeMove, onResizeUp, onPinImagePanMove, onPinImagePanUp]);

  useEffect(() => {
    if (!pinned) return;
    const onWin = () => {
      setPinBox((b) => {
        if (!b) return b;
        return {
          ...b,
          x: clamp(b.x, 0, Math.max(8, window.innerWidth - b.w - 8)),
          y: clamp(b.y, 0, Math.max(8, window.innerHeight - b.h - 8)),
          w: clamp(b.w, PIN_MIN_W, window.innerWidth - b.x - 8),
          h: clamp(b.h, PIN_MIN_H + PIN_HEADER, window.innerHeight - b.y - 8),
        };
      });
    };
    window.addEventListener("resize", onWin);
    return () => window.removeEventListener("resize", onWin);
  }, [pinned]);

  if (!imageUrl) {
    return (
      <div className="rounded-card border-2 border-black/[0.08] bg-white px-4 py-10 text-center shadow-card">
        <IpMascotCameraEmpty />
        <p className="mt-4 text-small font-semibold text-ink">上传图片后这里会显示预览</p>
        <p className="mt-1 text-caption text-ink-subtle">{idleHint ?? "支持拖拽或更换作业照片"}</p>
      </div>
    );
  }

  const footerParts = [
    errorRegions.length > 0 ? "图示红框为演示参考（仅供参考）。" : null,
    imageCaption ?? null,
  ].filter(Boolean);

  const marks = paperMarks && paperMarks.length > 0 ? paperMarks : null;
  const showMarksMain = Boolean(showPaperMarksOnMain && marks);
  const grid = paperMarkGrid;

  return (
    <>
      <div
        className={`flex min-h-0 flex-col overflow-hidden rounded-card border-2 border-black/[0.08] bg-white shadow-card ${fillColumn ? "min-h-[18rem] flex-1 md:min-h-0" : ""}`}
      >
        <div className="relative flex min-h-0 flex-1 flex-col bg-gradient-to-b from-primary-tint/35 to-surface-page">
          <div className="relative flex min-h-0 flex-1 w-full items-center justify-center px-1 py-1 sm:px-2 sm:py-2">
            {imgFailed ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-black/[0.12] bg-white px-4 text-center">
                <p className="text-small font-semibold text-ink">图片未能加载</p>
                <p className="text-caption text-ink-muted">请确认已启动后端，且本页与接口同源（开发环境需走 Vite 代理）。可重新上传作业照。</p>
              </div>
            ) : (
              <img
                src={imageUrl}
                alt="作业预览"
                className={
                  fillColumn
                    ? "relative z-0 max-h-[min(78vh,56rem)] min-h-[14rem] w-full max-w-full flex-1 object-contain object-center md:min-h-[20rem]"
                    : "relative z-0 max-h-[min(72vh,52rem)] w-full max-w-full object-contain object-center"
                }
                onError={() => setImgFailed(true)}
              />
            )}
            {!imgFailed ? (
              <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-full">
                <ErrorOverlay errorRegions={errorRegions} />
                {showMarksMain && marks ? <PaperMarksOverlay paperMarks={marks} paperMarkGrid={grid} /> : null}
              </div>
            ) : null}
          </div>
          {!imgFailed ? (
            <div className="flex flex-wrap items-center justify-center gap-3 border-t border-black/[0.06] bg-white/95 px-3 py-3 sm:gap-4 sm:px-4">
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-black/[0.1] bg-white px-5 py-2.5 text-small font-extrabold text-ink shadow-sm transition hover:border-primary/35 hover:text-ink-navActive"
              >
                <ImageIcon className="h-5 w-5 shrink-0" {...CUTE_ICON} aria-hidden />
                查看原图
              </button>
              <button
                type="button"
                onClick={() => setPinned((v) => !v)}
                className={[
                  "inline-flex min-h-11 items-center gap-2 rounded-xl border px-5 py-2.5 text-small font-extrabold shadow-sm transition",
                  pinned
                    ? "border-brand bg-brand text-white hover:bg-brand-hover"
                    : "border-black/[0.1] bg-white text-ink hover:border-primary/35 hover:text-ink-navActive",
                ].join(" ")}
                aria-pressed={pinned}
              >
                {pinned ? (
                  <PinOff className="h-5 w-5 shrink-0" {...CUTE_ICON} aria-hidden />
                ) : (
                  <Pin className="h-5 w-5 shrink-0" {...CUTE_ICON} aria-hidden />
                )}
                {pinned ? "取消置顶" : "置顶原图"}
              </button>
            </div>
          ) : null}
        </div>
        {footerParts.length > 0 ? (
          <p className="border-t border-black/[0.06] px-3 py-2 text-center text-caption leading-snug text-ink-muted">{footerParts.join(" ")}</p>
        ) : null}
      </div>

      {typeof document !== "undefined" && pinned && imageUrl && !imgFailed && pinBox
        ? createPortal(
            <div
              className="pointer-events-auto fixed z-[220] flex flex-col overflow-hidden rounded-2xl border border-primary/25 bg-white/98 shadow-[0_20px_50px_rgba(15,90,75,0.18)] ring-2 ring-brand/15 backdrop-blur-sm"
              style={{ left: pinBox.x, top: pinBox.y, width: pinBox.w, height: pinBox.h }}
              role="dialog"
              aria-modal="false"
              aria-label="置顶原图"
            >
              <div
                className="flex h-9 shrink-0 cursor-move items-center gap-2 border-b border-black/[0.06] bg-white/95 pl-2 pr-1"
                onMouseDown={onPinHeaderDown}
              >
                <span className="min-w-0 flex-1 truncate text-[0.68rem] font-bold text-ink-muted">
                  拖动本栏移动窗口 · 滚轮缩放 · 图片区内按住拖动可平移卷面
                </span>
                <div className="flex shrink-0 items-center gap-0.5" onMouseDown={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="rounded-lg border border-black/[0.08] bg-white p-1.5 text-ink-muted hover:bg-primary-tint/70"
                    aria-label="缩小"
                    onClick={() => setPinScale((s) => clamp(Math.round((s - 0.2) * 100) / 100, 0.35, 4))}
                  >
                    <Minus className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
                  </button>
                  <span className="w-10 text-center text-[0.65rem] font-black tabular-nums text-ink">{Math.round(pinScale * 100)}%</span>
                  <button
                    type="button"
                    className="rounded-lg border border-black/[0.08] bg-white p-1.5 text-ink-muted hover:bg-primary-tint/70"
                    aria-label="放大"
                    onClick={() => setPinScale((s) => clamp(Math.round((s + 0.2) * 100) / 100, 0.35, 4))}
                  >
                    <Plus className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPinned(false)}
                    className="rounded-full p-2 text-ink-muted transition hover:bg-primary-tint/80 hover:text-ink-navActive"
                    aria-label="取消置顶"
                  >
                    <PinOff className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                  </button>
                </div>
              </div>
              <div
                className="relative flex min-h-0 flex-1 cursor-grab flex-col overflow-hidden overscroll-contain bg-surface-page/40 active:cursor-grabbing"
                style={{ padding: PIN_PAD }}
                onWheel={onPinWheel}
                onMouseDown={onPinViewportMouseDown}
              >
                <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-1">
                  <div
                    className="select-none"
                    style={{
                      transform: `translate(${pinPan.x}px, ${pinPan.y}px) scale(${pinScale})`,
                      transformOrigin: "center center",
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt=""
                      draggable={false}
                      className="max-h-[min(70vh,32rem)] max-w-full object-contain object-center sm:max-h-[min(72vh,36rem)]"
                    />
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label="调整窗口大小"
                onMouseDown={onResizeDown}
                className="absolute bottom-1 right-1 z-[2] h-5 w-5 cursor-nwse-resize rounded border border-primary/25 bg-white/90 shadow-sm hover:bg-primary-tint/80"
              />
            </div>,
            document.body,
          )
        : null}

      {typeof document !== "undefined" && zoomOpen && imageUrl
        ? createPortal(
            <div
              className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 p-3 backdrop-blur-[2px] sm:p-5"
              role="dialog"
              aria-modal="true"
              onClick={() => setZoomOpen(false)}
            >
              <button
                type="button"
                className="absolute right-3 top-3 z-[230] rounded-full border border-black/[0.08] bg-white/95 p-2 text-ink shadow-card ring-1 ring-primary/15 transition hover:bg-primary-tint/80 sm:right-5 sm:top-5"
                aria-label="关闭"
                onClick={() => setZoomOpen(false)}
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
              </button>
              <p className="pointer-events-none absolute left-1/2 top-3 z-[230] -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[0.65rem] font-bold text-ink-muted shadow-sm ring-1 ring-black/[0.06]">
                仅原图 · 滚轮缩放 {Math.round(zoomScale * 100)}%
              </p>
              <div
                className="relative max-h-[min(92vh,100%)] max-w-[min(96vw,56rem)] overflow-hidden rounded-[1.35rem] border border-black/[0.08] bg-white/96 p-2 shadow-[0_20px_60px_rgba(15,90,75,0.12)] ring-1 ring-primary/12 sm:p-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="relative mx-auto max-h-[min(88vh,calc(100vh-4rem))] max-w-full overflow-auto overscroll-contain rounded-xl bg-surface-page/80"
                  onWheel={onZoomWheel}
                >
                  <img
                    src={imageUrl}
                    alt=""
                    className="mx-auto block min-h-[40vh] w-full max-w-full object-contain object-center p-2"
                    style={{ transform: `scale(${zoomScale})`, transformOrigin: "center top" }}
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
