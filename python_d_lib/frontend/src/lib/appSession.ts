/**
 * 演示环境本地会话：区分教师 / 学生，以及学生年级与低龄批改临时许可。
 * 正式对接账号体系后可替换为 JWT / Cookie 等，门禁组件接口保持不变。
 */

export type AppUserRole = "teacher" | "student";

export type AppSession = {
  role: AppUserRole;
  /** 学生当前年级 1–12；教师为 null */
  studentGrade: number | null;
  /** 小学生等经家长/教师核验后的截止时间（unix ms），未通过则为 0 */
  gradingAllowanceExpiresAt: number;
};

const STORAGE_KEY = "seewo_pi_app_session_v1";

/** 登录/退出后派发，供导航栏等组件刷新展示 */
export const APP_SESSION_CHANGED = "seewo-pi-session-changed";

function emitSessionChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(APP_SESSION_CHANGED));
  }
}

/** 导航栏等处的简短身份文案 */
export function sessionDisplayLabel(session: AppSession): string {
  if (session.role === "teacher") return "教师";
  if (session.studentGrade != null) return `学生 · ${session.studentGrade}年级`;
  return "学生";
}

/** 初中一年级起视为可独立使用智能批改（与义务教育学段划分一致） */
export const GRADING_MIN_GRADE = 7;

/** 演示用统一口令（家长或教师代为确认） */
export const GUARDIAN_DEMO_PASSPHRASE = "HW-ALLOW";

const GUARDIAN_ALLOW_MS = 8 * 60 * 60 * 1000;

/** 该年级学生使用智能批改前须家长/教师确认（未达初中） */
export function studentNeedsGuardianApproval(grade: number): boolean {
  return grade >= 1 && grade < GRADING_MIN_GRADE;
}

export function newGuardianAllowanceExpiry(): number {
  return Date.now() + GUARDIAN_ALLOW_MS;
}

export function loadSession(): AppSession | null {
  for (const store of [localStorage, sessionStorage] as const) {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) continue;
    try {
      const o = JSON.parse(raw) as AppSession;
      if (o.role !== "teacher" && o.role !== "student") return null;
      if (o.role === "teacher") {
        return { role: "teacher", studentGrade: null, gradingAllowanceExpiresAt: 0 };
      }
      const g = typeof o.studentGrade === "number" && o.studentGrade >= 1 && o.studentGrade <= 12 ? o.studentGrade : null;
      const exp = typeof o.gradingAllowanceExpiresAt === "number" ? o.gradingAllowanceExpiresAt : 0;
      return { role: "student", studentGrade: g, gradingAllowanceExpiresAt: exp };
    } catch {
      return null;
    }
  }
  return null;
}

export function saveSession(session: AppSession, remember: boolean): void {
  const primary = remember ? localStorage : sessionStorage;
  const secondary = remember ? sessionStorage : localStorage;
  secondary.removeItem(STORAGE_KEY);
  primary.setItem(STORAGE_KEY, JSON.stringify(session));
  emitSessionChanged();
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  emitSessionChanged();
}

export function canAccessGrading(session: AppSession | null): boolean {
  if (!session) return false;
  if (session.role === "teacher") return true;
  if (session.role !== "student" || session.studentGrade == null) return false;
  if (session.studentGrade >= GRADING_MIN_GRADE) return true;
  return session.gradingAllowanceExpiresAt > Date.now();
}

function sessionPersistence(): "local" | "session" | null {
  if (localStorage.getItem(STORAGE_KEY)) return "local";
  if (sessionStorage.getItem(STORAGE_KEY)) return "session";
  return null;
}

export function grantGuardianGradingAccess(): void {
  const s = loadSession();
  if (!s || s.role !== "student") return;
  s.gradingAllowanceExpiresAt = Date.now() + GUARDIAN_ALLOW_MS;
  const where = sessionPersistence();
  if (!where) return;
  saveSession(s, where === "local");
}

export function verifyGuardianPassphrase(input: string): boolean {
  return input.trim() === GUARDIAN_DEMO_PASSPHRASE;
}
