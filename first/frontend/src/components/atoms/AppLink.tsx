import { useNavigate, type To } from "react-router-dom";
import type { ComponentPropsWithoutRef, KeyboardEvent, MouseEvent } from "react";

import { withAuthSlot } from "@/lib/authSlot";

type AppLinkProps = Omit<ComponentPropsWithoutRef<"span">, "role"> & {
  to: To;
  state?: unknown;
  replace?: boolean;
};

function resolveTo(to: To): To {
  if (typeof to === "string") return withAuthSlot(to);
  if (typeof to === "object" && to !== null && "pathname" in to && typeof to.pathname === "string") {
    return { ...to, pathname: withAuthSlot(to.pathname) };
  }
  return to;
}

/**
 * 站内导航：用 programmatic navigate，避免浏览器左下角悬停显示带 ?slot= 的完整 URL。
 */
export function AppLink({ to, onClick, onKeyDown, state, replace, ...rest }: AppLinkProps) {
  const navigate = useNavigate();
  const target = resolveTo(to);

  const go = (e: MouseEvent<HTMLSpanElement> | KeyboardEvent<HTMLSpanElement>) => {
    onClick?.(e as MouseEvent<HTMLSpanElement>);
    if (e.defaultPrevented) return;
    void navigate(target, { state, replace });
  };

  return (
    <span
      role="link"
      tabIndex={0}
      {...rest}
      onClick={go}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go(e);
        }
      }}
    />
  );
}
