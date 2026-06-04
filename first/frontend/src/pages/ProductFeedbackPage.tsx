import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";

import { AppLink } from "@/components/atoms/AppLink";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { TeacherWorkbenchLayout } from "@/components/organisms/TeacherWorkbenchLayout";
import {
  downloadProductFeedbackExport,
  fetchProductFeedbackList,
  PRODUCT_FEEDBACK_CATEGORY_LABEL,
  PRODUCT_FEEDBACK_ROLE_LABEL,
  type ProductFeedbackCategory,
  type ProductFeedbackItem,
  type ProductFeedbackListResponse,
} from "@/lib/productFeedbackApi";

const PAGE_SIZE = 40;

const CATEGORY_OPTIONS: Array<{ value: "" | ProductFeedbackCategory; label: string }> = [
  { value: "", label: "全部类型" },
  { value: "bug", label: PRODUCT_FEEDBACK_CATEGORY_LABEL.bug },
  { value: "idea", label: PRODUCT_FEEDBACK_CATEGORY_LABEL.idea },
  { value: "question", label: PRODUCT_FEEDBACK_CATEGORY_LABEL.question },
];

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "全部身份" },
  { value: "teacher", label: "教师" },
  { value: "student", label: "学生" },
  { value: "parent", label: "家长" },
  { value: "admin", label: "教务" },
  { value: "guest", label: "访客" },
];

