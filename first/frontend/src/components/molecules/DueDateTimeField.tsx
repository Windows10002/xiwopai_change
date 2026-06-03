import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { parseDueDateTime } from "@/lib/assignmentDeadline";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"] as const;
const PANEL_W = 248;
const PANEL_H = 320;
const GAP = 6;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function splitValue(value: string): { date: string; time: string } {
  if (!value.trim()) return { date: "", time: "18:00" };
  const [date, rawTime] = value.split("T");
  return { date: date || "", time: (rawTime || "18:00").slice(0, 5) };
}

function combine(date: string, time: string): string {
  if (!date) return "";
  return `${date}T${time || "18:00"}`;
}

function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function parseDate(date: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function parseTime(time: string): { h: number; min: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return { h: 18, min: 0 };
  return { h: Number(m[1]), min: Number(m[2]) };
}

function formatTrigger(value: string) {
  return parseDueDateTime(value);
}

function formatMonthTitle(year: number, month: number): string {
  return `${year}年${month}月`;
}

function startOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function isPastDay(y: number, m: number, d: number): boolean {
  const picked = new Date(y, m - 1, d);
  picked.setHours(0, 0, 0, 0);
  return picked < startOfToday();
}

function isSameDay(a: { y: number; m: number; d: number }, b: { y: number; m: number; d: number }) {
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

function isToday(y: number, m: number, d: number): boolean {
  const t = new Date();
  return t.getFullYear() === y && t.getMonth() + 1 === m && t.getDate() === d;
}

type CalendarCell = { day: number; disabled: boolean };

function buildCalendar(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const total = daysInMonth(year, month);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < offset; i += 1) cells.push({ day: 0, disabled: true });
  for (let d = 1; d <= total; d += 1) {
    cells.push({ day: d, disabled: isPastDay(year, month, d) });
  }
  while (cells.length % 7 !== 0) cells.push({ day: 0, disabled: true });
  return cells;
}

type Preset = { label: string; get: () => string };

function buildPresets(): Preset[] {
  const at = (d: Date, h: number, m: number) => {
    const x = new Date(d);
    x.setHours(h, m, 0, 0);
    return combine(toDateInput(x), `${pad(h)}:${pad(m)}`);
  };
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  return [
    { label: "今晚 23:59", get: () => at(now, 23, 59) },
    { label: "明天 18:00", get: () => at(tomorrow, 18, 0) },
    { label: "一周后", get: () => at(nextWeek, 18, 0) },
  ];
}

type PanelPos = { top: number; left: number; above: boolean };

function calcPanelPos(trigger: DOMRect): PanelPos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 8;

  let left = trigger.left;
  if (left + PANEL_W > vw - margin) left = vw - PANEL_W - margin;
  if (left < margin) left = margin;

  const spaceAbove = trigger.top - margin;
  const spaceBelow = vh - trigger.bottom - margin;
  const above = spaceAbove >= PANEL_H + GAP || spaceAbove >= spaceBelow;

  let top = above ? trigger.top - PANEL_H - GAP : trigger.bottom + GAP;
  if (top < margin) top = margin;
  if (top + PANEL_H > vh - margin) top = vh - PANEL_H - margin;

  return { top, left, above };
}

export type DueDateTimeFieldHandle = {
  close: () => void;
};

type DueDateTimeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** 弹层 z-index；在 AppDialog 内建议 ≤ 弹窗 zIndex，避免挡住底部「发布」按钮 */
  panelZIndex?: number;
};

