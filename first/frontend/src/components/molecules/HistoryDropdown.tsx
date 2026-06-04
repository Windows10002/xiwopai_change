import type { CSSProperties } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, Clock } from "lucide-react";

import { AppLink } from "@/components/atoms/AppLink";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { withAuthSlot } from "@/lib/authSlot";
import {
  buildGroupedHistoryRows,
  historyEntryFromRow,
  loadGradingHistory,
  type HistoryDisplayRow,
} from "@/lib/gradingHistory";
import { gradingPath, type GradingSubject } from "@/lib/teacherRoutes";

export type HistoryDropdownVariant = "nav" | "toolbar";

export type HistoryDropdownProps = {
  variant?: HistoryDropdownVariant;
  subjectScope?: "all" | "math" | "english" | "chinese";
  /** 未登录时点击跳转登录页（与批改页门禁一致） */
  requireLogin?: boolean;
};

const MENU_MIN_H = 160;

function computeFloatingMenuStyle(trigger: HTMLElement): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(352, window.innerWidth - 16);
  const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
  const spaceBelow = window.innerHeight - rect.bottom - 12;
  const spaceAbove = rect.top - 12;
  const openDown = spaceBelow >= MENU_MIN_H || spaceBelow >= spaceAbove;

  if (openDown) {
    return {
      position: "fixed",
      top: rect.bottom + 8,
      left,
      width,
      maxHeight: Math.max(MENU_MIN_H, Math.min(400, spaceBelow)),
      zIndex: 120,
    };
  }
  return {
    position: "fixed",
    top: Math.max(8, rect.top - 8),
    left,
    width,
    maxHeight: Math.max(MENU_MIN_H, Math.min(400, spaceAbove)),
    transform: "translateY(-100%)",
    zIndex: 120,
  };
}

const SUBJECT_SECTION: Record<
  GradingSubject,
  { label: string; titleClass: string; scoreClass: string; rowHover: string; empty: string }
> = {
  math: {
    label: "数学",
    titleClass: "text-[#006D41]",
    scoreClass: "text-[#006D41]",
    rowHover: "hover:border-brand/35 hover:bg-primary-tint/40",
    empty: "暂无数学记录",
  },
  english: {
    label: "英语",
    titleClass: "text-indigo-800",
    scoreClass: "text-indigo-800",
    rowHover: "hover:border-indigo-200 hover:bg-indigo-50/60",
    empty: "暂无英语记录",
  },
  chinese: {
    label: "语文",
    titleClass: "text-amber-900",
    scoreClass: "text-amber-900",
    rowHover: "hover:border-amber-200 hover:bg-amber-50/70",
    empty: "暂无语文记录",
  },
};

type HistoryMenuPanelProps = {
  subjectScope: HistoryDropdownProps["subjectScope"];
  rowsBySubject: Record<GradingSubject, HistoryDisplayRow[]>;
  rowLabel: (row: HistoryDisplayRow) => string;
  rowPct: (row: HistoryDisplayRow) => string;
  onClose: () => void;
  onGoPanel: (subject: GradingSubject) => void;
  onPickRow: (row: HistoryDisplayRow) => void;
};

