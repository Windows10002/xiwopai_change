import { apiFetch } from "@/lib/apiClient";

/** 带登录态拉取 /uploads 等资源，返回可用于 img 的 blob URL */
export async function fetchAuthenticatedBlobUrl(resourceUrl: string): Promise<string> {
  const path = resourceUrl.startsWith("http") ? resourceUrl : resourceUrl.startsWith("/") ? resourceUrl : `/${resourceUrl}`;
  const res = await apiFetch(path);
  if (!res.ok) {
    throw new Error(`资源加载失败（HTTP ${res.status}）`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
