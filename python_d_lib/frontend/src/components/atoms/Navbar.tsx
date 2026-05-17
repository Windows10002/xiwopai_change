import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { ChevronDown, Clock, LogOut, Settings, UserRound } from "lucide-react";

import { IpBrandFace } from "@/components/atoms/IpMascot";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { buildGroupedHistoryRows, loadGradingHistory, type HistoryDisplayRow } from "@/lib/gradingHistory";
import { clearSession, sessionDisplayLabel } from "@/lib/appSession";
import { useAppSession } from "@/hooks/useAppSession";

type NavbarProps = {
  brandLabel?: string;
  onLogin?: () => void;
  /** 内层内容最大宽度（批改页可加宽） */
  contentMaxClassName?: string;
  /** 为 false 时不展示「批改历史」入口（批改页不使用主导航） */
  showHistoryDropdown?: boolean;
};

export type HistoryDropdownVariant = "nav" | "toolbar";

export type HistoryDropdownProps = {
  variant?: HistoryDropdownVariant;
  /** all：首页等场景下分数学 / 英语两块；math / english：仅展示该学科 */
  subjectScope?: "all" | "math" | "english";
};

/**
 * 导航项：<a> 本身承担 padding 与最小触控高度，避免「只有文字可点」。
 */
function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "group relative inline-flex min-h-11 shrink-0 flex-col items-center justify-center rounded-full px-5 py-2.5 text-small font-semibold outline-none transition-colors duration-button ease-smooth",
          "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          isActive ? "bg-primary-light text-ink-navActive" : "text-ink/80 hover:bg-gray-50 hover:text-ink",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative z-10 px-0.5 leading-none">{children}</span>
          <span
            className={[
              "pointer-events-none absolute inset-x-4 bottom-1.5 z-0 h-[3px] rounded-full bg-primary transition-all duration-button ease-smooth",
              isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-[0.65] group-hover:opacity-50 group-hover:scale-x-95",
            ].join(" ")}
            aria-hidden
          />
        </>
      )}
    </NavLink>
  );
}

