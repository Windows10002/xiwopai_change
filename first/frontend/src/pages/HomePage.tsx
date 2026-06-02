import { useAppSession } from "@/hooks/useAppSession";
import { HomePageAdmin } from "@/pages/HomePageAdmin";
import { HomePageParent } from "@/pages/HomePageParent";
import { HomePageStudent } from "@/pages/HomePageStudent";
import { HomePageTeacher } from "@/pages/HomePageTeacher";

export function HomePage() {
  const session = useAppSession();
  const role = session?.role ?? "teacher";
  if (role === "student") return <HomePageStudent />;
  if (role === "parent") return <HomePageParent />;
  if (role === "admin") return <HomePageAdmin />;
  return <HomePageTeacher />;
}
