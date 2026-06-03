import { Link, type LinkProps } from "react-router-dom";

import { withAuthSlot } from "@/lib/authSlot";

/** 站内 Link，自动附带当前标签的 ?slot= */
export function AppLink({ to, ...rest }: LinkProps) {
  const resolved = typeof to === "string" ? withAuthSlot(to) : to;
  return <Link to={resolved} {...rest} />;
}
