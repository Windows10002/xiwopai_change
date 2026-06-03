import { getAuthSlot, scopedStorageKey } from "@/lib/authSlot";
import { loadStudentProfileName } from "@/lib/studentProfileName";

const TOKEN_KEY = "seewo_pi_auth_token_v1";

function tokenStorageKey(): string {
  return scopedStorageKey(TOKEN_KEY);
}

export function loadAuthToken(): string | null {
  const key = tokenStorageKey();
  const fromStore =
    localStorage.getItem(key) ?? sessionStorage.getItem(key);
  if (fromStore) return fromStore;
  if (getAuthSlot() === "main") {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function saveAuthToken(token: string, remember: boolean): void {
  const key = tokenStorageKey();
  const primary = remember ? localStorage : sessionStorage;
  const secondary = remember ? sessionStorage : localStorage;
  secondary.removeItem(key);
  primary.setItem(key, token);
  if (getAuthSlot() === "main") {
    secondary.removeItem(TOKEN_KEY);
    primary.setItem(TOKEN_KEY, token);
  }
}

export function clearAuthToken(): void {
  const key = tokenStorageKey();
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
  if (getAuthSlot() === "main") {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export type ApiJson = Record<string, unknown> & { ok?: boolean; message?: string };

/** HTTP Header 仅支持 ISO-8859-1，中文姓名需 URI 编码 */
export function encodeHttpHeaderValue(value: string): string {
  return encodeURIComponent(value.trim());
}

export type ApiFetchOptions = {
  /** 覆盖 localStorage 中的学生姓名（待办/交卷必须与页面一致） */
  studentName?: string;
};

/** 带 Bearer 令牌的 fetch；401 时抛出可识别错误 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: ApiFetchOptions,
): Promise<Response> {
  const token = loadAuthToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const studentName = (options?.studentName ?? loadStudentProfileName()).trim();
  if (studentName) headers.set("X-Student-Name", encodeHttpHeaderValue(studentName));
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}

export async function parseApiJson<T extends ApiJson>(res: Response): Promise<T> {
  let json: T;
  try {
    json = (await res.json()) as T;
  } catch {
    if (res.status === 404) {
      throw new Error("接口不存在（404）。请 Ctrl+C 停掉所有旧后端后重新运行 .\\run-conda.ps1。");
    }
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("text/html")) {
      throw new Error("后端返回了网页而非 JSON。请确认只运行一个 Flask 实例并已重新 build 前端。");
    }
    throw new Error("服务器返回了非 JSON 数据，请确认后端已启动。");
  }
  if (!res.ok || json.ok === false) {
    const msg = typeof json.message === "string" ? json.message : `请求失败（HTTP ${res.status}）`;
    if (res.status === 401) {
      throw new Error(`${msg}（请重新登录）`);
    }
    throw new Error(msg);
  }
  return json;
}

export type LoginApiResponse = ApiJson & {
  token?: string;
  role?: string;
  student_grade?: number | null;
  grading_min_grade?: number;
  display_name?: string | null;
  teaching_grades?: string | null;
};

export async function loginApi(body: {
  account: string;
  password: string;
  role: string;
  student_grade?: number;
  guardian_code?: string;
}): Promise<LoginApiResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseApiJson<LoginApiResponse>(res);
}

export type AuthMeUser = {
  role?: string;
  sub?: string;
  display_name?: string;
  teaching_grades?: string;
  student_grade?: number;
  student_name?: string;
};

export async function fetchAuthMe(): Promise<AuthMeUser | null> {
  const res = await apiFetch("/api/auth/me");
  const body = await parseApiJson<{ user?: AuthMeUser }>(res);
  return body.user ?? null;
}
