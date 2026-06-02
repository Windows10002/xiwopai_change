import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Table2, X } from "lucide-react";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { DEMO_ACCOUNTS, type DemoAccountRow } from "@/lib/demoAccounts";

type DemoAccountsPopoverProps = {
  onPickAccount?: (row: DemoAccountRow) => void;
};

/** 登录页：演示账号折叠面板（可复制、点外关闭） */
export function DemoAccountsPopover({ onPickAccount }: DemoAccountsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
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

  const copyAccount = async (acc: string) => {
    try {
      await navigator.clipboard.writeText(acc);
      setCopiedAccount(acc);
      window.setTimeout(() => setCopiedAccount((cur) => (cur === acc ? null : cur)), 1600);
    } catch {
      /* fallback ignored in demo */
    }
  };

  const applyRow = (row: DemoAccountRow) => {
    onPickAccount?.(row);
    close();
  };

  return (
    <div className="relative inline-flex" ref={wrapRef}>
      <button
        type="button"
        aria-label="查看演示账号"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className={[
          "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition duration-button ease-smooth",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
          open
            ? "border-primary/35 bg-primary-tint text-brand shadow-sm"
            : "border-black/[0.08] bg-white text-ink-muted hover:border-primary/25 hover:bg-primary-tint/50 hover:text-brand",
        ].join(" ")}
        title="演示账号一览"
      >
        <Table2 className="h-4 w-4" {...CUTE_ICON} aria-hidden />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="演示账号"
          className="absolute left-1/2 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-black/[0.08] bg-white shadow-[0_16px_48px_rgba(15,45,35,0.14)] ring-1 ring-primary/10 sm:left-auto sm:right-0 sm:translate-x-0"
        >
          <div className="flex items-start justify-between gap-2 border-b border-black/[0.06] bg-gradient-to-r from-primary-tint/80 to-white px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-small font-extrabold text-ink">演示账号</p>
              <p className="mt-0.5 text-[0.65rem] leading-snug text-ink-muted">密码均为 123456 · 点击行可填入</p>
            </div>
            <button
              type="button"
              aria-label="关闭"
              onClick={close}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-subtle transition hover:bg-black/[0.05] hover:text-ink"
            >
              <X className="h-4 w-4" {...CUTE_ICON} />
            </button>
          </div>

          <ul className="max-h-[min(16rem,50vh)] overflow-y-auto p-1.5">
            {DEMO_ACCOUNTS.map((row) => (
              <li key={row.account}>
                <div className="flex items-center gap-1 rounded-lg hover:bg-primary-tint/40">
                  <button
                    type="button"
                    onClick={() => applyRow(row)}
                    className="min-w-0 flex-1 px-2 py-2 text-left"
                  >
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-mono text-[0.6875rem] font-bold text-ink">{row.account}</span>
                      <span className="rounded bg-gray-100 px-1.5 py-px text-[0.625rem] font-semibold text-ink-muted">
                        {row.roleLabel}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[0.65rem] leading-snug text-ink-muted">
                      {row.displayName}
                      {row.teachingGrades ? ` · 任教${row.teachingGrades}` : ""}
                      {row.studentGrade ? ` · ${row.studentGrade}年级` : ""}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`复制账号 ${row.account}`}
                    onClick={() => void copyAccount(row.account)}
                    className="mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-subtle transition hover:bg-white hover:text-brand"
                  >
                    {copiedAccount === row.account ? (
                      <Check className="h-3.5 w-3.5 text-primary" {...CUTE_ICON} aria-hidden />
                    ) : (
                      <Copy className="h-3.5 w-3.5" {...CUTE_ICON} aria-hidden />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <p className="border-t border-black/[0.05] px-3 py-2 text-[0.625rem] leading-relaxed text-ink-subtle">
            通用账号 13800138000 需手动选端别
          </p>
        </div>
      ) : null}
    </div>
  );
}
