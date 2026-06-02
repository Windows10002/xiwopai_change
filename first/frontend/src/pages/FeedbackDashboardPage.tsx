import { useCallback, useEffect, useState } from "react";
import { MessageSquareWarning, RefreshCw } from "lucide-react";

import { Navbar } from "@/components/atoms/Navbar";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { fetchFeedbackDashboard, type FeedbackDashboardData } from "@/lib/gradingFeedbackDashboard";

function FeedbackDashboardContent() {
  const [data, setData] = useState<FeedbackDashboardData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      setData(await fetchFeedbackDashboard());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page-bg-hero-stunning relative flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 md:px-6 md:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-ink">
              <MessageSquareWarning className="h-7 w-7 text-amber-600" {...CUTE_ICON} aria-hidden />
              判题反馈看板
            </h1>
            <p className="mt-2 text-small text-ink-muted">汇总教师提交的判题异议与整卷反馈（服务端 grading_feedback.jsonl）。</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border bg-white px-4 text-small font-bold text-ink-muted shadow-sm"
          >
            <RefreshCw className="h-4 w-4" {...CUTE_ICON} aria-hidden />
            刷新
          </button>
        </div>

        {loading ? <p className="mt-8 text-small text-ink-muted">加载中…</p> : null}
        {err ? <p className="mt-8 text-small text-red-700">{err}</p> : null}

        {data && !loading ? (
          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-primary-tint px-4 py-3 text-center ring-1 ring-primary/15">
                <p className="text-caption text-ink-muted">反馈总数</p>
                <p className="text-2xl font-black text-ink">{data.total}</p>
              </div>
              <div className="rounded-xl bg-sky-50 px-4 py-3 text-center ring-1 ring-sky-100">
                <p className="text-caption text-ink-muted">数学</p>
                <p className="text-2xl font-black text-sky-900">{data.by_subject.math ?? 0}</p>
              </div>
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-center ring-1 ring-amber-100">
                <p className="text-caption text-ink-muted">英语</p>
                <p className="text-2xl font-black text-amber-950">{data.by_subject.english ?? 0}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-black/[0.08] bg-white/95 p-4 shadow-card">
              <h2 className="text-body font-bold text-ink">高频反馈维度</h2>
              <ul className="mt-3 space-y-2">
                {data.top_dimensions.length === 0 ? (
                  <li className="text-caption text-ink-muted">暂无记录</li>
                ) : (
                  data.top_dimensions.map((d) => (
                    <li key={d.label} className="flex justify-between gap-2 text-small">
                      <span className="min-w-0 truncate font-semibold text-ink">{d.label}</span>
                      <span className="shrink-0 text-ink-muted">{d.count} 次</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-black/[0.08] bg-white/95 p-4 shadow-card">
              <h2 className="text-body font-bold text-ink">最近反馈</h2>
              <ul className="mt-3 max-h-80 space-y-3 overflow-y-auto">
                {data.recent.map((r, i) => (
                  <li key={i} className="rounded-xl bg-surface-page/80 px-3 py-2 text-caption">
                    <p className="font-bold text-ink">
                      {(r.subject as string) || "—"} · {(r.feedback_scope as string) || "question"}
                    </p>
                    <p className="mt-1 line-clamp-3 text-ink-muted">{(r.user_feedback as string) || ""}</p>
                    <p className="mt-1 text-ink-subtle">{(r.saved_at as string)?.slice(0, 19).replace("T", " ")}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export function FeedbackDashboardPage() {
  return <FeedbackDashboardContent />;
}