function formatWhen(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function FeedbackRow({ item }: { item: ProductFeedbackItem }) {
  const cat = item.category || "idea";
  const catLabel = PRODUCT_FEEDBACK_CATEGORY_LABEL[cat as ProductFeedbackCategory] ?? cat;
  const roleLabel = PRODUCT_FEEDBACK_ROLE_LABEL[item.role || "unknown"] ?? item.role ?? "—";

  return (
    <li className="glass-panel-inner rounded-xl px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary-tint px-2 py-0.5 text-[0.65rem] font-bold text-[#006D41] ring-1 ring-primary/20">
          {catLabel}
        </span>
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[0.65rem] font-semibold text-ink-muted ring-1 ring-black/[0.06]">
          {roleLabel}
        </span>
        {item.path ? (
          <span className="max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-mono text-ink-muted">
            {item.path}
          </span>
        ) : null}
        <span className="ml-auto shrink-0 text-[0.65rem] text-ink-subtle">{formatWhen(item.saved_at)}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-small leading-relaxed text-ink">{item.message}</p>
      {item.contact?.trim() ? (
        <p className="mt-1 text-caption text-ink-muted">联系：{item.contact.trim()}</p>
      ) : null}
      {item.user_sub ? <p className="mt-0.5 text-[0.65rem] text-ink-subtle">用户：{item.user_sub}</p> : null}
    </li>
  );
}

function StatsCards({ data }: { data: ProductFeedbackListResponse }) {
  const cats = Object.entries(data.by_category).sort((a, b) => b[1] - a[1]);
  const roles = Object.entries(data.by_role).sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="glass-panel rounded-xl px-4 py-3 text-center">
        <p className="text-caption text-ink-muted">反馈总数</p>
        <p className="text-2xl font-black text-ink">{data.total}</p>
      </div>
      {cats.slice(0, 3).map(([k, n]) => (
        <div key={k} className="glass-panel rounded-xl px-4 py-3 text-center">
          <p className="text-caption text-ink-muted">
            {PRODUCT_FEEDBACK_CATEGORY_LABEL[k as ProductFeedbackCategory] ?? k}
          </p>
          <p className="text-2xl font-black text-ink">{n}</p>
        </div>
      ))}
      {roles.length > 0 && cats.length < 3 ? (
        <div className="glass-panel rounded-xl px-4 py-3">
          <p className="text-caption text-ink-muted">按身份</p>
          <ul className="mt-1 space-y-0.5 text-caption font-semibold text-ink">
            {roles.slice(0, 4).map(([k, n]) => (
              <li key={k} className="flex justify-between gap-2">
                <span>{PRODUCT_FEEDBACK_ROLE_LABEL[k] ?? k}</span>
                <span className="text-ink-muted">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function ProductFeedbackPage() {
  const [category, setCategory] = useState<"" | ProductFeedbackCategory>("");
  const [role, setRole] = useState("");
  const [pathFilter, setPathFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<ProductFeedbackListResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"csv" | "jsonl" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetchProductFeedbackList({
        limit: PAGE_SIZE,
        offset,
        category: category || undefined,
        role: role || undefined,
        path: pathFilter.trim() || undefined,
      });
      if (!res.ok) throw new Error(res.message || "加载失败");
      setData(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加载失败");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [category, role, pathFilter, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setOffset(0);
  }, [category, role, pathFilter]);

  const handleExport = async (format: "csv" | "jsonl") => {
    setExporting(format);
    try {
      await downloadProductFeedbackExport(format, {
        category: category || undefined,
        role: role || undefined,
        path: pathFilter.trim() || undefined,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "导出失败");
    } finally {
      setExporting(null);
    }
  };

  const total = data?.total ?? 0;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);
  const canPrev = offset > 0;
  const canNext = data != null && offset + PAGE_SIZE < total;

  return (
    <TeacherWorkbenchLayout
      moduleTitle="产品反馈"
      moduleSubtitle={`π 助手等入口 · 共 ${loading ? "—" : total} 条`}
      mobileTitle="产品反馈"
      onRefresh={() => void load()}
    >
      <p className="mb-4 max-w-2xl text-small text-ink-muted">
        汇总用户通过 π 助手提交的建议、Bug 与使用疑问（服务端 product_feedback.jsonl）。判题模型相关的教师异议请查看
        <AppLink to="/feedback-dashboard" className="mx-1 font-bold text-brand hover:underline">
          判题反馈
        </AppLink>
        。
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[0.65rem] font-bold text-ink-muted">类型</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as "" | ProductFeedbackCategory)}
            className="min-h-10 rounded-xl border border-black/[0.08] bg-white/95 px-3 text-small font-semibold text-ink"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[0.65rem] font-bold text-ink-muted">身份</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="min-h-10 rounded-xl border border-black/[0.08] bg-white/95 px-3 text-small font-semibold text-ink"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
          <span className="text-[0.65rem] font-bold text-ink-muted">页面路径包含</span>
          <input
            type="search"
            value={pathFilter}
            onChange={(e) => setPathFilter(e.target.value)}
            placeholder="如 /workspace"
            className="min-h-10 w-full rounded-xl border border-black/[0.08] bg-white/95 px-3 text-small text-ink"
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/[0.08] bg-white/90 px-4 text-caption font-bold text-ink-muted shadow-sm hover:border-primary/30"
        >
          <RefreshCw className="h-4 w-4" {...CUTE_ICON} aria-hidden />
          刷新
        </button>
        <button
          type="button"
          disabled={exporting !== null}
          onClick={() => void handleExport("csv")}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-caption font-bold text-white shadow-sm hover:bg-primary-hover disabled:opacity-60"
        >
          <Download className="h-4 w-4" {...CUTE_ICON} aria-hidden />
          {exporting === "csv" ? "导出中…" : "导出 CSV"}
        </button>
        <button
          type="button"
          disabled={exporting !== null}
          onClick={() => void handleExport("jsonl")}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/30 bg-primary-tint/50 px-4 text-caption font-bold text-[#006D41] hover:bg-primary-tint disabled:opacity-60"
        >
          <Download className="h-4 w-4" {...CUTE_ICON} aria-hidden />
          {exporting === "jsonl" ? "导出中…" : "导出 JSONL"}
        </button>
      </div>

      {loading && !data ? (
        <div className="glass-panel flex justify-center rounded-2xl py-16">
          <p className="text-small text-ink-muted">加载中…</p>
        </div>
      ) : err && !data ? (
        <div className="glass-panel rounded-2xl px-4 py-8 text-center text-small text-red-700">{err}</div>
      ) : data ? (
        <div className="space-y-6">
          <StatsCards data={data} />
          <div className="glass-panel rounded-2xl p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-body font-bold text-ink">反馈列表</h2>
              {total > 0 ? (
                <p className="text-caption text-ink-muted">
                  第 {offset + 1}–{pageEnd} 条，共 {total} 条
                </p>
              ) : null}
            </div>
            <ul className="mt-3 max-h-[min(55vh,28rem)] space-y-3 overflow-y-auto">
              {data.items.length === 0 ? (
                <li className="py-8 text-center text-caption text-ink-muted">暂无记录</li>
              ) : (
                data.items.map((item, i) => <FeedbackRow key={`${item.saved_at}-${i}`} item={item} />)
              )}
            </ul>
            {total > PAGE_SIZE ? (
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  disabled={!canPrev}
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                  className="rounded-xl border border-black/[0.08] px-4 py-2 text-caption font-bold text-ink-muted disabled:opacity-40"
                >
                  上一页
                </button>
                <button
                  type="button"
                  disabled={!canNext}
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                  className="rounded-xl border border-black/[0.08] px-4 py-2 text-caption font-bold text-ink-muted disabled:opacity-40"
                >
                  下一页
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </TeacherWorkbenchLayout>
  );
}
