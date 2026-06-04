import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleX, ClipboardList, FolderOpen, ImagePlus, UploadCloud } from "lucide-react";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { IpMascotLoading, IpMascotPointGuide } from "@/components/atoms/IpMascot";
import {
  GRADING_UPLOAD_ACCEPT,
  GRADING_UPLOAD_HINT,
  isAllowedGradingUploadFile,
} from "@/lib/gradingUploadFiles";
import type { UploadPanelStatus } from "@/types/grading";

/** 递归读取拖入的文件夹（Chrome/Edge 等）；仅 webkitGetAsEntry 可用时走此路径 */
async function readAllDirectoryEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const acc: FileSystemEntry[] = [];
  let batch: FileSystemEntry[];
  do {
    batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    acc.push(...batch);
  } while (batch.length > 0);
  return acc;
}

async function collectImageFilesFromEntry(entry: FileSystemEntry, out: File[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      (entry as FileSystemFileEntry).file(resolve, reject);
    });
    if (isAllowedGradingUploadFile(file)) out.push(file);
    return;
  }
  const dir = entry as FileSystemDirectoryEntry;
  const children = await readAllDirectoryEntries(dir.createReader());
  await Promise.all(children.map((ch) => collectImageFilesFromEntry(ch, out)));
}

async function filesFromDataTransferRoots(roots: FileSystemEntry[], dt: DataTransfer): Promise<File[]> {
  if (!roots.length) {
    return Array.from(dt.files).filter(isAllowedGradingUploadFile);
  }
  const collected: File[] = [];
  await Promise.all(roots.map((r) => collectImageFilesFromEntry(r, collected)));
  if (collected.length) return collected;
  return Array.from(dt.files).filter(isAllowedGradingUploadFile);
}

/** 必须在 drop 事件同步阶段调用：拖文件夹时异步后再读 dataTransfer / webkitGetAsEntry 会失效 */
function captureFileSystemRootsSync(dt: DataTransfer): FileSystemEntry[] {
  const roots: FileSystemEntry[] = [];
  const items = dt.items;
  for (let i = 0; i < items.length; i += 1) {
    const it = items[i];
    if (it.kind !== "file" || typeof it.webkitGetAsEntry !== "function") continue;
    try {
      const ent = it.webkitGetAsEntry();
      if (ent) roots.push(ent);
    } catch {
      /* ignore */
    }
  }
  return roots;
}

/** Chromium：DataTransferItem.getAsFileSystemHandle（目录拖放等） */
async function collectFromFileSystemHandle(handle: FileSystemHandle, out: File[]): Promise<void> {
  if (handle.kind === "file") {
    const file = await (handle as FileSystemFileHandle).getFile();
    if (isAllowedGradingUploadFile(file)) out.push(file);
    return;
  }
  const dir = handle as FileSystemDirectoryHandle;
  const iter = (dir as unknown as { values?: () => AsyncIterable<FileSystemHandle> }).values;
  if (typeof iter !== "function") return;
  for await (const child of iter.call(dir)) {
    await collectFromFileSystemHandle(child, out);
  }
}

async function filesFromDataTransferHandles(dt: DataTransfer): Promise<File[] | null> {
  const items = dt.items;
  const getAs = (items[0] as unknown as { getAsFileSystemHandle?: () => Promise<FileSystemHandle> })?.getAsFileSystemHandle;
  if (typeof getAs !== "function") return null;
  const collected: File[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const fn = (items[i] as unknown as { getAsFileSystemHandle?: () => Promise<FileSystemHandle> }).getAsFileSystemHandle;
    if (typeof fn !== "function") continue;
    try {
      const h = await fn.call(items[i]);
      if (h) await collectFromFileSystemHandle(h, collected);
    } catch {
      /* ignore */
    }
  }
  return collected.length ? collected : null;
}

type UploadDropzoneProps = {
  title?: string;
  hint?: string;
  onFiles?: (files: FileList | null) => void;
  /** 教师端：从已发布任务关联提交 */
  onPickFromPublishedTask?: () => void;
  /** 由上层驱动的上传全流程状态 */
  status?: UploadPanelStatus;
  /** 上传流程进行中时禁止再次拖入 */
  locked?: boolean;
  /** 批改结果页：压缩高度，把空间留给下方原图 */
  compact?: boolean;
};

/**
 * 虚线拖拽上传区：拖拽高亮 + 识别中（IP 眨眼转圈 + 进度条）+ 成功 / 失败反馈；空闲时 IP 指向引导。
 */
