import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, ChevronDown } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import {
  getCurrentTerm,
  listRecentTerms,
  type AcademicTerm,
  type AcademicTermId,
} from "@/lib/academicTerm";

export type TermScopeParam = "current" | "all" | AcademicTermId;

export function parseTermScopeParam(raw: string | null): TermScopeParam {
  if (!raw || raw === "current") return "current";
  if (raw === "all") return "all";
  if (/^\d{4}-\d{4}-[12]$/.test(raw)) return raw as AcademicTermId;
  return "current";
}

export function resolveActiveTerm(scope: TermScopeParam): AcademicTerm | null {
  if (scope === "all") return null;
  if (scope === "current") return getCurrentTerm();
  const recent = listRecentTerms(12);
  return recent.find((t) => t.id === scope) ?? getCurrentTerm();
}

type TermOption = { value: TermScopeParam; label: string; hint?: string };

type AcademicTermScopeBarProps = {
  className?: string;
  compact?: boolean;
};

/** 学情中心：学期筛选（自定义下拉，分组展示） */
export function AcademicTermScopeBar({ className = "", compact = false }: AcademicTermScopeBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const scope = parseTermScopeParam(searchParams.get("term"));

  const { quick, history } = useMemo(() => {
    const current = getCurrentTerm();
    const recent = listRecentTerms(8);
    const quickOpts: TermOption[] = [
      { value: "current", label: "当前学期", hint: current.label },
      { value: "all", label: "全部记录", hint: "约一年内" },
    ];
    const historyOpts: TermOption[] = recent
      .filter((t) => t.id !== current.id)
      .map((t) => ({ value: t.id, label: t.label }));
    return { quick: quickOpts, history: historyOpts };
  }, []);

  const allOptions = useMemo(() => [...quick, ...history], [quick, history]);
  const selected = allOptions.find((o) => o.value === scope) ?? quick[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const setScope = (next: TermScopeParam) => {
    const params = new URLSearchParams(searchParams);
    if (next === "current") params.delete("term");
    else params.set("term", next);
    setSearchParams(params, { replace: true });
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <span className="mb-1 block text-[0.65rem] font-bold text-ink-muted">学期</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-black/[0.08] bg-white/95 text-left shadow-sm transition hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 ${
          compact ? "px-2.5 py-1.5" : "px-3 py-2"
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-semibold text-ink ${compact ? "text-[0.7rem]" : "text-caption"}`}>
            {selected.label}
          </span>
          {selected.hint ? (
            <span className="mt-0.5 block truncate text-[0.6rem] text-ink-muted">{selected.hint}</span>
          ) : null}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-muted transition ${open ? "rotate-180" : ""}`}
          {...CUTE_ICON}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-[min(18rem,50vh)] overflow-y-auto rounded-xl border border-black/[0.08] bg-white p-1.5 shadow-2xl ring-1 ring-primary/10"
        >
          <p className="px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wide text-ink-muted">常用</p>
          {quick.map((o) => (
            <TermRow key={o.value} option={o} active={scope === o.value} onPick={() => setScope(o.value)} />
          ))}
          {history.length > 0 ? (
            <>
              <p className="mt-1 border-t border-black/[0.06] px-2.5 py-1.5 text-[0.6rem] font-bold uppercase tracking-wide text-ink-muted">
                历史学期
              </p>
              {history.map((o) => (
                <TermRow key={o.value} option={o} active={scope === o.value} onPick={() => setScope(o.value)} />
              ))}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TermRow({
  option,
  active,
  onPick,
}: {
  option: TermOption;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onPick}
      className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition ${
        active ? "bg-primary-tint ring-1 ring-primary/20" : "hover:bg-gray-50"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-caption font-semibold text-ink">{option.label}</span>
        {option.hint ? <span className="mt-0.5 block text-[0.6rem] leading-snug text-ink-muted">{option.hint}</span> : null}
      </span>
      {active ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" {...CUTE_ICON} aria-hidden /> : null}
    </button>
  );
}
