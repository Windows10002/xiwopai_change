import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Lock, ShieldCheck } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import {
  GUARDIAN_DEMO_PASSPHRASE,
  GRADING_MIN_GRADE,
  canAccessGrading,
  grantGuardianGradingAccess,
  loadSession,
  verifyGuardianPassphrase,
} from "@/lib/appSession";

type ProtectedGradingRouteProps = {
  children: ReactNode;
};

/**
 * 智能批改路由门禁：未登录跳转登录；学生且年级低于初中需家长/教师口令通过后才渲染子页面。
 */
export function ProtectedGradingRoute({ children }: ProtectedGradingRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(loadSession);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const path = location.pathname;

  const access = useMemo(() => canAccessGrading(session), [session]);

  const needsGuardian = useMemo(() => {
    if (!session || session.role !== "student") return false;
    if (session.studentGrade == null) return false;
    return session.studentGrade < GRADING_MIN_GRADE && session.gradingAllowanceExpiresAt <= Date.now();
  }, [session]);

  const refreshSession = useCallback(() => {
    setSession(loadSession());
  }, []);

  useEffect(() => {
    setSession(loadSession());
  }, [location.pathname, location.key]);

  if (!session) {
    return (
      <div className="page-bg-hero-stunning flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-[1.25rem] border border-black/[0.08] bg-white/95 p-8 text-center shadow-card ring-1 ring-primary/10">
          <Lock className="mx-auto h-12 w-12 text-primary" {...CUTE_ICON} aria-hidden />
          <h1 className="mt-4 text-body font-extrabold text-ink">使用智能批改前请先登录</h1>
          <p className="mt-2 text-small leading-relaxed text-ink-muted">
            登录后按端别授权：家长端可代孩子批改；学生端、教师端、教务端可使用智能批改（学生低龄需确认）。
          </p>
          <Link
            to={`/login?redirect=${encodeURIComponent(path)}`}
            className="btn-accent-mint-solid mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-small font-bold"
          >
            去登录
          </Link>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-3 w-full rounded-xl border border-black/[0.1] bg-white py-3 text-small font-semibold text-ink-muted transition hover:bg-black/[0.03]"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!access && needsGuardian) {
    const gradeLabel = session.studentGrade != null ? `${session.studentGrade} 年级` : "当前账号";
    return (
      <div className="page-bg-hero-stunning flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg rounded-[1.25rem] border border-amber-200/90 bg-gradient-to-b from-amber-50/95 to-white p-8 shadow-[0_20px_60px_rgba(180,130,20,0.12)] ring-1 ring-amber-100">
          <ShieldCheck className="mx-auto h-12 w-12 text-amber-700" {...CUTE_ICON} aria-hidden />
          <h1 className="mt-4 text-center text-body font-extrabold text-ink">需要家长或教师确认</h1>
          <p className="mt-3 text-center text-small leading-relaxed text-ink-muted">
            当前为「学生」身份，且就读年级为 <strong className="text-ink">{gradeLabel}</strong>
            。按使用规范，小学及以下同学使用智能批改需由家长或任课教师确认。
          </p>
          <p className="mt-4 rounded-xl border border-sky-200/80 bg-sky-50/90 px-3 py-2.5 text-caption leading-relaxed text-sky-950">
            演示环境统一口令：<span className="font-mono font-bold tracking-wide">{GUARDIAN_DEMO_PASSPHRASE}</span>
            <span className="mt-1 block text-[0.65rem] font-normal text-sky-900/85">正式环境可替换为短信验证码或教师端授权链接。</span>
          </p>
          <label htmlFor="guardian-code" className="mt-6 block text-left text-small font-bold text-ink">
            家长或教师确认码
          </label>
          <input
            id="guardian-code"
            type="password"
            autoComplete="off"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setErr(null);
            }}
            placeholder="请输入确认码"
            className="mt-2 w-full rounded-xl border border-black/[0.1] bg-white px-3 py-3 text-small text-ink shadow-sm outline-none focus:border-primary/35 focus:ring-2 focus:ring-primary/15"
          />
          {err ? (
            <p className="mt-2 text-caption font-semibold text-red-600" role="alert">
              {err}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (!verifyGuardianPassphrase(code)) {
                setErr("确认码不正确，请向家长或教师索取后重试。");
                return;
              }
              grantGuardianGradingAccess();
              refreshSession();
              setCode("");
            }}
            className="btn-accent-mint-solid mt-6 w-full min-h-11 rounded-xl px-4 text-small font-bold"
          >
            验证并进入批改
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-3 w-full rounded-xl border border-black/[0.08] bg-white py-3 text-small font-semibold text-ink-muted hover:bg-black/[0.03]"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!access) {
    return (
      <div className="page-bg-hero-stunning flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-[1.25rem] border border-black/[0.08] bg-white/95 p-8 text-center shadow-card">
          <p className="text-body font-bold text-ink">当前无法进入智能批改</p>
          <p className="mt-2 text-small text-ink-muted">会话信息不完整，请重新登录。</p>
          <button
            type="button"
            onClick={() => {
              navigate(`/login?redirect=${encodeURIComponent(path)}`);
            }}
            className="btn-accent-mint-solid mt-6 w-full min-h-11 rounded-xl text-small font-bold"
          >
            重新登录
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
