import { useMemo } from "react";

import { getUiPersona, type UiPersona } from "@/lib/uiPersona";
import { useAppSession } from "@/hooks/useAppSession";

export function useUiPersona(): UiPersona {
  const session = useAppSession();
  return useMemo(() => getUiPersona(session), [session]);
}

export function useIsStudentUi(): boolean {
  return useUiPersona() === "student";
}
