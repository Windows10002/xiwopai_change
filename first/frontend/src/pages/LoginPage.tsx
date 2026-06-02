import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, UserRound } from "lucide-react";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { IpMascotWaveWelcome } from "@/components/atoms/IpMascot";
import type { AppUserRole } from "@/lib/appSession";
import {
  GRADING_MIN_GRADE,
  GUARDIAN_DEMO_PASSPHRASE,
  newGuardianAllowanceExpiry,
  saveSession,
  studentNeedsGuardianApproval,
  verifyGuardianPassphrase,
} from "@/lib/appSession";

/** 演示用正确账号（任意其它组合将提示失败文案） */
const DEMO_ACCOUNT = "13800138000";
const DEMO_PASSWORD = "123456";

const GRADE_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const value = i + 1;
  let suffix = "（小学）";
  if (value >= 7 && value <= 9) suffix = "（初中）";
  if (value >= 10) suffix = "（高中）";
  return { value, label: `${value} 年级${suffix}` };
});

type FieldErrors = { account?: string; password?: string; guardianCode?: string };

/** 输入框：默认灰边 · 聚焦薄荷绿光晕 · 错误红边（与全局清新薄荷+鹅黄氛围一致） */
const inputShellBase =
  "rounded-xl border bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-[border-color,box-shadow] duration-button ease-smooth";
const inputShellFocus =
  "focus-within:border-accent-mint focus-within:shadow-[0_0_0_3px_rgba(143,217,193,0.32),inset_0_1px_0_rgba(255,255,255,0.85)]";
const inputShellError =
  "border-red-400 shadow-[0_0_0_3px_rgba(248,113,113,0.16),inset_0_1px_0_rgba(255,255,255,0.85)]";