export function HistoryDropdown({ variant = "nav", subjectScope = "all" }: HistoryDropdownProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [mathRows, setMathRows] = useState<HistoryDisplayRow[]>([]);
  const [engRows, setEngRows] = useState<HistoryDisplayRow[]>([]);

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

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const goMathPanel = () => {
    setOpen(false);
    navigate("/math", { state: { openGradingHistory: true } });
  };

  const goEnglishPanel = () => {
    setOpen(false);
    navigate("/english", { state: { openGradingHistory: true } });
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

  const triggerClass =
    variant === "toolbar"
      ? [
          "inline-flex min-h-9 items-center gap-1 rounded-xl bg-primary-tint px-3 py-1.5 text-caption font-bold text-ink-navActive shadow-sm ring-1 ring-brand/18 transition",
          "hover:bg-primary-light hover:ring-brand/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        ].join(" ")
      : [
          "inline-flex min-h-11 items-center gap-1 rounded-full border border-black/[0.06] bg-white px-4 py-2 text-small font-semibold text-ink shadow-sm transition",
          "hover:border-primary/25 hover:text-ink-navActive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        ].join(" ");

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
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
      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.35rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-2xl ring-1 ring-primary/10">
          <div className="border-b border-black/[0.06] bg-gradient-to-r from-primary-tint/80 to-white px-4 py-3">
            <p className="text-small font-extrabold text-ink">最近批改</p>
            <p className="mt-0.5 text-[0.65rem] leading-relaxed text-ink-muted">
              {subjectScope === "all"
                ? "本机保存 · 数学与英语分区展示"
                : subjectScope === "math"
                  ? "本机保存 · 仅数学作业"
                  : "本机保存 · 仅英语作文"}
            </p>
          </div>
          <div className="max-h-[min(70vh,22rem)] overflow-y-auto overscroll-contain p-3">
            {subjectScope !== "english" ? (
              <div className={subjectScope === "all" ? "mb-3" : ""}>
                {subjectScope === "all" ? (
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[0.7rem] font-extrabold text-ink-navActive">数学</span>
                    <button type="button" onClick={goMathPanel} className="text-[0.65rem] font-bold text-brand hover:underline">
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
                            setOpen(false);
                            if (row.type === "single") {
                              navigate("/math", { state: { historyEntryId: row.entry.id } });
                            } else {
                              navigate("/math", { state: { historyEntryId: row.items[0]?.id, openGradingHistory: true } });
                            }
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-xl border border-black/[0.06] bg-white px-2.5 py-2 text-left text-[0.7rem] transition hover:border-brand/35 hover:bg-primary-tint/40"
                        >
                          <span className="min-w-0 flex-1 truncate font-semibold text-ink">{rowLabel(row)}</span>
                          <span className="shrink-0 font-black text-ink-navActive">{rowPct(row)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {subjectScope === "math" ? (
                  <button
                    type="button"
                    onClick={goMathPanel}
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
                    <button type="button" onClick={goEnglishPanel} className="text-[0.65rem] font-bold text-brand hover:underline">
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
                            setOpen(false);
                            if (row.type === "single") {
                              navigate("/english", { state: { historyEntryId: row.entry.id } });
                            } else {
                              navigate("/english", { state: { historyEntryId: row.items[0]?.id, openGradingHistory: true } });
                            }
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
                    onClick={goEnglishPanel}
                    className="mt-2 w-full rounded-xl border border-black/[0.06] bg-surface-page py-2 text-[0.7rem] font-bold text-brand transition hover:bg-indigo-50/80"
                  >
                    在批改页侧栏查看全部
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * 顶部导航：Logo + 演示角标 · 站内链接（激活浅绿底 + 主色下划线铺满可用宽度）· 薄荷绿登录
 */
export function Navbar({
  brandLabel = "希沃智教π",
  onLogin,
  contentMaxClassName = "max-w-6xl",
  showHistoryDropdown = true,
}: NavbarProps) {
  const session = useAppSession();

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.05] bg-white/[0.93] shadow-[0_1px_0_rgba(15,45,35,0.04)] backdrop-blur-md">
      <div
        className={`mx-auto grid min-h-[3.25rem] w-full max-w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-2 md:min-h-14 md:gap-4 md:px-6 ${contentMaxClassName}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl px-1 text-small font-bold tracking-tight text-ink transition-colors duration-button ease-smooth hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
          >
            <IpBrandFace size="md" className="-translate-y-px" decorative />
            <span className="truncate">{brandLabel}</span>
          </Link>

          <span className="shrink-0 rounded-full bg-badge-demo-bg px-2 py-0.5 text-[0.6875rem] font-semibold leading-none text-badge-demo-fg ring-1 ring-black/[0.04]">
            演示
          </span>
        </div>

        <nav
          aria-label="主导航"
          className="flex min-w-0 items-center justify-center gap-0.5 overflow-x-auto py-0.5 [scrollbar-width:none] md:gap-1 [&::-webkit-scrollbar]:hidden"
        >
          <NavItem to="/">首页</NavItem>
          <NavItem to="/math">数学批改</NavItem>
          <NavItem to="/english">英语批改</NavItem>
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-2">
          {showHistoryDropdown ? <HistoryDropdown variant="nav" subjectScope="all" /> : null}
          <NavLink
            to="/settings"
            title="设置"
            aria-label="设置"
            className={({ isActive }) =>
              [
                "inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border shadow-sm transition duration-button ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white md:min-h-11 md:min-w-11",
                isActive
                  ? "border-brand/35 bg-primary-light text-ink-navActive ring-2 ring-primary/20"
                  : "border-black/[0.06] bg-white text-ink-muted hover:border-primary/25 hover:text-ink-navActive",
              ].join(" ")
            }
          >
            <Settings className="h-5 w-5" {...CUTE_ICON} aria-hidden />
          </NavLink>
          {session ? (
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <span
                className="inline-flex max-w-[7.5rem] items-center gap-1.5 rounded-full border border-primary/20 bg-primary-tint/90 px-2.5 py-1.5 text-[0.65rem] font-bold text-ink-navActive shadow-sm sm:max-w-none sm:px-3 sm:text-caption"
                title={`已登录：${sessionDisplayLabel(session)}`}
              >
                <UserRound className="h-4 w-4 shrink-0" {...CUTE_ICON} aria-hidden />
                <span className="truncate">{sessionDisplayLabel(session)}</span>
              </span>
              <button
                type="button"
                title="退出登录"
                aria-label="退出登录"
                onClick={() => clearSession()}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-black/[0.08] bg-white text-ink-muted shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white md:min-h-11 md:min-w-11"
              >
                <LogOut className="h-4 w-4" {...CUTE_ICON} aria-hidden />
              </button>
            </div>
          ) : onLogin ? (
            <button type="button" onClick={onLogin} className="btn-accent-mint-solid min-h-10 shrink-0 px-5 text-small md:min-h-11 md:px-6">
              登录
            </button>
          ) : (
            <Link to="/login" className="btn-accent-mint-solid min-h-10 shrink-0 px-5 text-small md:min-h-11 md:px-6">
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
