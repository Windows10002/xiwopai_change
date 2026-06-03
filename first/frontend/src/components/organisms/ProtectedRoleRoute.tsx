import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AppLink } from "@/components/atoms/AppLink";
import { loginPath } from "@/lib/authSlot";

import { loadAuthToken } from "@/lib/apiClient";
import { useAppSession } from "@/hooks/useAppSession";
import { deniedMessage, hasPermission, ROLE_LABEL, type Permission } from "@/lib/rolePermissions";

type ProtectedRoleRouteProps = {
  children: ReactNode;
  /** 所需权限，满足其一即可 */
  anyOf: Permission[];
  loginRedirect?: string;
};

export function ProtectedRoleRoute({ children, anyOf, loginRedirect }: ProtectedRoleRouteProps) {
  const session = useAppSession();
  const location = useLocation();
  const redirect = loginRedirect ?? location.pathname;
  const allowed = anyOf.some((p) => hasPermission(session, p));
  const needPerm = anyOf[0];

  if (!session || !loadAuthToken()) {
    return (
      <div className="page-bg-hero-stunning flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-[1.25rem] border border-black/[0.08] bg-white/95 p-8 text-center shadow-card">
          <p className="text-body font-bold text-ink">请先登录</p>
          <p className="mt-2 text-small text-ink-muted">该功能需要登录后按身份授权访问。</p>
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

  if (!allowed) {
    return (
      <div className="page-bg-hero-stunning flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-[1.25rem] border border-black/[0.08] bg-white/95 p-8 text-center shadow-card">
          <p className="text-body font-bold text-ink">无访问权限</p>
          <p className="mt-2 text-small text-ink-muted">
            当前为<strong className="text-ink"> {ROLE_LABEL[session.role]} </strong>，{deniedMessage(needPerm)}
          </p>
          <AppLink to="/" className="btn-brand-primary mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl text-small font-bold">
            返回首页
          </AppLink>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