function HistoryMenuPanel({
  subjectScope,
  rowsBySubject,
  rowLabel,
  rowPct,
  onClose,
  onGoPanel,
  onPickRow,
}: HistoryMenuPanelProps) {
  const sections: GradingSubject[] =
    subjectScope === "all"
      ? ["math", "english", "chinese"]
      : [subjectScope === "english" ? "english" : subjectScope === "chinese" ? "chinese" : "math"];

  const scopeHint =
    subjectScope === "all"
      ? "本机保存 · 按学科分区，点击打开对应批改页"
      : `本机保存 · 仅${SUBJECT_SECTION[sections[0]!].label}作业`;

  return (
    <>
      <div className="shrink-0 border-b border-black/[0.06] bg-gradient-to-r from-primary-tint/80 to-white px-4 py-3">
        <p className="text-small font-extrabold text-ink">最近批改</p>
        <p className="mt-0.5 text-[0.65rem] leading-relaxed text-ink-muted">{scopeHint}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {sections.map((sub, idx) => {
          const ui = SUBJECT_SECTION[sub];
          const rows = rowsBySubject[sub];
          const showHeader = subjectScope === "all";
          const singleScope = subjectScope !== "all";
          return (
            <div key={sub} className={idx > 0 && showHeader ? "mt-3" : ""}>
              {showHeader ? (
                <div className="mb-1.5 flex items-center justify-between">
                  <span className={`text-[0.7rem] font-extrabold ${ui.titleClass}`}>{ui.label}</span>
                  <button
                    type="button"
                    onClick={() => onGoPanel(sub)}
                    className="text-[0.65rem] font-bold text-brand hover:underline"
                  >
                    打开{ui.label}批改页
                  </button>
                </div>
              ) : null}
              {rows.length === 0 ? (
                <p className="rounded-lg bg-surface-page px-2 py-2 text-[0.7rem] text-ink-muted">{ui.empty}</p>
              ) : (
                <ul className="space-y-1">
                  {rows.map((row) => (
                    <li key={row.type === "single" ? row.entry.id : row.groupKey}>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onPickRow(row);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-black/[0.06] bg-white px-2.5 py-2 text-left text-[0.7rem] transition ${ui.rowHover}`}
                      >
                        <span className="min-w-0 flex-1 truncate font-semibold text-ink">{rowLabel(row)}</span>
                        <span className={`shrink-0 font-black ${ui.scoreClass}`}>{rowPct(row)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {singleScope ? (
                <button
                  type="button"
                  onClick={() => onGoPanel(sub)}
                  className="mt-2 w-full rounded-xl border border-black/[0.06] bg-surface-page py-2 text-[0.7rem] font-bold text-brand transition hover:bg-primary-tint/50"
                >
                  在批改页侧栏查看全部
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}

const navLinkClass = [
  "inline-flex min-h-11 items-center gap-1 rounded-full border border-black/[0.06] bg-white px-4 py-2 text-small font-semibold text-ink shadow-sm transition",
  "hover:border-primary/25 hover:text-[#006D41] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
].join(" ");

export function HistoryDropdown({ variant = "nav", subjectScope = "all", requireLogin = false }: HistoryDropdownProps) {
  const navigate = useNavigate();
  const location = useLocation();

  if (variant === "nav") {
    if (requireLogin) {
      return (
        <AppLink
          to={`/login?redirect=${encodeURIComponent(withAuthSlot("/class-analytics?tab=history"))}`}
          className={navLinkClass}
        >
          <Clock className="h-4 w-4 shrink-0 text-primary" {...CUTE_ICON} aria-hidden />
          批改历史
        </AppLink>
      );
    }
    return (
      <AppLink to={withAuthSlot("/class-analytics?tab=history")} className={navLinkClass}>
        <Clock className="h-4 w-4 shrink-0 text-primary" {...CUTE_ICON} aria-hidden />
        批改历史
      </AppLink>
    );
  }
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const useFloatingMenu = variant === "toolbar";
  const [rowsBySubject, setRowsBySubject] = useState<Record<GradingSubject, HistoryDisplayRow[]>>({
    math: [],
    english: [],
    chinese: [],
  });

  const close = useCallback(() => setOpen(false), []);

  const placeFloatingMenu = useCallback(() => {
    if (!triggerRef.current) return;
    setMenuStyle(computeFloatingMenuStyle(triggerRef.current));
  }, []);

  useEffect(() => {
    if (!open) return;
    const all = loadGradingHistory();
    const math = buildGroupedHistoryRows(all.filter((e) => e.subject === "math"));
    const eng = buildGroupedHistoryRows(all.filter((e) => e.subject === "english"));
    const chinese = buildGroupedHistoryRows(all.filter((e) => e.subject === "chinese"));
    const limit = subjectScope === "all" ? 8 : 12;
    if (subjectScope === "all") {
      setRowsBySubject({
        math: math.slice(0, limit),
        english: eng.slice(0, limit),
        chinese: chinese.slice(0, limit),
      });
    } else if (subjectScope === "math") {
      setRowsBySubject({ math: math.slice(0, limit), english: [], chinese: [] });
    } else if (subjectScope === "chinese") {
      setRowsBySubject({ math: [], english: [], chinese: chinese.slice(0, limit) });
    } else {
      setRowsBySubject({ math: [], english: eng.slice(0, limit), chinese: [] });
    }
  }, [open, subjectScope]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    if (useFloatingMenu) placeFloatingMenu();
  }, [open, useFloatingMenu, placeFloatingMenu, rowsBySubject.math.length, rowsBySubject.english.length, rowsBySubject.chinese.length]);

  useEffect(() => {
    if (!open || !useFloatingMenu) return;
    const onReflow = () => placeFloatingMenu();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, useFloatingMenu, placeFloatingMenu]);

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

  const goPanel = (sub: GradingSubject) => {
    close();
    navigate(gradingPath(sub), { state: { openGradingHistory: true } });
  };

  const pickRow = (row: HistoryDisplayRow) => {
    const entry = historyEntryFromRow(row);
    if (!entry) return;
    const path = gradingPath(entry.subject);
    if (row.type === "single") {
      navigate(path, { state: { historyEntryId: entry.id } });
    } else {
      navigate(path, { state: { historyEntryId: entry.id, openGradingHistory: true } });
    }
  };

  const rowLabel = (row: HistoryDisplayRow): string => {
    if (row.type === "single") return row.entry.fileName;
    return row.groupName ? `${row.groupName}（${row.items.length} 张）` : `文件夹（${row.items.length} 张）`;
  };

  const rowPct = (row: HistoryDisplayRow): string => {
    if (row.type === "single") return `${row.entry.detail.scorePercent}%`;
    const avg = Math.round(row.items.reduce((s, i) => s + i.detail.scorePercent, 0) / row.items.length);
    return `均 ${avg}%`;
  };

  const panelProps: HistoryMenuPanelProps = {
    subjectScope,
    rowsBySubject,
    rowLabel,
    rowPct,
    onClose: close,
    onGoPanel: goPanel,
    onPickRow: pickRow,
  };

  const shellClass =
    "flex flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-2xl ring-1 ring-primary/10";

  const triggerClass =
    variant === "toolbar"
      ? [
          "inline-flex min-h-9 items-center gap-1 rounded-xl bg-primary-tint px-3 py-1.5 text-caption font-bold text-[#006D41] shadow-sm ring-1 ring-brand/18 transition",
          "hover:bg-primary-light hover:ring-brand/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        ].join(" ")
      : [
          "inline-flex min-h-11 items-center gap-1 rounded-full border border-black/[0.06] bg-white px-4 py-2 text-small font-semibold text-ink shadow-sm transition",
          "hover:border-primary/25 hover:text-[#006D41] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        ].join(" ");

  const menuVisible = open && (!useFloatingMenu || menuStyle);

  const floatingMenu =
    menuVisible && useFloatingMenu && menuStyle
      ? createPortal(
          <div ref={menuRef} role="menu" aria-label="最近批改" className={shellClass} style={menuStyle}>
            <HistoryMenuPanel {...panelProps} />
          </div>,
          document.body,
        )
      : null;

  const inlineMenu =
    menuVisible && !useFloatingMenu ? (
      <div
        ref={menuRef}
        role="menu"
        aria-label="最近批改"
        className={`absolute right-0 top-[calc(100%+0.35rem)] z-[120] w-[min(22rem,calc(100vw-2rem))] max-h-[min(70vh,22rem)] ${shellClass}`}
      >
        <HistoryMenuPanel {...panelProps} />
      </div>
    ) : null;

  return (
    <div className="relative z-[120] shrink-0" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (requireLogin) {
            navigate(`/login?redirect=${encodeURIComponent(location.pathname || "/")}`);
            return;
          }
          setOpen((v) => !v);
        }}
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Clock className="h-4 w-4 shrink-0 text-primary" {...CUTE_ICON} aria-hidden />
        批改历史
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-muted transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {floatingMenu}
      {inlineMenu}
    </div>
  );
}