function BrandLogoRow() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div
          className="animate-wiggle-soft flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#73d13d] to-[#389e0d] text-2xl font-black text-white shadow-[0_10px_28px_rgba(82,196,26,0.38)] ring-[3px] ring-[#FEF9C3]/90"
          aria-hidden
        >
          π
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-[1.35rem] font-extrabold leading-tight tracking-tight text-ink md:text-2xl">
            希沃智教<span className="text-brand">π</span>
          </p>
          <p className="mt-1 text-caption font-medium text-ink-muted">智能教育 · 清新陪伴</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-[#FEF9C3] px-3 py-1 text-caption font-bold text-[#854d0e] ring-1 ring-amber-200/80">
          演示
        </span>
      </div>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [loginRole, setLoginRole] = useState<AppUserRole>("teacher");

  useEffect(() => {
    const r = new URLSearchParams(location.search).get("role");
    if (r === "parent" || r === "student" || r === "teacher" || r === "admin") {
      setLoginRole(r);
    }
  }, [location.search]);
  const [studentGrade, setStudentGrade] = useState(7);
  const [guardianCode, setGuardianCode] = useState("");

  const needsGuardianAtLogin = loginRole === "student" && studentNeedsGuardianApproval(studentGrade);

  const resetMessages = useCallback(() => {
    setGlobalError("");
    setFieldErrors({});
  }, []);

  const validateFields = (): boolean => {
    const next: FieldErrors = {};
    const trimmed = account.trim();
    if (!trimmed) next.account = "请输入手机号或邮箱";
    if (!password) next.password = "请输入密码";
    if (loginRole === "student" && studentNeedsGuardianApproval(studentGrade)) {
      if (!guardianCode.trim()) next.guardianCode = "小学及更低年级须填写家长或教师确认码";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!validateFields()) return;

    setStatus("loading");

    window.setTimeout(() => {
      const ok = account.trim() === DEMO_ACCOUNT && password === DEMO_PASSWORD;
      if (ok) {
        if (loginRole === "student" && studentNeedsGuardianApproval(studentGrade)) {
          if (!verifyGuardianPassphrase(guardianCode)) {
            setStatus("idle");
            setGlobalError("家长或教师确认码不正确，小学及更低年级须由家长或教师代为确认后方可登录。");
            return;
          }
        }
        setStatus("success");
        if (loginRole === "teacher") {
          saveSession({ role: "teacher", studentGrade: null, gradingAllowanceExpiresAt: 0 }, remember);
        } else if (loginRole === "parent") {
          saveSession({ role: "parent", studentGrade: null, gradingAllowanceExpiresAt: 0 }, remember);
        } else if (loginRole === "admin") {
          saveSession({ role: "admin", studentGrade: null, gradingAllowanceExpiresAt: 0 }, remember);
        } else {
          const allowance = studentNeedsGuardianApproval(studentGrade) ? newGuardianAllowanceExpiry() : 0;
          saveSession({ role: "student", studentGrade, gradingAllowanceExpiresAt: allowance }, remember);
        }
        const nextRaw = new URLSearchParams(location.search).get("redirect");
        const next =
          nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
        window.setTimeout(() => navigate(next), 1600);
      } else {
        setStatus("idle");
        setGlobalError("手机号或密码错误，请重新输入");
      }
    }, 900);
  };

  const busy = status === "loading" || status === "success";

  return (
    <div className="page-bg-mint-warm relative flex min-h-screen flex-col">
      <Link
        to="/"
        className="absolute right-4 top-4 z-20 rounded-full bg-white/85 px-4 py-2 text-caption font-semibold text-ink-navActive shadow-sm ring-1 ring-primary/15 backdrop-blur-sm transition-all duration-button ease-smooth hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mint/50 focus-visible:ring-offset-2 md:right-8 md:top-6"
      >
        返回首页
      </Link>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col lg:flex-row lg:items-stretch">
        {/* 左侧品牌区：IP 挥手 → Logo → Slogan */}
        <aside className="relative flex w-full flex-col items-center justify-center overflow-hidden px-5 pb-8 pt-14 text-center sm:px-8 lg:w-[46%] lg:max-w-none lg:pb-16 lg:pt-12 lg:pr-4">
          <div
            className="pointer-events-none absolute -left-10 top-16 h-36 w-36 rounded-full bg-[#FEF9C3]/55 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-10 right-0 h-28 w-28 rounded-full bg-accent-mint/25 blur-2xl"
            aria-hidden
          />

          <div className="relative mt-2 md:mt-4">
            <IpMascotWaveWelcome variant="hero" />
          </div>

          <div className="relative mt-8 md:mt-10">
            <BrandLogoRow />
          </div>

          <div className="relative mt-8 max-w-md md:mt-10">
            <p className="text-lg font-bold leading-snug text-ink md:text-xl">AI 智能批改，让学习更高效</p>
            <p className="mt-3 text-small leading-relaxed text-ink-muted">
              数学作业 · 英语作文，一键上传即可获得过程性反馈。学生登录后可使用错题本与校园风界面。
            </p>
          </div>
        </aside>

        {/* 右侧表单区 */}
        <section className="flex w-full flex-1 flex-col justify-center px-4 pb-20 pt-2 sm:px-8 lg:w-[54%] lg:px-10 lg:pb-14 lg:pt-8">
          <div className="mx-auto w-full max-w-md rounded-[18px] bg-white/95 px-6 py-9 shadow-[0_12px_48px_rgba(15,45,35,0.08),0_4px_16px_rgba(143,217,193,0.12)] ring-1 ring-[#FEF9C3]/70 ring-offset-2 ring-offset-[#f0fcf7] sm:px-8 sm:py-10">
            <div className="mx-auto mb-1 h-1 w-14 rounded-full bg-gradient-to-r from-accent-mint via-[#FEF08A] to-accent-mint/90" aria-hidden />
            <h2 className="text-center text-2xl font-bold text-ink">欢迎回来</h2>
            <p className="mt-2 text-center text-caption text-ink-muted">
              演示账号：
              <span className="font-mono font-semibold text-ink-navActive">{DEMO_ACCOUNT}</span> /{" "}
              <span className="font-mono font-semibold text-ink-navActive">{DEMO_PASSWORD}</span>
              <span className="mt-2 block leading-snug">
                请选择端别：家长端（代拍批改）· 学生端 · 教师端 · 教务系统端。学生若低于 {GRADING_MIN_GRADE} 年级须填确认码（演示：
                <span className="font-mono font-semibold text-ink-navActive">{GUARDIAN_DEMO_PASSPHRASE}</span>）。
              </span>
            </p>

            {status === "success" ? (
              <div
                className="mt-10 flex flex-col items-center gap-4 rounded-xl bg-gradient-to-b from-primary-tint to-[#FEFCE8] px-4 py-8 text-center ring-1 ring-primary/20"
                role="status"
                aria-live="polite"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm ring-2 ring-[#FEF08A]/80">
                  <CheckCircle2 className="h-9 w-9 text-primary" {...CUTE_ICON} aria-hidden />
                </span>
                <p className="text-body font-bold text-ink-navActive">登录成功，正在跳转…</p>
              </div>
            ) : (
              <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
                <div aria-live="polite">
                  {globalError ? (
                    <div
                      className="rounded-xl border border-red-200 bg-red-50/95 px-3 py-2.5 text-caption font-medium text-red-600 shadow-sm"
                      role="alert"
                    >
                      {globalError}
                    </div>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="login-account" className="sr-only">
                    手机号或邮箱
                  </label>
                  <div
                    className={[
                      "flex items-stretch overflow-hidden",
                      inputShellBase,
                      inputShellFocus,
                      fieldErrors.account ? inputShellError : "border-gray-200/95",
                    ].join(" ")}
                  >
                    <span className="flex items-center pl-3.5 text-ink-muted">
                      <UserRound className="h-5 w-5 shrink-0" {...CUTE_ICON} aria-hidden />
                    </span>
                    <input
                      id="login-account"
                      type="text"
                      autoComplete="username"
                      placeholder="手机号 / 邮箱"
                      value={account}
                      disabled={busy}
                      onChange={(ev) => {
                        setAccount(ev.target.value);
                        setGlobalError("");
                        if (fieldErrors.account) setFieldErrors((p) => ({ ...p, account: undefined }));
                      }}
                      aria-invalid={Boolean(fieldErrors.account)}
                      className="min-h-[48px] flex-1 bg-transparent px-3 py-3 text-small text-ink outline-none placeholder:text-ink-subtle"
                    />
                  </div>
                  {fieldErrors.account ? (
                    <p className="mt-1.5 text-caption font-medium text-red-500" role="status">
                      {fieldErrors.account}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="login-password" className="sr-only">
                    密码
                  </label>
                  <div
                    className={[
                      "flex items-stretch overflow-hidden",
                      inputShellBase,
                      inputShellFocus,
                      fieldErrors.password ? inputShellError : "border-gray-200/95",
                    ].join(" ")}
                  >
                    <span className="flex items-center pl-3.5 text-ink-muted">
                      <Lock className="h-5 w-5 shrink-0" {...CUTE_ICON} aria-hidden />
                    </span>
                    <input
                      id="login-password"
                      type={showPwd ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="密码"
                      value={password}
                      disabled={busy}
                      onChange={(ev) => {
                        setPassword(ev.target.value);
                        setGlobalError("");
                        if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                      }}
                      aria-invalid={Boolean(fieldErrors.password)}
                      className="min-h-[48px] flex-1 bg-transparent px-2 py-3 text-small text-ink outline-none placeholder:text-ink-subtle"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setShowPwd((v) => !v)}
                      className="flex shrink-0 items-center px-3 text-ink-muted transition-colors duration-button hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-mint/45 disabled:opacity-40"
                      aria-label={showPwd ? "隐藏密码" : "显示密码"}
                    >
                      {showPwd ? (
                        <EyeOff className="h-5 w-5" {...CUTE_ICON} aria-hidden />
                      ) : (
                        <Eye className="h-5 w-5" {...CUTE_ICON} aria-hidden />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password ? (
                    <p className="mt-1.5 text-caption font-medium text-red-500" role="status">
                      {fieldErrors.password}
                    </p>
                  ) : null}
                </div>

                <fieldset className="rounded-xl border border-black/[0.08] bg-surface-page/60 p-4">
                  <legend className="px-1 text-caption font-bold text-ink">登录端别（演示）</legend>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {(
                      [
                        { role: "parent" as const, label: "家长端" },
                        { role: "student" as const, label: "学生端" },
                        { role: "teacher" as const, label: "教师端" },
                        { role: "admin" as const, label: "教务端" },
                      ] as const
                    ).map(({ role, label }) => (
                      <label
                        key={role}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-3 py-2.5 text-small font-semibold text-ink shadow-sm has-[:checked]:border-accent-mint has-[:checked]:ring-2 has-[:checked]:ring-accent-mint/25"
                      >
                        <input
                          type="radio"
                          name="login-role"
                          checked={loginRole === role}
                          disabled={busy}
                          onChange={() => {
                            setLoginRole(role);
                            if (role !== "student") {
                              setGuardianCode("");
                              setFieldErrors((p) => ({ ...p, guardianCode: undefined }));
                            }
                          }}
                          className="h-4 w-4 accent-accent-mint"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  {loginRole === "student" ? (
                    <div className="mt-3">
                      <label htmlFor="login-grade" className="text-caption font-bold text-ink">
                        当前就读年级
                      </label>
                      <select
                        id="login-grade"
                        disabled={busy}
                        value={studentGrade}
                        onChange={(e) => {
                          setStudentGrade(Number(e.target.value));
                          setGuardianCode("");
                          setFieldErrors((p) => ({ ...p, guardianCode: undefined }));
                        }}
                        className="mt-1.5 w-full rounded-lg border border-black/[0.1] bg-white px-3 py-2.5 text-small font-medium text-ink outline-none focus:border-primary/35 focus:ring-2 focus:ring-primary/15"
                      >
                        {GRADE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {needsGuardianAtLogin ? (
                        <div className="mt-4 rounded-lg border border-amber-200/90 bg-amber-50/80 px-3 py-3">
                          <label htmlFor="login-guardian-code" className="text-caption font-bold text-amber-950">
                            家长或教师确认码（必填）
                          </label>
                          <input
                            id="login-guardian-code"
                            type="password"
                            autoComplete="off"
                            disabled={busy}
                            value={guardianCode}
                            onChange={(e) => {
                              setGuardianCode(e.target.value);
                              setGlobalError("");
                              if (fieldErrors.guardianCode) setFieldErrors((p) => ({ ...p, guardianCode: undefined }));
                            }}
                            placeholder="请输入确认码"
                            aria-invalid={Boolean(fieldErrors.guardianCode)}
                            className="mt-2 w-full rounded-lg border border-amber-200/80 bg-white px-3 py-2.5 text-small text-ink outline-none focus:border-primary/35 focus:ring-2 focus:ring-primary/15"
                          />
                          {fieldErrors.guardianCode ? (
                            <p className="mt-1.5 text-caption font-medium text-red-600" role="status">
                              {fieldErrors.guardianCode}
                            </p>
                          ) : (
                            <p className="mt-1.5 text-[0.65rem] leading-snug text-amber-900/85">
                              未到初中年级的学生须由家长或任课教师确认后，方可登录并使用智能批改。
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </fieldset>

                <div className="flex flex-wrap items-center justify-between gap-3 text-caption">
                  <label className="flex cursor-pointer select-none items-center gap-2.5 text-ink-muted">
                    <input
                      type="checkbox"
                      checked={remember}
                      disabled={busy}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 accent-accent-mint focus:ring-2 focus:ring-accent-mint/35"
                    />
                    <span className="font-medium text-ink">记住我</span>
                  </label>
                  <Link
                    to="/login"
                    state={{ focus: "forgot" }}
                    className="shrink-0 font-semibold text-brand underline-offset-2 transition-colors duration-button hover:text-brand-hover hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mint/45 focus-visible:ring-offset-2"
                    onClick={(ev) => {
                      ev.preventDefault();
                    }}
                  >
                    忘记密码？
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="btn-accent-mint-solid flex h-12 w-full !rounded-xl px-4 text-body font-bold shadow-[0_6px_20px_rgba(143,217,193,0.42)] hover:shadow-[0_10px_28px_rgba(143,217,193,0.48)] disabled:shadow-none"
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.35} aria-hidden />
                      登录中…
                    </>
                  ) : (
                    "登录"
                  )}
                </button>

                <p className="pt-1 text-center text-small text-ink-muted">
                  还没有账号？{" "}
                  <Link
                    to="/login"
                    className="font-bold text-brand underline-offset-2 transition-colors duration-button hover:text-brand-hover hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mint/45 focus-visible:ring-offset-2"
                    onClick={(ev) => ev.preventDefault()}
                  >
                    立即注册
                  </Link>
                </p>
              </form>
            )}
          </div>
        </section>
      </div>

      <footer className="relative z-10 mt-auto border-t border-black/[0.06] bg-white/45 py-5 backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-2 px-4 text-center text-caption text-ink-muted sm:flex-row sm:flex-wrap sm:gap-x-3 sm:gap-y-1">
          <span>© 2026 希沃智教π</span>
          <span className="hidden text-ink-subtle sm:inline" aria-hidden>
            |
          </span>
          <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <Link
              to="/login"
              className="font-medium text-brand underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mint/45 focus-visible:ring-offset-2"
              onClick={(e) => e.preventDefault()}
            >
              隐私政策
            </Link>
            <span className="text-ink-subtle" aria-hidden>
              |
            </span>
            <Link
              to="/login"
              className="font-medium text-brand underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mint/45 focus-visible:ring-offset-2"
              onClick={(e) => e.preventDefault()}
            >
              用户协议
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
