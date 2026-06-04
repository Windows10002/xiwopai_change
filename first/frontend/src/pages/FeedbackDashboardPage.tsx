import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { AppLink } from "@/components/atoms/AppLink";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { TeacherWorkbenchLayout } from "@/components/organisms/TeacherWorkbenchLayout";
import { fetchFeedbackDashboard, type FeedbackDashboardData } from "@/lib/gradingFeedbackDashboard";
function FeedbackDashboardBody({
  data,
  loading,
  err,
  onReload,
}: {
  data: FeedbackDashboardData | null;
  loading: boolean;
  err: string | null;
  onReload: () => void;
}) {
  if (loading) {
    return (
      <div className="glass-panel flex justify-center rounded-2xl py-16">
        <p className="text-small text-ink-muted">加载中…</p>
      </div>
    );
  }
  if (err) {
    return (
      <div className="glass-panel rounded-2xl px-4 py-8 text-center text-small text-red-700">{err}</div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onReload}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/[0.08] bg-white/90 px-4 text-caption font-bold text-ink-muted shadow-sm hover:border-primary/30"
        >
          <RefreshCw className="h-4 w-4" {...CUTE_ICON} aria-hidden />
          刷新
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="glass-panel rounded-xl px-4 py-3 text-center">
          <p className="text-caption text-ink-muted">反馈总数</p>
          <p className="text-2xl font-black text-ink">{data.total}</p>
        </div>
        <div className="glass-panel rounded-xl px-4 py-3 text-center">
          <p className="text-caption text-ink-muted">数学</p>
          <p className="text-2xl font-black text-sky-900">{data.by_subject.math ?? 0}</p>
        </div>
        <div className="glass-panel rounded-xl px-4 py-3 text-center">
          <p className="text-caption text-ink-muted">英语</p>
          <p className="text-2xl font-black text-amber-950">{data.by_subject.english ?? 0}</p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-4 md:p-5">
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

      <div className="glass-panel rounded-2xl p-4 md:p-5">
        <h2 className="text-body font-bold text-ink">最近反馈</h2>
        <ul className="mt-3 max-h-[min(50vh,24rem)] space-y-3 overflow-y-auto">
          {data.recent.length === 0 ? (
            <li className="text-caption text-ink-muted">暂无记录</li>
          ) : (
            data.recent.map((r, i) => (
              <li key={i} className="glass-panel-inner rounded-xl px-3 py-2 text-caption">
                <p className="font-bold text-ink">
                  {(r.subject as string) || "—"} · {(r.feedback_scope as string) || "question"}
                </p>
                <p className="mt-1 line-clamp-3 text-ink-muted">{(r.user_feedback as string) || ""}</p>
                <p className="mt-1 text-ink-subtle">{(r.saved_at as string)?.slice(0, 19).replace("T", " ")}</p>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

export function FeedbackDashboardPage() {
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
    <TeacherWorkbenchLayout
      moduleTitle="判题反馈"
      moduleSubtitle={`反馈总数 ${data?.total ?? "—"}`}
      mobileTitle="判题反馈"
      onRefresh={() => void load()}
    >
      <p className="mb-4 max-w-2xl text-small text-ink-muted">
        汇总教师提交的判题异议与整卷反馈（服务端 grading_feedback.jsonl），用于优化判题模型。用户通过 π 助手提交的产品建议请查看
        <AppLink to="/product-feedback" className="mx-1 font-bold text-brand hover:underline">
          产品反馈
        </AppLink>
        看板。
      </p>
      <FeedbackDashboardBody data={data} loading={loading} err={err} onReload={() => void load()} />
    </TeacherWorkbenchLayout>
  );
}
