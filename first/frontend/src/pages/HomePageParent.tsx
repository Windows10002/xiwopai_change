import { useEffect, useMemo, useState } from "react";
import { Camera, ClipboardList, Eye, Heart, Lock, LockOpen, TrendingUp } from "lucide-react";

import { Navbar } from "@/components/atoms/Navbar";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { IpBrandFace } from "@/components/atoms/IpMascot";
import { SubjectCard } from "@/components/molecules/SubjectCard";
import { AuthenticatedImage } from "@/components/molecules/AuthenticatedImage";
import { loadAuthToken } from "@/lib/apiClient";
import { loadGradingHistory } from "@/lib/gradingHistory";
import { loadParentAnswerLock, saveParentAnswerLock } from "@/lib/parentAnswerLock";
import { loadStudentProfileName } from "@/lib/studentProfileName";
import { loadWrongBookItems } from "@/lib/wrongQuestionBook";
import { fetchParentAssignments, type WorkspaceAssignment } from "@/lib/workspaceApi";

import { formatAssignmentDue } from "@/lib/assignmentDeadline";
import { subjectLabelCn } from "@/lib/gradeSubject";

function ParentTaskCard({
  task,
  answerLockEnabled,
  answerUnlocked,
  onUnlockAnswer,
}: {
  task: WorkspaceAssignment;
  answerLockEnabled: boolean;
  answerUnlocked: boolean;
  onUnlockAnswer: () => void;
}) {
  const hasAnswerImage = Boolean(task.answer_key_image_url?.trim());
  const hasAnswerText = Boolean(task.answer_key?.trim());
  const hasAnswer = hasAnswerImage || hasAnswerText;
  const showAnswer = hasAnswer && (!answerLockEnabled || answerUnlocked);

  return (
    <li className="rounded-xl border border-black/[0.06] bg-surface-page/70 px-3 py-2.5">
      <p className="text-caption font-bold text-ink">
        {subjectLabelCn(task.subject)} · {task.title}
      </p>
      <p className="mt-0.5 text-[0.65rem] text-ink-muted">
        {task.class_name} · 截止 {formatAssignmentDue(task.due_at)}
      </p>
      {task.description ? <p className="mt-1 text-caption text-ink-muted">{task.description}</p> : null}

      {task.teacher_attachment_image_url || task.teacher_attachment_note ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-sky-100 bg-sky-50/90 ring-1 ring-sky-100">
          <p className="px-2.5 py-1.5 text-[0.65rem] font-bold text-sky-950">教师附件</p>
          {task.teacher_attachment_image_url ? (
            <AuthenticatedImage
              src={task.teacher_attachment_image_url}
              alt="教师附件"
              className="max-h-56 w-full bg-white object-contain"
            />
          ) : null}
          {task.teacher_attachment_note ? (
            <p className="border-t border-sky-100/80 px-2.5 py-2 text-caption text-sky-950">
              {task.teacher_attachment_note}
            </p>
          ) : null}
        </div>
      ) : null}

      {hasAnswer ? (
        <div className="mt-2">
          {showAnswer ? (
            <div className="overflow-hidden rounded-lg border border-amber-100 bg-amber-50/90 ring-1 ring-amber-100">
              <p className="px-2.5 py-1.5 text-[0.65rem] font-bold text-amber-950">参考答案</p>
              {hasAnswerImage && task.answer_key_image_url ? (
                <AuthenticatedImage
                  src={task.answer_key_image_url}
                  alt="参考答案"
                  className="max-h-56 w-full bg-white object-contain"
                />
              ) : null}
              {hasAnswerText ? (
                <p className="border-t border-amber-100/80 px-2.5 py-2 text-caption text-amber-950">
                  {task.answer_key}
                </p>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={onUnlockAnswer}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-caption font-bold text-amber-950 transition hover:bg-amber-100/90"
            >
              <Lock className="h-4 w-4" {...CUTE_ICON} aria-hidden />
              查看参考答案（已开启答案锁）
            </button>
          )}
        </div>
      ) : null}
    </li>
  );
}

/** 家长端首页：孩子任务 + 代拍批改 + 只读学情摘要 */
export function HomePageParent() {
  const history = useMemo(() => loadGradingHistory().slice(0, 15), []);
  const wrongCount = loadWrongBookItems().length;
  const [childTasks, setChildTasks] = useState<WorkspaceAssignment[]>([]);
  const [childName, setChildName] = useState("");
  const [answerLockEnabled, setAnswerLockEnabled] = useState(() => loadParentAnswerLock());
  const [unlockedAnswerIds, setUnlockedAnswerIds] = useState<Set<string>>(() => new Set());

  const avg =
    history.length > 0
      ? Math.round((history.reduce((a, e) => a + e.detail.scorePercent, 0) / history.length) * 10) / 10
      : null;

  useEffect(() => {
    if (!loadAuthToken()) return;
    const profile = loadStudentProfileName();
    void fetchParentAssignments()
      .then(({ child_name, items }) => {
        setChildName(child_name || profile || "张三");
        setChildTasks(items);
      })
      .catch(() => {
        setChildName(profile || "张三");
        setChildTasks([]);
      });
  }, []);

  const toggleAnswerLock = (enabled: boolean) => {
    setAnswerLockEnabled(enabled);
    saveParentAnswerLock(enabled);
    if (enabled) setUnlockedAnswerIds(new Set());
  };

  return (
    <div className="page-bg-hero-stunning relative flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 md:max-w-4xl md:px-6 md:py-10">
        <div className="rounded-[28px] bg-gradient-to-br from-rose-50/95 via-white to-amber-50/80 px-6 py-9 shadow-card ring-1 ring-rose-100/80">
          <div className="flex flex-col items-center text-center sm:flex-row sm:text-left">
            <IpBrandFace size="md" className="shrink-0" />
            <div className="mt-4 sm:ml-5 sm:mt-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-caption font-bold text-rose-900">
                <Heart className="h-3 w-3" {...CUTE_ICON} aria-hidden />
                家长端
              </span>
              <h1 className="mt-2 text-2xl font-extrabold text-ink">孩子成长一览</h1>
              <p className="mt-2 text-small text-ink-muted">
                可查看教师布置的任务与参考答案（无需交卷）；也可代孩子拍照批改，学情来自本机记录。
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-rose-100 bg-white/90 p-4">
            <p className="flex items-center gap-2 text-caption font-bold text-ink">
              <ClipboardList className="h-4 w-4 text-rose-600" {...CUTE_ICON} aria-hidden />
              {childName ? `${childName} 的课堂任务` : "孩子课堂任务"} ({childTasks.length})
            </p>
            <p className="mt-1 text-caption text-ink-muted">家长仅查看与对照参考答案，提交作业请使用学生端</p>

            <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5 text-caption text-amber-950">
              <input
                type="checkbox"
                checked={answerLockEnabled}
                onChange={(e) => toggleAnswerLock(e.target.checked)}
                className="h-4 w-4 rounded border-amber-300 text-brand"
              />
              {answerLockEnabled ? (
                <Lock className="h-4 w-4 shrink-0" {...CUTE_ICON} aria-hidden />
              ) : (
                <LockOpen className="h-4 w-4 shrink-0" {...CUTE_ICON} aria-hidden />
              )}
              <span>
                <span className="font-bold">查看答案锁</span>
                <span className="ml-1 text-ink-muted">
                  {answerLockEnabled ? "开启：需点击「查看参考答案」后才显示" : "关闭：参考答案直接展示"}
                </span>
              </span>
            </label>

            <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {childTasks.length === 0 ? (
                <li className="text-caption text-ink-muted">暂无任务，教师发布并指定孩子姓名后将显示在此</li>
              ) : (
                childTasks.map((t) => (
                  <ParentTaskCard
                    key={t.id}
                    task={t}
                    answerLockEnabled={answerLockEnabled}
                    answerUnlocked={unlockedAnswerIds.has(t.id)}
                    onUnlockAnswer={() =>
                      setUnlockedAnswerIds((prev) => {
                        const next = new Set(prev);
                        next.add(t.id);
                        return next;
                      })
                    }
                  />
                ))
              )}
            </ul>
          </div>

          <div className="mt-8 text-center sm:text-left">
            <p className="flex items-center justify-center gap-2 text-body font-bold text-ink sm:justify-start">
              <Camera className="h-4 w-4 text-primary" {...CUTE_ICON} aria-hidden />
              代孩子批改
            </p>
            <p className="mt-1 text-caption text-ink-muted">上传前请填写孩子姓名，便于在学情列表中区分</p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SubjectCard title="数学作业" description="逐题过程分与薄弱点" to="/math" theme="math" badge="代拍" />
            <SubjectCard title="语文作业" description="字词阅读与书写规范" to="/chinese" theme="math" badge="代拍" />
            <SubjectCard title="英语作业" description="内容、语言、结构" to="/english" theme="english" badge="代拍" />
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/90 px-4 py-3 text-center ring-1 ring-rose-100">
              <p className="text-caption text-ink-muted">最近批改</p>
              <p className="text-2xl font-black text-ink">{history.length}</p>
            </div>
            <div className="rounded-xl bg-sky-50 px-4 py-3 text-center ring-1 ring-sky-100">
              <p className="text-caption text-ink-muted">平均得分率</p>
              <p className="text-2xl font-black text-sky-900">{avg != null ? `${avg}%` : "—"}</p>
            </div>
            <div className="col-span-2 rounded-xl bg-amber-50 px-4 py-3 text-center ring-1 ring-amber-100 sm:col-span-1">
              <p className="text-caption text-ink-muted">错题收录</p>
              <p className="text-2xl font-black text-amber-950">{wrongCount}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-black/[0.06] bg-white/80 p-4">
            <p className="flex items-center gap-2 text-caption font-bold text-ink">
              <TrendingUp className="h-4 w-4 text-primary" {...CUTE_ICON} aria-hidden />
              最近批改记录
            </p>
            <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {history.length === 0 ? (
                <li className="text-caption text-ink-muted">暂无记录，请先完成一次代拍批改</li>
              ) : (
                history.map((e) => (
                  <li key={e.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-surface-page/70 px-3 py-2 text-caption">
                    <span className="font-semibold text-ink">
                      {e.studentName || "未标注"} · {subjectLabelCn(e.subject)}
                    </span>
                    <span className="text-ink-muted">
                      {e.detail.scorePercent}% · {e.detail.overallLabel}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <p className="mt-6 flex items-start gap-2 rounded-xl border border-sky-200/70 bg-sky-50/80 px-3 py-2.5 text-caption text-sky-950">
            <Eye className="mt-0.5 h-4 w-4 shrink-0" {...CUTE_ICON} aria-hidden />
            家长端不能交卷、修改分数或审核申诉；任务提交与批改结果查看请使用学生端。
          </p>
        </div>
      </main>
    </div>
  );
}
