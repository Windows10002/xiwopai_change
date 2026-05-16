import { useEffect, useState } from "react";

import { APP_SESSION_CHANGED, loadSession, type AppSession } from "@/lib/appSession";

/** 订阅本地演示会话，登录/退出后自动更新 */
export function useAppSession(): AppSession | null {
  const [session, setSession] = useState<AppSession | null>(() => loadSession());

  useEffect(() => {
    const sync = () => setSession(loadSession());
    window.addEventListener(APP_SESSION_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(APP_SESSION_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return session;
}
