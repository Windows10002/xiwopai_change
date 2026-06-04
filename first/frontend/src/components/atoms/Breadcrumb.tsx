import { AppLink } from "@/components/atoms/AppLink";

export type BreadcrumbItem = {
  label: string;
  /** 站内路由（优先于 href） */
  to?: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  contentMaxClassName?: string;
  /** default：独立条带；embedded：嵌入卡片内，无额外底边与背景 */
  variant?: "default" | "embedded";
};

/**
 * 轻量面包屑：末段随步骤更新时有轻微过渡动画。
 */
export function Breadcrumb({ items, contentMaxClassName = "max-w-6xl", variant = "default" }: BreadcrumbProps) {
  const lastIdx = items.length - 1;
  const embedded = variant === "embedded";

  return (
    <nav
      aria-label="breadcrumb"
      className={
        embedded ? "bg-transparent" : "border-b border-black/[0.06] bg-white/55 backdrop-blur-md"
      }
    >
      <div className={embedded ? `mx-0 px-0 py-0 ${contentMaxClassName}` : `mx-auto px-4 py-2 md:px-6 ${contentMaxClassName}`}>
        <ol
          className={
            embedded
              ? "flex flex-wrap items-center gap-x-1 gap-y-0.5 text-small text-ink-muted"
              : "flex flex-wrap items-center gap-x-1 gap-y-0.5 text-caption text-ink-muted"
          }
        >
          {items.map((item, index) => {
            const isLast = index === lastIdx;
            const touch = embedded ? "min-h-8 py-1" : "min-h-9 py-1.5";
            const inner =
              item.to ? (
                <AppLink
                  to={item.to}
                  title={item.label === "首页" ? "返回应用首页" : undefined}
                  className={`-mx-1 inline-flex items-center rounded-lg px-2 ${touch} font-semibold text-brand transition-colors duration-button ease-smooth hover:bg-primary-tint/80 hover:text-brand-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent`}
                >
                  {item.label}
                </AppLink>
              ) : item.href ? (
                <AppLink
                  to={item.href}
                  className={`-mx-1 inline-flex items-center rounded-lg px-2 ${touch} font-semibold text-brand transition-colors duration-button ease-smooth hover:bg-primary-tint/80 hover:text-brand-hover hover:underline`}
                >
                  {item.label}
                </AppLink>
              ) : (
                <span className={`inline-flex items-center px-1 ${touch} font-semibold text-ink`}>{item.label}</span>
              );

            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-1">
                {index > 0 && (
                  <span className="select-none text-ink-subtle" aria-hidden="true">
                    /
                  </span>
                )}
                {isLast ? (
                  <span key={item.label} className="animate-breadcrumb-swap inline-block">
                    {inner}
                  </span>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
