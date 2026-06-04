import { useEffect } from "react";

import { subscribeWorkspaceAssignmentsChanged } from "@/lib/workspaceAssignmentsSync";

/** 作业管理增删改后，自动刷新本页任务列表 */
export function useWorkspaceAssignmentsSync(refresh: () => void | Promise<void>) {
  useEffect(() => {
    const run = () => {
      void refresh();
    };
    return subscribeWorkspaceAssignmentsChanged(run);
  }, [refresh]);
}
