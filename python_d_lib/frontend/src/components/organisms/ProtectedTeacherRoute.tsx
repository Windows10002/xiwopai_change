import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/hooks/useAppSession";

type ProtectedTeacherRouteProps = {
  children: ReactNode;
};

/** 仅教师可访问（学生学情分析等） */
export function ProtectedTeacherRoute({ children }: ProtectedTeacherRouteProps) {
  const session = useAppSession();

  if (!session) {
    return (
      <div className="page-bg-hero-stunning flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-[1.25rem] border border-black/[0.08] bg-white/95 p-8 text-center shadow-card">
          <p className="text-body font-bold text-ink">请先以教师身份登录</p>
          <p className="mt-2 text-small text-ink-muted">学生个性化学情分析仅教师端可用。</p>
          <Link
            to="/login?redirect=%2Fstudent-analytics"
            className="btn-accent-mint-solid mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl text-small font-bold"
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  if (session.role !== "teacher") {
    return (
      <div className="page-bg-hero-stunning flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-[1.25rem] border border-black/[0.08] bg-white/95 p-8 text-center shadow-card">
          <p className="text-body font-bold text-ink">该功能仅教师端开放</p>
          <p className="mt-2 text-small text-ink-muted">学生请使用「错题本」查看个人错题。</p>
          <Link to="/" className="btn-brand-primary mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl text-small font-bold">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
