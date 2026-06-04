import { useCallback, useEffect, useState } from "react";

import { loadAuthToken } from "@/lib/apiClient";
import { GRADING_HISTORY_CHANGED } from "@/lib/gradingHistory";
import { loadStudentPendingCounts, type StudentPendingCounts } from "@/lib/studentPendingCounts";
import { WORKSPACE_ASSIGNMENTS_CHANGED } from "@/lib/workspaceAssignmentsSync";
import { WRONG_BOOK_CHANGED } from "@/lib/wrongQuestionBook";

const EMPTY: StudentPendingCounts = {
  todoCount: 0,
  pendingReleaseCount: 0,
  variantsPendingCount: 0,
  wrongBookCount: 0,
  actionTotal: 0,
};

/** 学生首页/顶栏待办数字，支持 focus 与作业变更刷新 */
export function useStudentPendingCounts(enabled = true) {
  const [counts, setCounts] = useState<StudentPendingCounts>(EMPTY);

  const refresh = useCallback(async () => {
    if (!enabled || !loadAuthToken()) {
      setCounts(EMPTY);
      return;
    }
    try {
      setCounts(await loadStudentPendingCounts());
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
    const onHist = () => void refresh();
    const onWrong = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener(WORKSPACE_ASSIGNMENTS_CHANGED, onWs);
    window.addEventListener(GRADING_HISTORY_CHANGED, onHist);
    window.addEventListener(WRONG_BOOK_CHANGED, onWrong);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(WORKSPACE_ASSIGNMENTS_CHANGED, onWs);
      window.removeEventListener(GRADING_HISTORY_CHANGED, onHist);
      window.removeEventListener(WRONG_BOOK_CHANGED, onWrong);
    };
  }, [enabled, refresh]);

  return { counts, refresh };
}
