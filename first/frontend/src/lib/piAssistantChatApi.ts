import { apiFetch, parseApiJson } from "@/lib/apiClient";
import type { AppSession } from "@/lib/appSession";

export type AssistantChatTurn = { role: "user" | "assistant"; content: string };

export type AssistantConfig = {
  ok: boolean;
  llm_available: boolean;
  max_rounds_default: number;
  max_rounds_teacher: number;
  max_rounds_admin: number;
  disclaimer: string;
};

export type AssistantChatResponse = {
  ok: boolean;
  reply?: string;
  disclaimer?: string;
  rounds_used?: number;
  max_rounds?: number;
  fallback_rules?: boolean;
  message?: string;
};

let configCache: AssistantConfig | null = null;
let configPromise: Promise<AssistantConfig> | null = null;

export async function fetchAssistantConfig(force = false): Promise<AssistantConfig> {
  if (!force && configCache) return configCache;
  if (!force && configPromise) return configPromise;
  configPromise = (async () => {
    const res = await apiFetch("/api/assistant/config");
    const json = await parseApiJson<AssistantConfig>(res);
    if (!json.ok) throw new Error("无法加载助手配置");
    configCache = json;
    return json;
  })();
  try {
    return await configPromise;
  } finally {
    configPromise = null;
  }
}

export function maxRoundsForRole(
  config: AssistantConfig,
  role: AppSession["role"] | null,
): number {
  if (role === "teacher") return config.max_rounds_teacher;
  if (role === "admin") return config.max_rounds_admin;
  return config.max_rounds_default;
}

export async function postAssistantChat(payload: {
  messages: AssistantChatTurn[];
  path: string;
  role: AppSession["role"] | null;
  /** π 助学：错题上下文等 */
  context?: string;
}): Promise<AssistantChatResponse> {
  const res = await apiFetch("/api/assistant/chat", {
    method: "POST",
    body: JSON.stringify({
      messages: payload.messages,
      path: payload.path,
      role: payload.role ?? "guest",
      ...(payload.context?.trim() ? { context: payload.context.trim() } : {}),
    }),
  });
  const json = await parseApiJson<AssistantChatResponse>(res);
  if (!res.ok && !json.message) {
    return { ok: false, message: "智能问答请求失败", fallback_rules: res.status === 502 };
  }
  return json;
}
