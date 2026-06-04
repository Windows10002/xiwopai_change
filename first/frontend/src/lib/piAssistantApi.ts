import { apiFetch, parseApiJson, type ApiJson } from "@/lib/apiClient";
import type { AppSession } from "@/lib/appSession";

export type ProductFeedbackCategory = "bug" | "idea" | "question";

export async function submitProductFeedback(payload: {
  category: ProductFeedbackCategory;
  message: string;
  contact?: string;
  path: string;
  role: AppSession["role"] | null;
}): Promise<void> {
  const res = await apiFetch("/api/product-feedback", {
    method: "POST",
    body: JSON.stringify({
      category: payload.category,
      message: payload.message,
      contact: payload.contact?.trim() || undefined,
      path: payload.path,
      role: payload.role ?? "guest",
      client_version: import.meta.env.VITE_APP_VERSION ?? "0.0.1",
    }),
  });
  const json = await parseApiJson<ApiJson>(res);
  if (!json.ok) throw new Error(json.message || "提交失败");
}