export const DueDateTimeField = forwardRef<DueDateTimeFieldHandle, DueDateTimeFieldProps>(function DueDateTimeField(
  { value, onChange, disabled, panelZIndex = 200 },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const { date, time } = splitValue(value);
  const parts = parseDate(date);
  const { h, min } = parseTime(time);
  const presets = useMemo(() => buildPresets(), []);
  const display = useMemo(() => formatTrigger(value), [value]);

  const now = new Date();
  const [viewYear, setViewYear] = useState(parts?.y ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(parts?.m ?? now.getMonth() + 1);

  const close = useCallback(() => setOpen(false), []);

  useImperativeHandle(ref, () => ({ close }), [close]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) close();
      },
      { threshold: 0, rootMargin: "0px" },
    );
    obs.observe(triggerRef.current);
    return () => obs.disconnect();
  }, [open, close]);

  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    setPanelPos(calcPanelPos(el.getBoundingClientRect()));
  }, []);

  useEffect(() => {
    if (!open) return;
    if (parts) {
      setViewYear(parts.y);
      setViewMonth(parts.m);
    }
    updatePos();
  }, [open, parts?.y, parts?.m, updatePos]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePos();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => {
      const t = e.target as Node | null;
      if (t && panelRef.current?.contains(t)) return;
      close();
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const cells = useMemo(() => buildCalendar(viewYear, viewMonth), [viewYear, viewMonth]);

  const shiftMonth = (delta: number) => {
    let y = viewYear;
    let m = viewMonth + delta;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setViewYear(y);
    setViewMonth(m);
  };

  const pickDay = (day: number) => {
    if (isPastDay(viewYear, viewMonth, day)) return;
    onChange(combine(`${viewYear}-${pad(viewMonth)}-${pad(day)}`, time));
  };

  const patchTime = (hour: number, minute: number) => {
    const nh = ((hour % 24) + 24) % 24;
    const nm = ((minute % 60) + 60) % 60;
    const t = `${pad(nh)}:${pad(nm)}`;
    if (!date) {
      onChange(combine(toDateInput(new Date(viewYear, viewMonth - 1, 1)), t));
      return;
    }
    onChange(combine(date, t));
  };

  const selected = parts;

  const panel =
    open && panelPos
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="选择截止时间"
            style={{ top: panelPos.top, left: panelPos.left, width: PANEL_W, zIndex: panelZIndex }}
            className="fixed overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_12px_32px_rgba(15,45,35,0.18)] ring-1 ring-primary/10"
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] bg-primary-tint/40 px-2 py-1.5">
              <button
                type="button"
                aria-label="上一月"
                onClick={() => shiftMonth(-1)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-ink-muted hover:bg-black/[0.05]"
              >
                <ChevronLeft className="h-3.5 w-3.5" {...CUTE_ICON} />
              </button>
              <p className="text-[0.7rem] font-bold text-ink">{formatMonthTitle(viewYear, viewMonth)}</p>
              <button
                type="button"
                aria-label="下一月"
                onClick={() => shiftMonth(1)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-ink-muted hover:bg-black/[0.05]"
              >
                <ChevronRight className="h-3.5 w-3.5" {...CUTE_ICON} />
              </button>
            </div>

            <div className="p-2">
              <div className="mb-0.5 grid grid-cols-7">
                {WEEKDAYS.map((w) => (
                  <span key={w} className="py-0.5 text-center text-[0.6rem] font-medium text-ink-muted">
                    {w}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px">
                {cells.map((cell, idx) => {
                  if (!cell.day) {
                    return <span key={`e-${idx}`} className="h-7" aria-hidden />;
                  }
                  const active =
                    selected && isSameDay(selected, { y: viewYear, m: viewMonth, d: cell.day });
                  const today = isToday(viewYear, viewMonth, cell.day);
                  return (
                    <button
                      key={`${viewYear}-${viewMonth}-${cell.day}`}
                      type="button"
                      disabled={cell.disabled}
                      onClick={() => pickDay(cell.day)}
                      className={[
                        "flex h-7 w-full items-center justify-center rounded-md text-[0.7rem] font-semibold transition",
                        active
                          ? "bg-brand text-white"
                          : today
                            ? "bg-primary-tint/80 text-[#006D41]"
                            : "text-ink hover:bg-primary-tint/40",
                        cell.disabled ? "cursor-not-allowed opacity-30" : "",
                      ].join(" ")}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center justify-between rounded-lg bg-black/[0.03] px-2 py-1.5">
                <span className="text-[0.65rem] font-medium text-ink-muted">时间</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center">
                    <button
                      type="button"
                      aria-label="减少小时"
                      onClick={() => patchTime(h - 1, min)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white text-ink-muted ring-1 ring-black/[0.06]"
                    >
                      <Minus className="h-3 w-3" {...CUTE_ICON} />
                    </button>
                    <span className="w-7 text-center text-[0.75rem] font-bold tabular-nums text-ink">{pad(h)}</span>
                    <button
                      type="button"
                      aria-label="增加小时"
                      onClick={() => patchTime(h + 1, min)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white text-ink-muted ring-1 ring-black/[0.06]"
                    >
                      <Plus className="h-3 w-3" {...CUTE_ICON} />
                    </button>
                  </div>
                  <span className="text-[0.75rem] font-bold text-ink-muted">:</span>
                  <div className="flex items-center">
                    <button
                      type="button"
                      aria-label="减少分钟"
                      onClick={() => patchTime(h, min - 5)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white text-ink-muted ring-1 ring-black/[0.06]"
                    >
                      <Minus className="h-3 w-3" {...CUTE_ICON} />
                    </button>
                    <span className="w-7 text-center text-[0.75rem] font-bold tabular-nums text-ink">{pad(min)}</span>
                    <button
                      type="button"
                      aria-label="增加分钟"
                      onClick={() => patchTime(h, min + 5)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white text-ink-muted ring-1 ring-black/[0.06]"
                    >
                      <Plus className="h-3 w-3" {...CUTE_ICON} />
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={close}
                className="mt-2 w-full min-h-8 rounded-lg bg-brand text-[0.7rem] font-bold text-white hover:bg-brand-hover"
              >
                确定
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="space-y-2" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => !disabled && setOpen((v) => !v)}
        className={[
          "flex w-full min-h-10 items-center gap-2.5 rounded-xl border px-3 text-left transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
          open
            ? "border-brand/50 bg-white ring-2 ring-brand/15"
            : "border-black/[0.1] bg-white hover:border-primary/30",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        ].join(" ")}
      >
        <Calendar className="h-4 w-4 shrink-0 text-brand" {...CUTE_ICON} aria-hidden />
        {display ? (
          <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <span className="truncate text-small font-semibold text-ink">{display.dateText}</span>
            <span className="shrink-0 rounded-md bg-primary-tint/70 px-1.5 py-0.5 text-[0.65rem] font-medium text-[#006D41]">
              {display.weekday}
            </span>
            <span className="ml-auto shrink-0 text-small font-bold tabular-nums text-brand">{display.timeText}</span>
          </span>
        ) : (
          <span className="min-w-0 flex-1 text-small text-ink-muted">点击选择截止时间</span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-ink-muted transition ${open ? "rotate-180" : ""}`}
          {...CUTE_ICON}
          aria-hidden
        />
      </button>

      {panel}

      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange(p.get());
              close();
            }}
            className="rounded-full border border-primary/20 bg-white px-2.5 py-1 text-[0.65rem] font-bold text-[#006D41] transition hover:border-brand/40 hover:bg-brand/5 disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
});

export { combine as combineDueDateTime, splitValue as splitDueDateTime };
