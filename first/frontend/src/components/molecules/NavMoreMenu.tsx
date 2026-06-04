import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, MessageSquareWarning, MessagesSquare } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { withAuthSlot } from "@/lib/authSlot";

type NavMoreMenuProps = {
  showFeedback: boolean;
  showDisputes: boolean;
  disputePending?: number;
};

function MoreMenuItem({
  to,
  onNavigate,
  children,
}: {
  to: string;
  onNavigate: () => void;
  children: ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname === to;

  return (
    <span
      role="link"
      tabIndex={0}
      className={[
        "flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left text-small font-semibold transition",
        isActive ? "bg-primary-light text-ink-navActive" : "text-ink/90 hover:bg-gray-50",
      ].join(" ")}
      onClick={() => {
        navigate(withAuthSlot(to));
        onNavigate();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(withAuthSlot(to));
          onNavigate();
        }
      }}
    >
      {children}
    </span>
  );
}

/** 顶栏次要入口：判题反馈、学生申诉 */
export function NavMoreMenu({ showFeedback, showDisputes, disputePending = 0 }: NavMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!showFeedback && !showDisputes) return null;

  const close = () => setOpen(false);

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-4 py-2.5 text-small font-semibold text-ink/80 transition",
          "hover:bg-gray-50 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
          open ? "bg-gray-50 text-ink" : "",
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="true"
      >
        更多
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.35rem)] z-[120] min-w-[10.5rem] overflow-hidden rounded-2xl border border-black/[0.08] bg-white p-1.5 shadow-2xl ring-1 ring-primary/10"
        >
          {showFeedback ? (
            <MoreMenuItem to="/feedback-dashboard" onNavigate={close}>
              <MessagesSquare className="h-4 w-4 text-primary" {...CUTE_ICON} aria-hidden />
              判题反馈
            </MoreMenuItem>
          ) : null}
          {showDisputes ? (
            <MoreMenuItem to="/disputes" onNavigate={close}>
              <MessageSquareWarning className="h-4 w-4 text-amber-700" {...CUTE_ICON} aria-hidden />
              学生申诉
              {disputePending > 0 ? (
                <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.6rem] font-bold text-amber-900">
                  {disputePending > 9 ? "9+" : disputePending}
                </span>
              ) : null}
            </MoreMenuItem>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
