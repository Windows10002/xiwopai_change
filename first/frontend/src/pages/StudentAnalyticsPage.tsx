import { Navigate, useLocation } from "react-router-dom";

/** 学生学情已并入班级看板，保留旧路径重定向 */
export function StudentAnalyticsPage() {
  const location = useLocation();
  return <Navigate to={`/class-analytics?tab=student${location.hash}`} replace />;
}
