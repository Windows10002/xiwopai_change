import type { ReactNode } from "react";
import { GraduationCap, Plus } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { PrimaryButton } from "@/components/atoms/PrimaryButton";
import {
  TeacherWorkbenchLayout,
  WorkbenchSideNavButton,
} from "@/components/organisms/TeacherWorkbenchLayout";

export type WorkspaceTab = "homework" | "exams" | "review";

type WorkspacePageLayoutProps = {
  tab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  publishedCount: number;
  pendingReviewCount: number;
  homeworkCount: number;
  examCount: number;
  reviewBadge: number;
  onRefresh: () => void;
  onPublishHomework: () => void;
  onPublishExam: () => void;
  mobileTitle: string;
  children: ReactNode;
};

const TAB_LABELS: Record<WorkspaceTab, string> = {
  homework: "日常作业",
  exams: "课堂考试",
  review: "待审阅",
};

export function WorkspacePageLayout({
  tab,
  onTabChange,
  publishedCount,
  pendingReviewCount,
  homeworkCount,
  examCount,
  reviewBadge,
  onRefresh,
  onPublishHomework,
  onPublishExam,
  mobileTitle,
  children,
}: WorkspacePageLayoutProps) {
  const showHomeworkPublish = tab === "homework";
  const showExamPublish = tab === "exams";

  const sideNav = (
    <>
      <WorkbenchSideNavButton
        active={tab === "homework"}
        label={`日常作业 (${homeworkCount})`}
        onClick={() => onTabChange("homework")}
      />
      <WorkbenchSideNavButton
        active={tab === "exams"}
        label={`课堂考试 (${examCount})`}
        onClick={() => onTabChange("exams")}
      />
      <WorkbenchSideNavButton
        active={tab === "review"}
        label="待审阅"
        badge={reviewBadge}
        onClick={() => onTabChange("review")}
      />
    </>
  );

  const mobileSideNav = (
    <>
      <button
        type="button"
        onClick={() => onTabChange("homework")}
        className={`shrink-0 rounded-xl px-3 py-1.5 text-caption font-bold ${
          tab === "homework" ? "bg-brand text-white" : "bg-white/90 text-ink-muted ring-1 ring-black/[0.06]"
        }`}
      >
        {TAB_LABELS.homework}({homeworkCount})
      </button>
      <button
        type="button"
        onClick={() => onTabChange("exams")}
        className={`shrink-0 rounded-xl px-3 py-1.5 text-caption font-bold ${
          tab === "exams" ? "bg-brand text-white" : "bg-white/90 text-ink-muted ring-1 ring-black/[0.06]"
        }`}
      >
        {TAB_LABELS.exams}({examCount})
      </button>
      <button
        type="button"
        onClick={() => onTabChange("review")}
        className={`shrink-0 rounded-xl px-3 py-1.5 text-caption font-bold ${
          tab === "review" ? "bg-brand text-white" : "bg-white/90 text-ink-muted ring-1 ring-black/[0.06]"
        }`}
      >
        待审阅{reviewBadge > 0 ? ` ${reviewBadge}` : ""}
      </button>
    </>
  );

  return (
    <TeacherWorkbenchLayout
      moduleTitle="作业管理"
      moduleSubtitle={`进行中 ${publishedCount} · 待审阅 ${pendingReviewCount}`}
      mobileTitle={mobileTitle}
      onRefresh={onRefresh}
      sideNav={
        <>
          <div className="hidden md:contents">{sideNav}</div>
          <div className="contents md:hidden">{mobileSideNav}</div>
        </>
      }
      headerSlot={
        <>
          {showHomeworkPublish ? (
            <PrimaryButton className="min-h-10 w-full justify-center gap-2 text-small" onClick={onPublishHomework}>
              <Plus className="h-4 w-4" {...CUTE_ICON} aria-hidden />
              发布作业
            </PrimaryButton>
          ) : null}
          {showExamPublish ? (
            <PrimaryButton className="min-h-10 w-full justify-center gap-2 text-small" onClick={onPublishExam}>
              <GraduationCap className="h-4 w-4" {...CUTE_ICON} aria-hidden />
              发起考试
            </PrimaryButton>
          ) : null}
          {tab === "review" ? (
            <p className="rounded-xl bg-amber-50/90 px-3 py-2 text-[0.65rem] leading-relaxed text-amber-950 ring-1 ring-amber-200/80">
              审阅通过后，学生才能在「我的作业」里看到成绩
            </p>
          ) : null}
        </>
      }
    >
      {children}
    </TeacherWorkbenchLayout>
  );
}
