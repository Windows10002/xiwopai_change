import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Calculator, ChevronDown, Languages } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { withAuthSlot } from "@/lib/authSlot";

const SUBJECTS = [
  { to: "/math", label: "数学批改", icon: Calculator },
  { to: "/english", label: "英语批改", icon: Languages },
  { to: "/chinese", label: "语文批改", icon: BookOpen },
] as const;

const MENU_WIDTH = 168;

function computeMenuStyle(trigger: HTMLElement): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  const left = Math.max(8, Math.min(rect.left + rect.width / 2 - MENU_WIDTH / 2, window.innerWidth - MENU_WIDTH - 8));
  return {
    position: "fixed",
    top: rect.bottom + 6,
    left,
    width: MENU_WIDTH,
    zIndex: 120,
  };
}

/** 顶栏「批改」三科下拉（Portal 渲染，避免主导航 overflow 裁切） */
export function GradingNavDropdown() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  const isGradingActive = SUBJECTS.some((s) => location.pathname === s.to);

  const placeMenu = useCallback(() => {
    if (!triggerRef.current) return;
    setMenuStyle(computeMenuStyle(triggerRef.current));
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    placeMenu();
  }, [open, placeMenu]);

  useEffect(() => {
    if (!open) return;
    const onReflow = () => placeMenu();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, placeMenu]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const menu =
    open && menuStyle
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="选择批改学科"
            style={menuStyle}
            className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white p-1.5 shadow-2xl ring-1 ring-primary/10"
          >
            {SUBJECTS.map(({ to, label, icon: Icon }) => (
              <button
                key={to}
                type="button"
                role="menuitem"
                onClick={() => {
                  navigate(withAuthSlot(to));
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-small font-semibold transition ${
                  location.pathname === to ? "bg-primary-light text-ink-navActive" : "text-ink/90 hover:bg-gray-50"
                }`}
              >
                <Icon className="h-4 w-4 text-primary" {...CUTE_ICON} aria-hidden />
                {label}
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={[
          "group relative inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-4 py-2.5 text-small font-semibold outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
          isGradingActive ? "bg-primary-light text-ink-navActive" : "text-ink/80 hover:bg-gray-50 hover:text-ink",
        ].join(" ")}
      >
        <span>批改</span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />
        {isGradingActive ? (
          <span
            className="pointer-events-none absolute inset-x-3 bottom-1.5 h-[3px] rounded-full bg-primary"
            aria-hidden
          />
        ) : null}
      </button>
      {menu}
    </div>
  );
}
