/**
 * 多标签并行登录：同一浏览器开多个标签时，用 ?slot= 区分令牌存储，互不覆盖。
 * 每个标签首次打开带 slot 的链接后，该标签会记住自己的 slot（存在 sessionStorage）。
 */
const SLOT_SESSION_KEY = "seewo_pi_auth_slot_v1";

export const AUTH_SLOT_VALUES = ["main", "teacher", "student", "parent", "admin"] as const;
export type AuthSlot = (typeof AUTH_SLOT_VALUES)[number];

const SLOT_LABELS: Record<AuthSlot, string> = {
  main: "默认",
  teacher: "教师",
  student: "学生",
  parent: "家长",
  admin: "教务",
};

function isAuthSlot(v: string): v is AuthSlot {
  return (AUTH_SLOT_VALUES as readonly string[]).includes(v);
}

/** 从 URL 写入本标签 slot；?role= 仅在登录页作为 slot 别名，避免其它页误改槽 */
export function initAuthSlotFromUrl(pathname?: string, search?: string): void {
  if (typeof window === "undefined") return;
  const path = pathname ?? window.location.pathname;
  const params = new URLSearchParams(search ?? window.location.search);
  const fromSlot = params.get("slot")?.trim().toLowerCase() ?? "";
  const onLogin = path === "/login" || path.startsWith("/login/");
  const fromRole = onLogin ? params.get("role")?.trim().toLowerCase() ?? "" : "";
  const candidate = fromSlot || fromRole;
  if (candidate && isAuthSlot(candidate)) {
    sessionStorage.setItem(SLOT_SESSION_KEY, candidate);
  }
}

/** 带 redirect 的登录页路径，保留当前标签 slot */
export function loginPath(redirect?: string): string {
  const q = redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";
  return withAuthSlot(`/login${q}`);
}

export function getAuthSlot(): AuthSlot {
  if (typeof window === "undefined") return "main";
  const stored = sessionStorage.getItem(SLOT_SESSION_KEY)?.trim().toLowerCase() ?? "";
  if (stored && isAuthSlot(stored)) return stored;
  return "main";
}

export function authSlotLabel(slot: AuthSlot = getAuthSlot()): string {
  return SLOT_LABELS[slot];
}

/** 为 localStorage / sessionStorage 生成带 slot 后缀的键（main 保持原键名兼容旧数据） */
export function scopedStorageKey(baseKey: string, slot: AuthSlot = getAuthSlot()): string {
  return slot === "main" ? baseKey : `${baseKey}:${slot}`;
}

/** 开发用：带 slot 的完整 URL（保留当前路径，仅改 query） */
export function buildSlotUrl(slot: Exclude<AuthSlot, "main">, path = "/"): string {
  if (typeof window === "undefined") return `${path}?slot=${slot}`;
  const url = new URL(path, window.location.origin);
  url.searchParams.set("slot", slot);
  return url.pathname + url.search;
}

/** 站内跳转时保留当前标签的 slot（main 则原样返回） */
export function withAuthSlot(path: string): string {
  const slot = getAuthSlot();
  if (slot === "main" || typeof window === "undefined") return path;
  const url = new URL(path, window.location.origin);
  url.searchParams.set("slot", slot);
  return url.pathname + url.search + url.hash;
}

export const DEV_PARALLEL_LOGIN_SLOTS: Array<{ slot: Exclude<AuthSlot, "main">; hint: string }> = [
  { slot: "teacher", hint: "教师 13800138001" },
  { slot: "student", hint: "学生 13800138003（张三）" },
  { slot: "parent", hint: "家长 13800138002" },
  { slot: "admin", hint: "教务 13800138004" },
];
