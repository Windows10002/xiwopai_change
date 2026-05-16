import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { EnglishGradingPage } from "@/pages/EnglishGradingPage";
import { MathGradingPage } from "@/pages/MathGradingPage";
import { LoginPage } from "@/pages/LoginPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { APP_PREFS_CHANGED, loadUserPreferences, syncUserPreferencesToDom } from "@/lib/userPreferences";

export default function App() {
  const location = useLocation();

  useEffect(() => {
    const apply = () => syncUserPreferencesToDom(loadUserPreferences());
    apply();
    window.addEventListener(APP_PREFS_CHANGED, apply);
    return () => window.removeEventListener(APP_PREFS_CHANGED, apply);
  }, []);

  return (
    <div key={location.pathname} className="animate-page-fade min-h-screen">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/english" element={<EnglishGradingPage />} />
        <Route path="/math" element={<MathGradingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </div>
  );
}
