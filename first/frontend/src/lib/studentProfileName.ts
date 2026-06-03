import { getAuthSlot, scopedStorageKey } from "@/lib/authSlot";

const PROFILE_NAME_KEY = "seewo_pi_student_profile_name_v1";

function profileNameKey(): string {
  return scopedStorageKey(PROFILE_NAME_KEY);
}

export const STUDENT_PROFILE_CHANGED = "seewo-pi-student-profile-changed";

export function loadStudentProfileName(): string {
  try {
    const key = profileNameKey();
    const fromStore =
      localStorage.getItem(key) || sessionStorage.getItem(key) || "";
    if (fromStore.trim()) return fromStore.trim();
    if (getAuthSlot() === "main") {
      return (
        localStorage.getItem(PROFILE_NAME_KEY) || sessionStorage.getItem(PROFILE_NAME_KEY) || ""
      ).trim();
    }
    return "";
  } catch {
    return "";
  }
}

export function saveStudentProfileName(name: string, remember = true): void {
  const trimmed = name.trim().slice(0, 80);
  const key = profileNameKey();
  const primary = remember ? localStorage : sessionStorage;
  const secondary = remember ? sessionStorage : localStorage;
  if (trimmed) {
    primary.setItem(key, trimmed);
    secondary.removeItem(key);
    if (getAuthSlot() === "main") {
      primary.setItem(PROFILE_NAME_KEY, trimmed);
      secondary.removeItem(PROFILE_NAME_KEY);
    }
  } else {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    if (getAuthSlot() === "main") {
      localStorage.removeItem(PROFILE_NAME_KEY);
      sessionStorage.removeItem(PROFILE_NAME_KEY);
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STUDENT_PROFILE_CHANGED));
  }
}
