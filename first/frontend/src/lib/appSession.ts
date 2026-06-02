/**
 * 演示环境本地会话：家长端 / 学生端 / 教师端 / 教务系统端
 */
import { clearAuthToken, fetchAuthMe, loadAuthToken } from "@/lib/apiClient";
import { findDemoAccount } from "@/lib/demoAccounts";

export type AppUserRole = "parent" | "student" | "teacher" | "admin";

export type AppSession = {
  role: AppUserRole;
  /** 学生当前年级 1–12；其它身份为 null */
  studentGrade: number | null;
  /** 小学生等经家长/教师核验后的截止时间（unix ms） */
  gradingAllowanceExpiresAt: number;
  /** 演示姓名（教师/家长/学生/教务） */
  displayName?: string;
  /** 教师任教年级描述 */
  teachingGrades?: string;
  /** 登录账号，用于补全演示账号展示信息 */
  loginAccount?: string;
};

const STORAGE_KEY = "seewo_pi_app_session_v2";

export const APP_SESSION_CHANGED = "seewo-pi-session-changed";

function emitSessionChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(APP_SESSION_CHANGED));
  }
}

/** 已登录：本地会话 + 有效令牌 */
export function isAppLoggedIn(): boolean {
  return Boolean(loadSession() && loadAuthToken());
}

export function sessionDisplayLabel(session: AppSession): string {
  const name = session.displayName?.trim();
  if (session.role === "teacher") {
    if (name && session.teachingGrades) return `${name} · 任教${session.teachingGrades}`;
    if (name) return `${name} · 教师端`;
    return "教师端";
  }
  if (session.role === "parent") return name || "家长端";
  if (session.role === "admin") return name ? `${name} · 教务端` : "教务系统端";
  if (session.role === "student") {
    if (name && session.studentGrade != null) return `${name} · ${session.studentGrade}年级`;
    if (name) return `${name} · 学生端`;
    if (session.studentGrade != null) return `学生端 · ${session.studentGrade}年级`;
    return "学生端";
  }
  return "访客";
}

export const GRADING_MIN_GRADE = 7;
export const GUARDIAN_DEMO_PASSPHRASE = "HW-ALLOW";
const GUARDIAN_ALLOW_MS = 8 * 60 * 60 * 1000;

export function studentNeedsGuardianApproval(grade: number): boolean {
  return grade >= 1 && grade < GRADING_MIN_GRADE;
}

export function newGuardianAllowanceExpiry(): number {
  return Date.now() + GUARDIAN_ALLOW_MS;
}

function parseRole(raw: unknown): AppUserRole | null {
  if (raw === "parent" || raw === "student" || raw === "teacher" || raw === "admin") return raw;
  return null;
}

function readOptionalString(o: Record<string, unknown>, key: string): string | undefined {
  const v = o[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function normalizeSession(o: Record<string, unknown>): AppSession | null {
  const role = parseRole(o.role);
  if (!role) return null;

  const displayName = readOptionalString(o, "displayName");
  const teachingGrades = readOptionalString(o, "teachingGrades");
  const loginAccount = readOptionalString(o, "loginAccount");
  const base = { displayName, teachingGrades, loginAccount };

  if (role === "parent") {
    return { role: "parent", studentGrade: null, gradingAllowanceExpiresAt: 0, ...base };
  }
  if (role === "teacher") {
    return { role: "teacher", studentGrade: null, gradingAllowanceExpiresAt: 0, ...base };
  }
  if (role === "admin") {
    return { role: "admin", studentGrade: null, gradingAllowanceExpiresAt: 0, ...base };
  }

  const g =
    typeof o.studentGrade === "number" && o.studentGrade >= 1 && o.studentGrade <= 12 ? o.studentGrade : null;
  const exp = typeof o.gradingAllowanceExpiresAt === "number" ? o.gradingAllowanceExpiresAt : 0;
  return { role: "student", studentGrade: g, gradingAllowanceExpiresAt: exp, ...base };
}

export function loadSession(): AppSession | null {
  for (const store of [localStorage, sessionStorage] as const) {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) continue;
    try {
      const o = JSON.parse(raw) as Record<string, unknown>;
      return normalizeSession(o);
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
  clearAuthToken();
  emitSessionChanged();
}

/** 能否进入批改页：家长代拍、学生（含低龄确认）、教师、教务 */
export function canAccessGrading(session: AppSession | null): boolean {
  if (!session) return false;
  if (session.role === "parent") return true;
  if (session.role === "teacher" || session.role === "admin") return true;
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

/** 用演示账号表补全缺失的姓名、任教年级等 */
export function enrichSessionFromDemoAccount(session: AppSession): AppSession {
  const account = session.loginAccount?.trim();
  if (!account) return session;
  const demo = findDemoAccount(account);
  if (!demo) return session;

  return {
    ...session,
    displayName: session.displayName ?? demo.displayName,
    teachingGrades: session.teachingGrades ?? demo.teachingGrades,
    studentGrade:
      session.role === "student" && session.studentGrade == null && demo.studentGrade != null
        ? demo.studentGrade
        : session.studentGrade,
  };
}

/** 从服务端令牌同步展示字段，修复旧会话仅含「教师端」的问题 */
let syncInFlight: Promise<AppSession | null> | null = null;

export function syncSessionFromAuthMe(): Promise<AppSession | null> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = syncSessionFromAuthMeImpl().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

async function syncSessionFromAuthMeImpl(): Promise<AppSession | null> {
  const current = loadSession();
  if (!loadAuthToken()) return current;

  try {
    const user = await fetchAuthMe();
    if (!user) {
      if (!current) return null;
      const enriched = enrichSessionFromDemoAccount(current);
      if (JSON.stringify(enriched) !== JSON.stringify(current)) {
        saveSession(enriched, sessionPersistence() !== "session");
      }
      return enriched;
    }

    const role = parseRole(user.role) ?? current?.role;
    if (!role) return current;

    const loginAccount =
      (typeof user.sub === "string" && user.sub.trim()) || current?.loginAccount;
    const displayName =
      (typeof user.display_name === "string" && user.display_name.trim()) || current?.displayName;
    const teachingGrades =
      (typeof user.teaching_grades === "string" && user.teaching_grades.trim()) ||
      current?.teachingGrades;
    const studentGrade =
      role === "student"
        ? typeof user.student_grade === "number"
          ? user.student_grade
          : current?.studentGrade ?? null
        : null;

    const merged = enrichSessionFromDemoAccount({
      role,
      studentGrade,
      gradingAllowanceExpiresAt: current?.gradingAllowanceExpiresAt ?? 0,
      displayName,
      teachingGrades,
      loginAccount,
    });

    const unchanged =
      current &&
      current.role === merged.role &&
      current.displayName === merged.displayName &&
      current.teachingGrades === merged.teachingGrades &&
      current.studentGrade === merged.studentGrade &&
      current.loginAccount === merged.loginAccount;

    if (!unchanged) {
      saveSession(merged, sessionPersistence() !== "session");
    }

    return merged;
  } catch {
    if (!current) return null;
    const enriched = enrichSessionFromDemoAccount(current);
    if (JSON.stringify(enriched) !== JSON.stringify(current)) {
      saveSession(enriched, sessionPersistence() !== "session");
    }
    return enriched;
  }
}
