const PROFILE_NAME_KEY = "seewo_pi_student_profile_name_v1";

export const STUDENT_PROFILE_CHANGED = "seewo-pi-student-profile-changed";

export function loadStudentProfileName(): string {
  try {
    return (localStorage.getItem(PROFILE_NAME_KEY) || sessionStorage.getItem(PROFILE_NAME_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function saveStudentProfileName(name: string, remember = true): void {
  const trimmed = name.trim().slice(0, 80);
  const primary = remember ? localStorage : sessionStorage;
  const secondary = remember ? sessionStorage : localStorage;
  if (trimmed) {
    primary.setItem(PROFILE_NAME_KEY, trimmed);
    secondary.removeItem(PROFILE_NAME_KEY);
  } else {
    localStorage.removeItem(PROFILE_NAME_KEY);
    sessionStorage.removeItem(PROFILE_NAME_KEY);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STUDENT_PROFILE_CHANGED));
  }
}
