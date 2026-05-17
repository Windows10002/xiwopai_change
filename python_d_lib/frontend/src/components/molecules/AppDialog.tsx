import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";

/** 弹窗内浅绿渐变内容块（与 AI 使用帮助一致） */
export const APP_DIALOG_PANEL =
  "rounded-2xl border border-primary/12 bg-gradient-to-br from-white via-primary-tint/50 to-[#eaf6e4]/40 px-4 py-3.5";

export const APP_DIALOG_PANEL_TITLE = "text-small font-bold text-[#51c527]";

type AppDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  titleId?: string;
  describedById?: string;
  size?: "md" | "lg";
  zIndex?: number;
  closeDisabled?: boolean;
  backdropLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
};

const SIZE_CLASS = {
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

/**
 * 全屏居中弹窗（挂载到 body），样式与「AI 使用帮助」一致，避免在侧栏/滚动容器内被裁切。
 */
export function AppDialog({
  open,
  onClose,
  title,
  subtitle,
  titleId = "app-dialog-title",
  describedById,
  size = "md",
  zIndex = 100,
  closeDisabled = false,
  backdropLabel = "关闭",
  children,
  footer,
}: AppDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closeDisabled) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, closeDisabled]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-end justify-center p-4 sm:items-center"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={describedById}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        aria-label={backdropLabel}
        disabled={closeDisabled}
        onClick={() => {
          if (!closeDisabled) onClose();
        }}
      />
      <div
        className={`relative z-10 flex max-h-[min(92vh,40rem)] w-full ${SIZE_CLASS[size]} flex-col overflow-hidden rounded-[1.35rem] border border-black/[0.08] bg-white shadow-[0_24px_80px_rgba(15,90,75,0.2)]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-body font-extrabold text-ink">
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-caption leading-snug text-ink-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white text-ink-muted transition hover:border-primary/30 hover:text-ink disabled:opacity-50"
            aria-label="关闭"
          >
            <X className="h-5 w-5" {...CUTE_ICON} />
          </button>
        </div>
        <div
          id={describedById}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4"
        >
          {children}
        </div>
        {footer ? <div className="shrink-0 border-t border-black/[0.06] px-5 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
