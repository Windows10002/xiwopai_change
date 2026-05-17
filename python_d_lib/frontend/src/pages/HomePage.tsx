import { useUiPersona } from "@/hooks/useUiPersona";
import { HomePageStudent } from "@/pages/HomePageStudent";
import { HomePageTeacher } from "@/pages/HomePageTeacher";

/** 未登录与教师：简洁教师风；学生登录后：校园青春风 */
export function HomePage() {
  const persona = useUiPersona();
  if (persona === "student") return <HomePageStudent />;
  return <HomePageTeacher />;
}
