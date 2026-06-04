import { Navigate, useLocation } from "react-router-dom";

import { loadSession } from "@/lib/appSession";
import { myWorkPath } from "@/lib/studentRoutes";

/** 旧路径兼容：学生/家长 → 我的作业；教师/教务 → 学情中心学生 Tab */
export function StudentAnalyticsPage() {
  const location = useLocation();
  const session = loadSession();
  if (session?.role === "student" || session?.role === "parent") {
    return <Navigate to={myWorkPath()} replace />;
  }
  return <Navigate to={`/class-analytics?tab=student${location.hash}`} replace />;
}
