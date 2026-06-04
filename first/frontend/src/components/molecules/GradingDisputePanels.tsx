import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, MessageSquareWarning, XCircle } from "lucide-react";

import { AppLink } from "@/components/atoms/AppLink";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import {
  fetchGradingDisputes,
  getTrackedDisputeIds,
  reviewGradingDispute,
  type GradingDispute,
} from "@/lib/gradingDisputeApi";

function statusLabel(s: GradingDispute["status"]): string {
  if (s === "pending") return "待教师处理";
  if (s === "confirmed") return "已确认并提交优化";
  return "已驳回";
}

function statusTone(s: GradingDispute["status"]): string {
  if (s === "pending") return "text-amber-800 bg-amber-50 ring-amber-200/80";
  if (s === "confirmed") return "text-emerald-900 bg-emerald-50 ring-emerald-200/80";
  return "text-red-900 bg-red-50 ring-red-200/80";
}

function DisputeCard({
  item,
  teacher,
  onReviewed,
}: {
  item: GradingDispute;
  teacher: boolean;
  onReviewed?: () => void;
}) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const runReview = async (action: "confirm" | "reject") => {
    if (action === "reject" && reply.trim().length < 4) {
      setErr("驳回时请至少用 4 个字向学生说明理由。");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await reviewGradingDispute(item.id, action, reply.trim() || undefined);
      onReviewed?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };

  const scopeLabel = item.feedback_scope === "whole_paper" ? "整卷" : "逐题";

  return (
    <li className="rounded-xl border border-black/[0.06] bg-surface-page/80 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[0.62rem] font-bold ring-1 ${statusTone(item.status)}`}>
          {statusLabel(item.status)}
        </span>
        <span className="text-[0.65rem] font-semibold text-ink-muted">
          {item.subject_title || item.subject} · {scopeLabel}
        </span>
        <span className="text-[0.62rem] text-ink-subtle">{item.created_at?.slice(0, 19).replace("T", " ")}</span>
      </div>
      {item.dimension_label ? (
        <p className="mt-2 text-caption font-bold text-ink">{item.dimension_label}</p>
      ) : null}
      {item.feedback_scope === "question" ? (
        <p className="mt-1 text-[0.65rem] text-ink-muted">
          判定快照：{item.status_snapshot ?? "—"} · 得分 {item.value}/{item.max}
        </p>
      ) : null}
      <p className="mt-2 whitespace-pre-wrap text-small leading-relaxed text-ink">{item.user_feedback}</p>
      {item.student_grade != null ? (
        <p className="mt-1 text-[0.65rem] text-ink-muted">学生年级：{item.student_grade} 年级</p>
      ) : null}
      {item.teacher_reply ? (
        <div className="mt-3 rounded-lg border border-sky-200/80 bg-sky-50/90 px-3 py-2 text-caption text-sky-950">
          <p className="font-bold">教师说明</p>
          <p className="mt-1 whitespace-pre-wrap leading-relaxed">{item.teacher_reply}</p>
        </div>
      ) : null}
      {teacher && item.status === "pending" ? (
        <div className="mt-3 space-y-2 border-t border-black/[0.06] pt-3">
          <label className="block text-caption font-bold text-ink">驳回时向学生说明（确认可留空）</label>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value.slice(0, 800))}
            rows={2}
            placeholder="例：卷面末步与标准答案一致，原判分无误。"
            className="w-full resize-y rounded-lg border border-black/[0.1] bg-white px-3 py-2 text-small outline-none focus:border-primary/35 focus:ring-2 focus:ring-primary/15"
          />
          {err ? <p className="text-caption font-semibold text-red-600">{err}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void runReview("confirm")}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-caption font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" {...CUTE_ICON} aria-hidden />
              {busy ? "处理中…" : "确认并提交优化"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runReview("reject")}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 text-caption font-bold text-red-800 transition hover:bg-red-100 disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" {...CUTE_ICON} aria-hidden />
              驳回
            </button>
          </div>
        </div>
      ) : null}
      {!teacher && item.status !== "pending" ? (
        <p className="mt-2 text-[0.65rem] font-semibold text-ink-muted">{statusLabel(item.status)}</p>
      ) : null}
    </li>
  );
}

