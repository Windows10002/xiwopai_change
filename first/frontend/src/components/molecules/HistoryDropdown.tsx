import type { CSSProperties } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Clock } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { buildGroupedHistoryRows, loadGradingHistory, type HistoryDisplayRow } from "@/lib/gradingHistory";

export type HistoryDropdownVariant = "nav" | "toolbar";

export type HistoryDropdownProps = {
  variant?: HistoryDropdownVariant;
  subjectScope?: "all" | "math" | "english";
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

type HistoryMenuPanelProps = {
  subjectScope: HistoryDropdownProps["subjectScope"];
  mathRows: HistoryDisplayRow[];
  engRows: HistoryDisplayRow[];
  rowLabel: (row: HistoryDisplayRow) => string;
  rowPct: (row: HistoryDisplayRow) => string;
  onClose: () => void;
  onGoMathPanel: () => void;
  onGoEnglishPanel: () => void;
  onPickMath: (row: HistoryDisplayRow) => void;
  onPickEnglish: (row: HistoryDisplayRow) => void;
};

function HistoryMenuPanel({
  subjectScope,
  mathRows,
  engRows,
  rowLabel,
  rowPct,
  onClose,
  onGoMathPanel,
  onGoEnglishPanel,
  onPickMath,
  onPickEnglish,
}: HistoryMenuPanelProps) {
  return (
    <>
      <div className="shrink-0 border-b border-black/[0.06] bg-gradient-to-r from-primary-tint/80 to-white px-4 py-3">
        <p className="text-small font-extrabold text-ink">最近批改</p>
        <p className="mt-0.5 text-[0.65rem] leading-relaxed text-ink-muted">
          {subjectScope === "all"
            ? "本机保存 · 数学与英语分区展示"
            : subjectScope === "math"
              ? "本机保存 · 仅数学作业"
              : "本机保存 · 仅英语作文"}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {subjectScope !== "english" ? (
          <div className={subjectScope === "all" ? "mb-3" : ""}>
            {subjectScope === "all" ? (
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[0.7rem] font-extrabold text-[#006D41]">数学</span>
                <button type="button" onClick={onGoMathPanel} className="text-[0.65rem] font-bold text-brand hover:underline">
                  打开数学批改页
                </button>
              </div>
            ) : null}
            {mathRows.length === 0 ? (
              <p className="rounded-lg bg-surface-page px-2 py-2 text-[0.7rem] text-ink-muted">暂无数学记录</p>
            ) : (
              <ul className="space-y-1">
                {mathRows.map((row) => (
                  <li key={row.type === "single" ? row.entry.id : row.groupKey}>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onPickMath(row);
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-black/[0.06] bg-white px-2.5 py-2 text-left text-[0.7rem] transition hover:border-brand/35 hover:bg-primary-tint/40"
                    >
                      <span className="min-w-0 flex-1 truncate font-semibold text-ink">{rowLabel(row)}</span>
                      <span className="shrink-0 font-black text-[#006D41]">{rowPct(row)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {subjectScope === "math" ? (
              <button
                type="button"
                onClick={onGoMathPanel}
                className="mt-2 w-full rounded-xl border border-black/[0.06] bg-surface-page py-2 text-[0.7rem] font-bold text-brand transition hover:bg-primary-tint/50"
              >
                在批改页侧栏查看全部
              </button>
            ) : null}
          </div>
        ) : null}
        {subjectScope !== "math" ? (
          <div>
            {subjectScope === "all" ? (
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[0.7rem] font-extrabold text-indigo-800">英语</span>
                <button type="button" onClick={onGoEnglishPanel} className="text-[0.65rem] font-bold text-brand hover:underline">
                  打开英语批改页
                </button>
              </div>
            ) : null}
            {engRows.length === 0 ? (
              <p className="rounded-lg bg-surface-page px-2 py-2 text-[0.7rem] text-ink-muted">暂无英语记录</p>
            ) : (
              <ul className="space-y-1">
                {engRows.map((row) => (
                  <li key={row.type === "single" ? row.entry.id : row.groupKey}>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onPickEnglish(row);
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-black/[0.06] bg-white px-2.5 py-2 text-left text-[0.7rem] transition hover:border-indigo-200 hover:bg-indigo-50/60"
                    >
                      <span className="min-w-0 flex-1 truncate font-semibold text-ink">{rowLabel(row)}</span>
                      <span className="shrink-0 font-black text-indigo-800">{rowPct(row)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {subjectScope === "english" ? (
              <button
                type="button"
                onClick={onGoEnglishPanel}
                className="mt-2 w-full rounded-xl border border-black/[0.06] bg-surface-page py-2 text-[0.7rem] font-bold text-brand transition hover:bg-indigo-50/80"
              >
                在批改页侧栏查看全部
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

export function HistoryDropdown({ variant = "nav", subjectScope = "all" }: HistoryDropdownProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const useFloatingMenu = variant === "toolbar";
  const [mathRows, setMathRows] = useState<HistoryDisplayRow[]>([]);
  const [engRows, setEngRows] = useState<HistoryDisplayRow[]>([]);

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
    if (subjectScope === "all") {
      setMathRows(math.slice(0, 8));
      setEngRows(eng.slice(0, 8));
    } else if (subjectScope === "math") {
      setMathRows(math.slice(0, 12));
      setEngRows([]);
    } else {
      setMathRows([]);
      setEngRows(eng.slice(0, 12));
    }
  }, [open, subjectScope]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    if (useFloatingMenu) placeFloatingMenu();
  }, [open, useFloatingMenu, placeFloatingMenu, mathRows.length, engRows.length]);

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

  const goMathPanel = () => {
    close();
    navigate("/math", { state: { openGradingHistory: true } });
  };

  const goEnglishPanel = () => {
    close();
    navigate("/english", { state: { openGradingHistory: true } });
  };

  const pickMath = (row: HistoryDisplayRow) => {
    if (row.type === "single") {
      navigate("/math", { state: { historyEntryId: row.entry.id } });
    } else {
      navigate("/math", { state: { historyEntryId: row.items[0]?.id, openGradingHistory: true } });
    }
  };

  const pickEnglish = (row: HistoryDisplayRow) => {
    if (row.type === "single") {
      navigate("/english", { state: { historyEntryId: row.entry.id } });
    } else {
      navigate("/english", { state: { historyEntryId: row.items[0]?.id, openGradingHistory: true } });
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
    mathRows,
    engRows,
    rowLabel,
    rowPct,
    onClose: close,
    onGoMathPanel: goMathPanel,
    onGoEnglishPanel: goEnglishPanel,
    onPickMath: pickMath,
    onPickEnglish: pickEnglish,
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
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Clock className="h-4 w-4 shrink-0 text-primary" {...CUTE_ICON} aria-hidden />
        {variant === "toolbar" ? "历史记录" : "批改历史"}
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-muted transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {floatingMenu}
      {inlineMenu}
    </div>
  );
}
