import { Camera } from "lucide-react";
import { Link } from "react-router-dom";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";

type FabQuickGradeProps = {
  to?: string;
};

/** 右下角快速批改入口 */
export function FabQuickGrade({ to = "/math" }: FabQuickGradeProps) {
  return (
    <Link
      to={to}
      aria-label="快速批改"
      title="快速批改：上传作业照片"
      className="fixed bottom-6 right-6 z-50 inline-flex h-14 items-center gap-2 rounded-full bg-brand px-5 text-small font-bold text-white shadow-fab outline-none transition-all duration-button ease-smooth hover:-translate-y-0.5 hover:bg-brand-hover hover:shadow-[0_12px_32px_rgba(82,196,26,0.42)] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 md:bottom-8 md:right-8 md:h-[3.25rem] md:px-6"
    >
      <Camera className="h-5 w-5 shrink-0" {...CUTE_ICON} aria-hidden />
      <span className="hidden sm:inline">快速批改</span>
    </Link>
  );
}
