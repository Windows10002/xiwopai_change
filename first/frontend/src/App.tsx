import { lazy, Suspense, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { EnglishGradingPage } from "@/pages/EnglishGradingPage";
import { MathGradingPage } from "@/pages/MathGradingPage";
import { LoginPage } from "@/pages/LoginPage";
import { ProtectedRoleRoute } from "@/components/organisms/ProtectedRoleRoute";
import { RequireLoginRoute } from "@/components/organisms/RequireLoginRoute";
import { APP_PREFS_CHANGED, loadUserPreferences, saveUserPreferences, syncUserPreferencesToDom } from "@/lib/userPreferences";

const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const WrongBookPage = lazy(() => import("@/pages/WrongBookPage").then((m) => ({ default: m.WrongBookPage })));
const StudentAnalyticsPage = lazy(() =>
  import("@/pages/StudentAnalyticsPage").then((m) => ({ default: m.StudentAnalyticsPage })),
);
const ClassAnalyticsPage = lazy(() =>
  import("@/pages/ClassAnalyticsPage").then((m) => ({ default: m.ClassAnalyticsPage })),
);
const FeedbackDashboardPage = lazy(() =>
  import("@/pages/FeedbackDashboardPage").then((m) => ({ default: m.FeedbackDashboardPage })),
);
const MyWorkPage = lazy(() => import("@/pages/MyWorkPage").then((m) => ({ default: m.MyWorkPage })));
const TodoPage = lazy(() => import("@/pages/TodoPage").then((m) => ({ default: m.TodoPage })));
const WorkspacePage = lazy(() => import("@/pages/WorkspacePage").then((m) => ({ default: m.WorkspacePage })));

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-small text-ink-muted" role="status">
      加载中…
    </div>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

export default function App() {
  useEffect(() => {
    const apply = () => syncUserPreferencesToDom(loadUserPreferences());
    apply();
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const p = loadUserPreferences();
      if (!p.reduceMotion) saveUserPreferences({ reduceMotion: true });
    }
    window.addEventListener(APP_PREFS_CHANGED, apply);
    return () => window.removeEventListener(APP_PREFS_CHANGED, apply);
  }, []);

  return (
    <div className="animate-page-fade flex min-h-dvh min-h-screen flex-1 flex-col">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/english" element={<EnglishGradingPage />} />
        <Route path="/math" element={<MathGradingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/settings"
          element={
            <Lazy>
              <RequireLoginRoute loginRedirect="/settings">
                <SettingsPage />
              </RequireLoginRoute>
            </Lazy>
          }
        />
        <Route
          path="/wrong-book"
          element={
            <Lazy>
              <ProtectedRoleRoute anyOf={["wrong_book"]}>
                <WrongBookPage />
              </ProtectedRoleRoute>
            </Lazy>
          }
        />
        <Route
          path="/student-analytics"
          element={
            <Lazy>
              <ProtectedRoleRoute anyOf={["analytics.student", "analytics.class"]} loginRedirect="/student-analytics">
                <StudentAnalyticsPage />
              </ProtectedRoleRoute>
            </Lazy>
          }
        />
        <Route
          path="/class-analytics"
          element={
            <Lazy>
              <ProtectedRoleRoute anyOf={["analytics.class", "analytics.student"]}>
                <ClassAnalyticsPage />
              </ProtectedRoleRoute>
            </Lazy>
          }
        />
        <Route
          path="/feedback-dashboard"
          element={
            <Lazy>
              <ProtectedRoleRoute anyOf={["feedback.dashboard"]}>
                <FeedbackDashboardPage />
              </ProtectedRoleRoute>
            </Lazy>
          }
        />
        <Route
          path="/my-work"
          element={
            <Lazy>
              <ProtectedRoleRoute anyOf={["workspace.view_own"]}>
                <MyWorkPage />
              </ProtectedRoleRoute>
            </Lazy>
          }
        />
        <Route
          path="/todo"
          element={
            <Lazy>
              <ProtectedRoleRoute anyOf={["workspace.view_own", "workspace.submit"]}>
                <TodoPage />
              </ProtectedRoleRoute>
            </Lazy>
          }
        />
        <Route
          path="/workspace"
          element={
            <Lazy>
              <ProtectedRoleRoute anyOf={["workspace.manage"]}>
                <WorkspacePage />
              </ProtectedRoleRoute>
            </Lazy>
          }
        />
      </Routes>
    </div>
  );
}
