import type { ReactNode } from "react";

import { Breadcrumb } from "@/components/atoms/Breadcrumb";
import { Navbar } from "@/components/atoms/Navbar";
import { PageCampusDeco } from "@/components/atoms/PageCampusDeco";
import { PiAssistantFab } from "@/components/atoms/PiAssistantFab";
import { StudentBadgeEarnedToast } from "@/components/molecules/StudentBadgeEarnedToast";
import { useUserPreferences } from "@/hooks/useUserPreferences";

type StudentPageShellProps = {
  pageTitle: string;
  children: ReactNode;
  /** main 区域额外 class */
  mainClassName?: string;
};

/** 学生工作台页：顶栏 + 面包屑 + π 助手 */
export function StudentPageShell({ pageTitle, children, mainClassName = "max-w-3xl" }: StudentPageShellProps) {
  const prefs = useUserPreferences();

  return (
    <div className="page-bg-hero-stunning relative flex min-h-screen flex-col">
      <PageCampusDeco />
      <div className="relative z-10 flex flex-1 flex-col">
        <Navbar />
        <Breadcrumb items={[{ label: "首页", to: "/" }, { label: pageTitle }]} contentMaxClassName={mainClassName} />
        {children}
        <PiAssistantFab show={prefs.showHomeFabHelp} />
        <StudentBadgeEarnedToast />
      </div>
    </div>
  );
}
