import { useEffect, useState } from "react";

import { APP_PREFS_CHANGED, loadUserPreferences, type UserPreferences } from "@/lib/userPreferences";

/** 订阅偏好变更（设置页保存后其它页面自动同步） */
export function useUserPreferences(): UserPreferences {
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadUserPreferences());

  useEffect(() => {
    const sync = () => setPrefs(loadUserPreferences());
    window.addEventListener(APP_PREFS_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(APP_PREFS_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return prefs;
}