export function UploadDropzone({
  title = "拖放照片到此处",
  hint = GRADING_UPLOAD_HINT,
  onFiles,
  onPickFromPublishedTask,
  status = { phase: "idle" },
  locked = false,
  compact = false,
}: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const dragDepthRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const pickerPanelRef = useRef<HTMLDivElement | null>(null);

  const openFilePicker = useCallback(() => {
    if (!locked) {
      setSourcePickerOpen(false);
      fileInputRef.current?.click();
    }
  }, [locked]);

  const openFolderPicker = useCallback(() => {
    if (!locked) {
      setSourcePickerOpen(false);
      folderInputRef.current?.click();
    }
  }, [locked]);

  const onDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (locked) return;
      e.preventDefault();
      e.stopPropagation();
      dragDepthRef.current += 1;
      setDragging(true);
      try {
        e.dataTransfer.dropEffect = "copy";
      } catch {
        /* ignore */
      }
    },
    [locked]
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (locked) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        e.dataTransfer.dropEffect = "copy";
      } catch {
        /* ignore */
      }
    },
    [locked]
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (locked) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      dragDepthRef.current = 0;
      setDragging(false);
      const dt = e.dataTransfer;
      const syncRoots = captureFileSystemRootsSync(dt);
      void (async () => {
        try {
          let list: File[] = [];
          if (syncRoots.length) {
            list = await filesFromDataTransferRoots(syncRoots, dt);
          } else {
            const fromHandles = await filesFromDataTransferHandles(dt);
            if (fromHandles?.length) list = fromHandles;
            else list = Array.from(dt.files).filter(isAllowedGradingUploadFile);
          }
          if (!list.length) {
            onFiles?.(dt.files);
            return;
          }
          const out = new DataTransfer();
          list.forEach((f) => out.items.add(f));
          onFiles?.(out.files);
        } catch {
          onFiles?.(dt.files);
        }
      })();
    },
    [locked, onFiles]
  );

  const busy = status.phase === "uploading" || status.phase === "success" || status.phase === "error" || status.phase === "info";

  /** 弹层打开时把焦点移到第一个操作按钮，避免外层可聚焦区域在部分浏览器里出现「文本插入光标」叠在「取消」上 */
  useEffect(() => {
    if (!sourcePickerOpen || busy) return;
    const id = window.setTimeout(() => {
      pickerPanelRef.current?.querySelector<HTMLButtonElement>("button[type='button']")?.focus({ preventScroll: true });
    }, 0);
    return () => clearTimeout(id);
  }, [sourcePickerOpen, busy]);

  useEffect(() => {
    if (!sourcePickerOpen || busy) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSourcePickerOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sourcePickerOpen, busy]);

  const openSourcePicker = useCallback(() => {
    if (!locked && !busy) setSourcePickerOpen(true);
  }, [locked, busy]);

  const openModalFromZone = useCallback(
    (e: React.SyntheticEvent) => {
      e.stopPropagation();
      if (!locked && !busy && !sourcePickerOpen) openSourcePicker();
    },
    [locked, busy, sourcePickerOpen, openSourcePicker]
  );

  const borderClasses = (() => {
    if (status.phase === "error") {
      return "border-[3px] border-dashed border-red-500/80 bg-red-50/90";
    }
    if (status.phase === "info") {
      return "border-[3px] border-dashed border-primary/60 bg-primary-tint/40 backdrop-blur-sm";
    }
    if (status.phase === "success") {
      return "border-[3px] border-dashed border-primary/70 bg-primary-tint/45 backdrop-blur-sm";
    }
    if (status.phase === "uploading") {
      return "border-[3px] border-dashed border-primary/70 bg-white/40 backdrop-blur-sm";
    }
    if (dragging) {
      return "border-[4px] border-dashed border-[#389e0d] bg-primary-tint shadow-[0_0_0_5px_rgba(82,196,26,0.22)]";
    }
    return "border-2 border-dashed border-black/[0.12] bg-white/45 backdrop-blur-sm hover:border-brand/40 hover:bg-white/55";
  })();

  const outerTabIndex = locked || (sourcePickerOpen && !busy) ? -1 : undefined;

  const modalZoneClass =
    "cursor-pointer rounded-xl outline-none transition hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2";

  return (
    <div
      role="group"
      tabIndex={outerTabIndex}
      aria-label="点击选择作业图片、PDF 或文件夹，也可以拖拽到这里；或使用下方快捷按钮直接选择。"
      onClick={(e) => {
        if (locked || busy || sourcePickerOpen) return;
        /* 仅点到虚线框自身的留白时打开弹层；其它区域由各自子块处理，避免与「选择图片/文件夹」抢事件 */
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          openSourcePicker();
        }
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        if (!locked && !busy && !sourcePickerOpen) openSourcePicker();
      }}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={[
        "relative cursor-pointer rounded-card text-center transition-[border-width,background-color,border-color,box-shadow,transform] duration-button ease-smooth hover:-translate-y-0.5",
        compact ? "shrink-0 px-4 py-4 md:px-5 md:py-5" : "px-5 py-10 md:px-8 md:py-12",
        borderClasses,
        locked && !busy ? "pointer-events-none opacity-80" : "",
        /* 弹层在组件内部 z-index 无法压过后序兄弟（如「开始批改」），整区需提升层级 */
        sourcePickerOpen && !busy ? "z-40 isolate min-h-[min(26rem,72vh)] overflow-hidden" : "",
      ].join(" ")}
    >
      {sourcePickerOpen && !busy ? (
        <div
          className="glass-scrim absolute inset-0 z-20 flex select-none items-center justify-center overflow-y-auto rounded-card px-3 py-5 sm:px-4 sm:py-6"
          role="dialog"
          aria-modal="true"
          aria-label="选择添加方式"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="absolute inset-0 z-[21]"
            aria-hidden
            onClick={() => setSourcePickerOpen(false)}
          />
          <div
            ref={pickerPanelRef}
            className="glass-panel relative z-[30] w-full min-w-[17.5rem] max-w-sm select-none rounded-2xl p-5"
          >
            <p className="text-center text-small font-extrabold text-ink">如何添加作业？</p>
            <p className="mt-1 text-center text-caption leading-relaxed text-ink-muted">
              可选多张图片或 PDF；文件夹内图片与 PDF 均可识别。
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openFilePicker();
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-caption font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#36A814]"
              >
                <UploadCloud className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                选择图片或 PDF（可多选）
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openFolderPicker();
                }}
                className="glass-surface inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-caption font-bold text-[#51c527] shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30"
              >
                <FolderOpen className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                选择文件夹
              </button>
              {onPickFromPublishedTask ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSourcePickerOpen(false);
                    onPickFromPublishedTask();
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200/80 bg-violet-50/90 px-4 py-3 text-caption font-bold text-violet-900 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-100/90"
                >
                  <ClipboardList className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                  选择从发布的任务中提交
                </button>
              ) : null}
              <div className="mt-4 flex justify-center border-t border-black/[0.06] pt-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSourcePickerOpen(false);
                  }}
                  className="glass-surface inline-flex min-h-9 cursor-pointer select-none items-center rounded-full px-5 py-2 text-caption font-semibold text-ink-muted caret-transparent outline-none shadow-sm transition hover:border-primary/30 hover:text-[#006D41] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <input
        ref={fileInputRef}
        type="file"
        accept={GRADING_UPLOAD_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          setSourcePickerOpen(false);
          onFiles?.(e.currentTarget.files);
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        accept={GRADING_UPLOAD_ACCEPT}
        multiple
        className="hidden"
        {...({ webkitdirectory: "" } as object)}
        onChange={(e) => {
          setSourcePickerOpen(false);
          onFiles?.(e.currentTarget.files);
        }}
      />
      {busy ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-5">
          {status.phase === "uploading" ? (
            <>
              <IpMascotLoading />
              <div className="w-full max-w-xs space-y-2">
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-emerald-400 to-accent-mint transition-[width] duration-300 ease-out"
                    style={{ width: `${status.progress}%` }}
                  />
                </div>
                <p className="text-body font-semibold text-ink">{status.message || "正在识别中，请稍候..."}</p>
                <p className="text-caption text-ink-muted">进度 {Math.round(status.progress)}%</p>
              </div>
            </>
          ) : null}

          {status.phase === "success" || status.phase === "info" ? (
            <>
              <span className="flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full bg-primary-tint ring-4 ring-primary/15">
                <CheckCircle2 className="h-12 w-12 text-primary" {...CUTE_ICON} aria-hidden />
              </span>
              <p className="text-body font-bold text-ink">{status.message || "识别成功，正在批改..."}</p>
              <p className="text-small text-ink-muted">{status.phase === "info" ? "点击下方开始批改，可批改整个文件夹。" : "即将为你生成得分与评语"}</p>
            </>
          ) : null}

          {status.phase === "error" ? (
            <>
              <span className="flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full bg-red-50 ring-4 ring-red-200/60">
                <CircleX className="h-12 w-12 text-red-500" {...CUTE_ICON} aria-hidden />
              </span>
              <p className="text-body font-bold text-red-600">操作未成功</p>
              <p className="max-w-sm text-small leading-relaxed text-ink-muted">{status.message}</p>
            </>
          ) : null}
        </div>
      ) : !sourcePickerOpen ? (
        <div className={`mx-auto flex w-full max-w-md flex-col items-center ${compact ? "gap-2" : "gap-3"}`}>
          <div
            role="button"
            tabIndex={0}
            className={`flex w-full flex-col items-center ${compact ? "gap-2" : "gap-3"} px-1 py-0.5 ${modalZoneClass}`}
            onClick={openModalFromZone}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              openModalFromZone(e);
            }}
          >
            <span
              className={[
                "flex items-center justify-center rounded-[1.65rem] border text-brand shadow-sm transition-all duration-button ease-smooth",
                compact ? "h-14 w-14" : "h-20 w-20 md:h-24 md:w-24",
                dragging ? "border-brand bg-white/45 shadow-card ring-4 ring-primary/20 backdrop-blur-sm" : "border-brand/25 bg-white/35 ring-2 ring-primary/10 backdrop-blur-sm",
              ].join(" ")}
            >
              <ImagePlus className={compact ? "h-7 w-7" : "h-10 w-10 md:h-12 md:w-12"} {...CUTE_ICON} aria-hidden />
            </span>
            <p className={compact ? "text-small font-semibold text-gray-900" : "text-body font-semibold text-gray-900"}>{title}</p>
            {compact ? (
              <p className="text-caption text-ink-muted">{hint}</p>
            ) : (
            <p className="text-small text-ink-muted">
              {hint}
              <span
                className={[
                  "mt-2 block rounded-tile px-3 py-2 text-caption transition-colors duration-button ease-smooth",
                  dragging
                    ? "border border-brand/35 bg-primary-tint/40 font-semibold text-[#51c527] backdrop-blur-sm"
                    : "border border-transparent text-ink-subtle",
                ].join(" ")}
              >
                {dragging
                  ? "松开鼠标即可上传；边框加粗、底色微亮表示已进入拖拽区域。"
                  : "点上方说明区或底部 π 提示可打开添加方式；点「选择图片或 PDF」「选择文件夹」直接打开系统选择；两按钮之间的空白也可打开添加方式。支持拖入。"}
                {onPickFromPublishedTask
                  ? " 教师还可「选择从发布的任务中提交」，将批改关联到已发布任务。"
                  : ""}
              </span>
            </p>
            )}
          </div>
          <div
            className="mt-1 flex min-h-[2.75rem] w-full flex-wrap items-center justify-center gap-2 px-1"
            onClick={(e) => {
              if (locked || busy || sourcePickerOpen) return;
              if (e.target === e.currentTarget) openModalFromZone(e);
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openFilePicker();
              }}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-caption font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#36A814]"
            >
              <UploadCloud className="h-4 w-4 pointer-events-none" {...CUTE_ICON} aria-hidden />
              选择图片或 PDF
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openFolderPicker();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-[#f4fcf0]/35 px-4 py-2 text-caption font-bold text-[#006D41] shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-brand/45 hover:bg-[#f4fcf0]/50"
            >
              <FolderOpen className="h-4 w-4 pointer-events-none" {...CUTE_ICON} aria-hidden />
              选择文件夹
            </button>
            {onPickFromPublishedTask ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPickFromPublishedTask();
                }}
                className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-violet-50/90 px-4 py-2 text-caption font-bold text-violet-900 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-100/90"
              >
                <ClipboardList className="h-4 w-4 pointer-events-none" {...CUTE_ICON} aria-hidden />
                从发布任务提交
              </button>
            ) : null}
          </div>
          {!compact ? (
          <div
            role="button"
            tabIndex={0}
            className={`glass-panel-inner mt-1 flex max-w-full items-center gap-3 rounded-tile px-3 py-2.5 text-left ${modalZoneClass}`}
            onClick={openModalFromZone}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              openModalFromZone(e);
            }}
          >
            <IpMascotPointGuide className="h-14 w-14 shrink-0 opacity-95 pointer-events-none" />
            <p className="text-caption leading-relaxed text-ink-muted">
              π 指着上方上传区：照片或 PDF 作业放进来，我再帮你批改～
            </p>
          </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
