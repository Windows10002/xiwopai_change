const STORAGE_KEY = "seewo_pi_parent_answer_lock_v1";

/** 默认开启：家长需主动解锁后才显示参考答案 */
export function loadParentAnswerLock(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function saveParentAnswerLock(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}
