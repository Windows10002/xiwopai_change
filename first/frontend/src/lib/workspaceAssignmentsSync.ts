/** 作业/考试列表变更：同标签事件 + 跨标签 BroadcastChannel，供各端列表刷新 */
export const WORKSPACE_ASSIGNMENTS_CHANGED = "workspace-assignments-changed";

const BROADCAST_CHANNEL = "seewo-pi-workspace-assignments-v1";

let broadcast: BroadcastChannel | null = null;

function getBroadcast(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!broadcast) broadcast = new BroadcastChannel(BROADCAST_CHANNEL);
  return broadcast;
}

export function emitWorkspaceAssignmentsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WORKSPACE_ASSIGNMENTS_CHANGED));
  try {
    getBroadcast()?.postMessage({ t: Date.now() });
  } catch {
    /* ignore */
  }
}

/** 订阅作业列表变更（含其它浏览器标签页的教师端操作） */
export function subscribeWorkspaceAssignmentsChanged(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = () => onChange();
  window.addEventListener(WORKSPACE_ASSIGNMENTS_CHANGED, handler);

  const ch = getBroadcast();
  const onMessage = () => onChange();
  ch?.addEventListener("message", onMessage);

  const onFocus = () => onChange();
  window.addEventListener("focus", onFocus);

  return () => {
    window.removeEventListener(WORKSPACE_ASSIGNMENTS_CHANGED, handler);
    ch?.removeEventListener("message", onMessage);
    window.removeEventListener("focus", onFocus);
  };
}
