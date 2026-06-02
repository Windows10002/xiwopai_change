import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";

import { Navbar } from "@/components/atoms/Navbar";
import { PageCampusDeco } from "@/components/atoms/PageCampusDeco";
import { PrimaryButton } from "@/components/atoms/PrimaryButton";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { HomeworkPreview } from "@/components/atoms/HomeworkPreview";
import { ScoreResultCard } from "@/components/organisms/ScoreResultCard";
import { loadStudentProfileName, saveStudentProfileName } from "@/lib/studentProfileName";
import {
  completeVariantTask,
  fetchMySubmissions,
  fetchSubmission,
  submitCorrection,
  submissionToDetail,
  type WorkspaceSubmission,
  type WorkspaceVariantTask,
} from "@/lib/workspaceApi";

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

function statusLabel(status: string) {
  const map: Record<string, string> = {
    published: "已下发",
    graded: "已批改",
    correction_pending: "待练变式/订正",
    correction_done: "待教师验收",
    closed: "已完成",
    submitted: "已提交",
  };
  return map[status] ?? status;
}

export function MyWorkPage() {
  const [profileName, setProfileName] = useState(() => loadStudentProfileName());
  const [tab, setTab] = useState<"work" | "variants">("work");
  const [items, setItems] = useState<WorkspaceSubmission[]>([]);
  const [variants, setVariants] = useState<WorkspaceVariantTask[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<WorkspaceSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profileName.trim()) {
      setItems([]);
      setVariants([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchMySubmissions();
      setItems(data.items);
      setVariants(data.variant_tasks);
      if (selectedId) {
        const hit = data.items.find((i) => i.id === selectedId);
        if (hit) setSelected(hit);
        else {
          const full = await fetchSubmission(selectedId);
          setSelected(full);
        }
      }
    } catch (e) {
      setToast(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [profileName, selectedId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const detail = useMemo(() => (selected ? submissionToDetail(selected) : null), [selected]);

  const openItem = async (id: string) => {
    setSelectedId(id);
    try {
      const full = await fetchSubmission(id);
      setSelected(full);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "打开失败");
    }
  };

  const handleSaveProfile = () => {
    saveStudentProfileName(profileName);
    setToast("姓名已保存，教师下发时将按此姓名匹配");
    void refresh();
  };

  const handleCorrection = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await submitCorrection(selected.id, "我已完成订正");
      setToast("已标记订正，等待教师验收");
      await refresh();
      await openItem(selected.id);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "提交失败");
    } finally {
      setBusy(false);
    }
  };

  const handleVariantDone = async (taskId: string) => {
    setBusy(true);
    try {
      await completeVariantTask(taskId);
      setToast("变式题已完成");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-bg-hero-stunning relative flex min-h-screen flex-col">
      <PageCampusDeco />
      <div className="relative z-10 flex flex-1 flex-col">
        <Navbar />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-ink">我的作业</h1>
              <p className="mt-2 max-w-2xl text-small text-ink-muted">
                查看教师下发的批改结果、完成变式题与订正。请确保姓名与教师批改时填写的一致。
              </p>
            </div>
            <Link
              to="/todo"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/25 bg-primary-tint/80 px-4 text-small font-bold text-ink-navActive"
            >
              <ClipboardList className="h-4 w-4" {...CUTE_ICON} aria-hidden />
              待办任务
            </Link>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/95 p-4 shadow-card">
            <label className="text-caption font-bold text-ink-muted">我的姓名（与教师端一致）</label>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="例如：张三"
                className="min-h-10 min-w-[12rem] flex-1 rounded-xl border border-black/[0.1] px-3 text-small"
              />
              <PrimaryButton className="min-h-10 px-5" onClick={handleSaveProfile}>
                保存姓名
              </PrimaryButton>
            </div>
          </div>

          <div className="flex gap-2">
            {(["work", "variants"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`min-h-10 rounded-xl px-4 text-small font-bold transition ${
                  tab === t ? "bg-brand text-white" : "bg-white/90 text-ink-muted ring-1 ring-black/[0.08]"
                }`}
              >
                {t === "work" ? `批改记录 (${items.length})` : `变式练习 (${variants.length})`}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void refresh()}
              className="ml-auto inline-flex min-h-10 items-center gap-1 rounded-xl border border-black/[0.08] bg-white px-3 text-caption font-bold text-ink-muted"
            >
              <RefreshCw className="h-4 w-4" {...CUTE_ICON} aria-hidden />
              刷新
            </button>
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center gap-2 py-16 text-ink-muted">
              <Loader2 className="h-5 w-5 animate-spin" {...CUTE_ICON} aria-hidden />
              加载中…
            </div>
          ) : tab === "variants" ? (
            <ul className="space-y-3">
              {variants.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-primary/25 bg-white/80 py-12 text-center text-small text-ink-muted">
                  暂无待完成的变式题
                </li>
              ) : (
                variants.map((v) => (
                  <li key={v.id} className="rounded-2xl border border-white/70 bg-white/95 p-4 shadow-sm">
                    {v.knowledge_point ? (
                      <span className="campus-tag campus-tag--mint text-[0.65rem]">{v.knowledge_point}</span>
                    ) : null}
                    <p className="mt-2 text-body font-semibold text-ink">{v.stem}</p>
                    {v.answer_hint ? <p className="mt-2 text-caption text-ink-muted">提示：{v.answer_hint}</p> : null}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleVariantDone(v.id)}
                      className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-4 text-caption font-bold text-white"
                    >
                      <CheckCircle2 className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                      标记完成
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <div className="grid min-h-[24rem] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
              <aside className="rounded-2xl border border-black/[0.08] bg-white/95 p-3 shadow-card">
                {items.length === 0 ? (
                  <p className="px-2 py-8 text-center text-caption text-ink-muted">
                    {profileName.trim() ? "暂无作业。请完成待办任务或等待教师下发。" : "请先保存姓名"}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => void openItem(item.id)}
                          className={`flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition ${
                            selectedId === item.id ? "bg-primary-tint ring-1 ring-primary/25" : "hover:bg-gray-50"
                          }`}
                        >
                          <span className="flex items-center gap-1.5 text-small font-bold text-ink">
                            {item.subject === "math" ? (
                              <Calculator className="h-3.5 w-3.5 text-primary" {...CUTE_ICON} aria-hidden />
                            ) : (
                              <BookOpen className="h-3.5 w-3.5 text-primary" {...CUTE_ICON} aria-hidden />
                            )}
                            {item.file_name || "作业"}
                          </span>
                          <span className="mt-1 text-caption text-ink-muted">
                            {formatWhen(item.created_at)} · {statusLabel(item.status)}
                            {item.score_percent != null ? ` · ${item.score_percent}%` : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>

              <div className="flex min-h-0 flex-col gap-4">
                {!selected || !detail ? (
                  <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-primary/20 bg-white/80 py-16 text-small text-ink-muted">
                    选择左侧一条记录查看批改详情
                  </div>
                ) : (
                  <>
                    {selected.image_url ? <HomeworkPreview imageUrl={selected.image_url} fillColumn /> : null}
                    <ScoreResultCard
                      subject={selected.subject}
                      result={detail}
                      subjectTitle={selected.subject === "math" ? "数学" : "英语"}
                      exportBaseName={`${selected.student_name}-${selected.file_name}`}
                    />
                    {selected.status === "published" || selected.status === "correction_pending" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleCorrection()}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-small font-bold text-emerald-900"
                      >
                        <Send className="h-4 w-4" {...CUTE_ICON} aria-hidden />
                        我已完成订正
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          )}

          {toast ? (
            <p className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-caption font-semibold text-white shadow-lg">
              {toast}
            </p>
          ) : null}
        </main>
      </div>
    </div>
  );
}
