import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { GraduationCap } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { useAppSession } from "@/hooks/useAppSession";

type ProtectedStudentRouteProps = {
  children: ReactNode;
};

/** 仅学生可访问（如错题本） */
export function ProtectedStudentRoute({ children }: ProtectedStudentRouteProps) {
  const session = useAppSession();
  const location = useLocation();

  if (!session) {
    return (
      <div className="page-bg-hero-stunning flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-[1.25rem] border border-black/[0.08] bg-white/95 p-8 text-center shadow-card">
          <p className="text-body font-bold text-ink">请先以学生身份登录</p>
          <p className="mt-2 text-small text-ink-muted">错题本仅对学生开放。</p>
          <Link
            to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
            className="btn-accent-mint-solid mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl text-small font-bold"
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  if (session.role !== "student") {
    return (
      <div className="page-bg-hero-stunning flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-[1.25rem] border border-black/[0.08] bg-white/95 p-8 text-center shadow-card">
          <GraduationCap className="mx-auto h-12 w-12 text-primary" {...CUTE_ICON} aria-hidden />
          <p className="mt-4 text-body font-bold text-ink">错题本仅学生端可用</p>
          <p className="mt-2 text-small text-ink-muted">教师端请使用批改历史查看作业记录。</p>
          <Link to="/" className="btn-brand-primary mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl text-small font-bold">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
