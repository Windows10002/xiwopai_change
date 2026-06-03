import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AppLink } from "@/components/atoms/AppLink";
import { loginPath } from "@/lib/authSlot";

import { isAppLoggedIn } from "@/lib/appSession";

type RequireLoginRouteProps = {
  children: ReactNode;
  loginRedirect?: string;
};

/** 需登录页面：未登录跳转登录 */
export function RequireLoginRoute({ children, loginRedirect }: RequireLoginRouteProps) {
  const location = useLocation();
  const redirect = loginRedirect ?? location.pathname;

  if (!isAppLoggedIn()) {
    return (
      <div className="page-bg-hero-stunning flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-[1.25rem] border border-black/[0.08] bg-white/95 p-8 text-center shadow-card">
          <p className="text-body font-bold text-ink">请先登录</p>
          <p className="mt-2 text-small text-ink-muted">该功能需要登录后访问。</p>
          <AppLink
            to={loginPath(redirect)}
            className="btn-accent-mint-solid mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl text-small font-bold"
          >
            去登录
          </AppLink>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
