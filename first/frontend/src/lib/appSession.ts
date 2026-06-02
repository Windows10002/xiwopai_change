/**
 * 演示环境本地会话：家长端 / 学生端 / 教师端 / 教务系统端
 */

export type AppUserRole = "parent" | "student" | "teacher" | "admin";

export type AppSession = {
  role: AppUserRole;
  /** 学生当前年级 1–12；其它身份为 null */
  studentGrade: number | null;
  /** 小学生等经家长/教师核验后的截止时间（unix ms） */
  gradingAllowanceExpiresAt: number;
};

const STORAGE_KEY = "seewo_pi_app_session_v2";

export const APP_SESSION_CHANGED = "seewo-pi-session-changed";

function emitSessionChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(APP_SESSION_CHANGED));
  }
}

export function sessionDisplayLabel(session: AppSession): string {
  if (session.role === "parent") return "家长端";
  if (session.role === "teacher") return "教师端";
  if (session.role === "admin") return "教务系统端";
  if (session.studentGrade != null) return `学生端 · ${session.studentGrade}年级`;
  return "学生端";
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

function normalizeSession(o: Record<string, unknown>): AppSession | null {
  const role = parseRole(o.role);
  if (!role) return null;

  if (role === "parent") {
    return { role: "parent", studentGrade: null, gradingAllowanceExpiresAt: 0 };
  }
  if (role === "teacher") {
    return { role: "teacher", studentGrade: null, gradingAllowanceExpiresAt: 0 };
  }
  if (role === "admin") {
    return { role: "admin", studentGrade: null, gradingAllowanceExpiresAt: 0 };
  }

  const g =
    typeof o.studentGrade === "number" && o.studentGrade >= 1 && o.studentGrade <= 12 ? o.studentGrade : null;
  const exp = typeof o.gradingAllowanceExpiresAt === "number" ? o.gradingAllowanceExpiresAt : 0;
  return { role: "student", studentGrade: g, gradingAllowanceExpiresAt: exp };
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
