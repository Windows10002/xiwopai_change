import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getAuthSlot, initAuthSlotFromUrl, withAuthSlot } from "@/lib/authSlot";

/**
 * 路由变化时从 URL 恢复 slot，并把非 main 的 slot 写回地址栏（便于新标签打开、刷新不丢槽）。
 */
export function AuthSlotRouterSync() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    initAuthSlotFromUrl(location.pathname, location.search);

    const slot = getAuthSlot();
    if (slot === "main") return;

    const params = new URLSearchParams(location.search);
    if (params.get("slot") === slot) return;

    const target = withAuthSlot(`${location.pathname}${location.search}${location.hash}`);
    navigate(target, { replace: true });
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
}