/** 教师申诉列表主体（设置页 / 批改页侧栏复用） */
export function TeacherGradingDisputePanelBody({
  onPendingCountChange,
  filterTab = "all",
}: {
  onPendingCountChange?: (count: number) => void;
  /** pending：仅待处理；all：待处理 + 已处理 */
  filterTab?: "pending" | "all";
}) {
  const [items, setItems] = useState<GradingDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const list = await fetchGradingDisputes();
      setItems(list.filter((x) => x.submitter_role === "student"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const pending = items.filter((x) => x.status === "pending");
  const done = items.filter((x) => x.status !== "pending");

  useEffect(() => {
    onPendingCountChange?.(pending.length);
  }, [pending.length, onPendingCountChange]);

  return (
    <>
      {loading ? <p className="text-caption text-ink-muted">加载中…</p> : null}
      {err ? <p className="text-caption font-semibold text-red-600">{err}</p> : null}
      {!loading && !err ? (
        <TeacherDisputeLists
          pending={pending}
          done={filterTab === "all" ? done : []}
          showDone={filterTab === "all"}
          onReviewed={() => void reload()}
        />
      ) : null}
    </>
  );
}

/** 教师：待处理的学生判题申诉（设置页） */
export function TeacherGradingDisputePanel() {
  return (
    <section id="disputes" className="mt-10 scroll-mt-24 border-t border-primary/10 pt-8">
      <h2 className="flex items-center gap-2 text-body font-bold text-ink">
        <MessageSquareWarning className="h-5 w-5 text-amber-700" {...CUTE_ICON} aria-hidden />
        学生判题申诉
      </h2>
      <p className="mt-1 text-caption leading-relaxed text-ink-muted">
        学生认为判题有误时会在此提交申请。确认后将写入后端反馈日志用于优化判题；若认为原判无误可驳回并说明理由。
      </p>
      <div className="mt-4">
        <TeacherGradingDisputePanelBody />
      </div>
    </section>
  );
}

const TOOLBAR_BTN_CLASS =
  "relative inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-amber-50/95 px-3 py-1.5 text-caption font-bold text-amber-950 shadow-sm ring-1 ring-amber-200/80 transition hover:bg-amber-100/90 hover:ring-amber-300/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

/** 批改页顶栏：跳转学生申诉工作台 */
export function TeacherGradingDisputeToolbarButton() {
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    try {
      const list = await fetchGradingDisputes({ status: "pending" });
      setPendingCount(list.filter((x) => x.submitter_role === "student").length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    void refreshPendingCount();
    const timer = window.setInterval(() => void refreshPendingCount(), 60_000);
    return () => window.clearInterval(timer);
  }, [refreshPendingCount]);

  return (
    <AppLink to="/disputes" className={TOOLBAR_BTN_CLASS}>
      <MessageSquareWarning className="h-4 w-4 shrink-0 text-amber-700" {...CUTE_ICON} aria-hidden />
      学生申诉
      {pendingCount > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-600 px-1 text-[0.62rem] font-black leading-none text-white ring-2 ring-white">
          {pendingCount > 99 ? "99+" : pendingCount}
        </span>
      ) : null}
    </AppLink>
  );
}

function TeacherDisputeLists({
  pending,
  done,
  showDone = true,
  onReviewed,
}: {
  pending: GradingDispute[];
  done: GradingDispute[];
  showDone?: boolean;
  onReviewed: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        {showDone ? <h3 className="text-small font-bold text-ink">待处理（{pending.length}）</h3> : null}
        {pending.length === 0 ? (
          <p className="mt-2 text-caption text-ink-muted">暂无待处理申诉。</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((item) => (
              <DisputeCard key={item.id} item={item} teacher onReviewed={onReviewed} />
            ))}
          </ul>
        )}
      </div>
      {showDone && done.length > 0 ? (
        <div>
          <h3 className="text-small font-bold text-ink-muted">已处理</h3>
          <ul className="mt-3 space-y-3 opacity-90">
            {done.slice(0, 12).map((item) => (
              <DisputeCard key={item.id} item={item} teacher={false} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** 学生：本人提交的申诉及教师回复 */
export function StudentGradingDisputePanel({ studentGrade }: { studentGrade: number | null }) {
  const [items, setItems] = useState<GradingDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ids = getTrackedDisputeIds();
    if (!ids.length) {
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const list = await fetchGradingDisputes({ ids });
        setItems(list);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "加载失败");
      } finally {
        setLoading(false);
      }
    })();
  }, [studentGrade]);

  if (!getTrackedDisputeIds().length && !loading) return null;

  return (
    <section className="mt-10 border-t border-primary/10 pt-8">
      <h2 className="text-body font-bold text-ink">我的判题申诉</h2>
      <p className="mt-1 text-caption leading-relaxed text-ink-muted">提交后由任课教师审核；驳回时可查看教师说明。</p>
      {loading ? <p className="mt-4 text-caption text-ink-muted">加载中…</p> : null}
      {err ? <p className="mt-4 text-caption font-semibold text-red-600">{err}</p> : null}
      {!loading && !err && items.length === 0 ? (
        <p className="mt-4 text-caption text-ink-muted">暂无记录。</p>
      ) : null}
      {!loading && items.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <DisputeCard key={item.id} item={item} teacher={false} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
