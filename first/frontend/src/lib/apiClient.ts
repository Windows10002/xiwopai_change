const TOKEN_KEY = "seewo_pi_auth_token_v1";

export function loadAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function saveAuthToken(token: string, remember: boolean): void {
  const primary = remember ? localStorage : sessionStorage;
  const secondary = remember ? sessionStorage : localStorage;
  secondary.removeItem(TOKEN_KEY);
  primary.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export type ApiJson = Record<string, unknown> & { ok?: boolean; message?: string };

/** 带 Bearer 令牌的 fetch；401 时抛出可识别错误 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = loadAuthToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
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
