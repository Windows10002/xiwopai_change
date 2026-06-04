import { useCallback, useEffect, useState } from "react";

import { loadAuthToken } from "@/lib/apiClient";
import { loadTeacherPendingCounts, type TeacherPendingCounts } from "@/lib/teacherPendingCounts";
import { WORKSPACE_ASSIGNMENTS_CHANGED } from "@/lib/workspaceAssignmentsSync";

const EMPTY: TeacherPendingCounts = {
  inboxTotal: 0,
  pendingReview: 0,
  correctionsPending: 0,
  unpublishedGraded: 0,
  studentDisputes: 0,
};

/** 教师首页/顶栏待办数字，支持 focus 与作业变更刷新 */
export function useTeacherPendingCounts(enabled = true) {
  const [counts, setCounts] = useState<TeacherPendingCounts>(EMPTY);

  const refresh = useCallback(async () => {
    if (!enabled || !loadAuthToken()) {
      setCounts(EMPTY);
      return;
    }
    try {
      setCounts(await loadTeacherPendingCounts());
    } catch {
      setCounts(EMPTY);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => void refresh();
    const onWs = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener(WORKSPACE_ASSIGNMENTS_CHANGED, onWs);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(WORKSPACE_ASSIGNMENTS_CHANGED, onWs);
    };
  }, [enabled, refresh]);

  return { counts, refresh };
}
