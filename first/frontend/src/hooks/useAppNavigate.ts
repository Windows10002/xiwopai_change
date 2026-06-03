import { useCallback } from "react";
import { useNavigate, type NavigateOptions } from "react-router-dom";

import { withAuthSlot } from "@/lib/authSlot";

/** 与 react-router navigate 相同，但自动保留 ?slot= */
export function useAppNavigate() {
  const navigate = useNavigate();

  return useCallback(
    (to: string | number, options?: NavigateOptions) => {
      if (typeof to === "number") {
        navigate(to);
        return;
      }
      navigate(withAuthSlot(to), options);
    },
    [navigate],
  );
}
