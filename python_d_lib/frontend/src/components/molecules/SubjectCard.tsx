import { ChevronRight } from "lucide-react";

import { Link } from "react-router-dom";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { IpBrandFace } from "@/components/atoms/IpMascot";

export type SubjectCardProps = {
  title: string;
  description: string;
  to: string;
};



/**

 * 首页学科入口卡片：可复用 + Hover 上浮（过渡时长走 theme duration-hover）

 */

export function SubjectCard({ title, description, to }: SubjectCardProps) {

  return (

    <Link

      to={to}

      className="group relative flex gap-4 rounded-card border border-black/[0.08] border-l-[5px] border-l-primary bg-surface-card p-5 pl-[1.15rem] shadow-card transition-all duration-hover ease-smooth hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_10px_32px_rgba(82,196,26,0.14)] active:translate-y-0 active:shadow-card md:p-6 md:pl-7"

    >

      <span className="flex h-12 w-12 shrink-0 items-center justify-center md:h-14 md:w-14">
        <IpBrandFace size="sm" />
      </span>

      <span className="min-w-0 flex-1">

        <span className="flex items-start justify-between gap-2">

          <span className="text-body font-bold text-ink">{title}</span>

          <ChevronRight

            {...CUTE_ICON}

            className="mt-0.5 h-5 w-5 shrink-0 text-ink-subtle transition-all duration-button ease-smooth group-hover:translate-x-0.5 group-hover:text-primary"

            aria-hidden

          />

        </span>

        <span className="mt-1 block text-small leading-snug text-ink-muted">{description}</span>

      </span>

    </Link>

  );

}

