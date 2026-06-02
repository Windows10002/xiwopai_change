import { useAppSession } from "@/hooks/useAppSession";

/** 学生端校园风 UI（批改页装饰、错题本入口等） */
export function useIsStudentUi(): boolean {
  const session = useAppSession();
  return session?.role === "student";
}
