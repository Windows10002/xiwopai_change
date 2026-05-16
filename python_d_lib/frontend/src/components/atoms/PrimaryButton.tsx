import type { ButtonHTMLAttributes } from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** 使用薄荷绿变体（少用；主流程默认品牌绿） */
  variant?: "brand" | "mint";
};

/**
 * 主按钮：默认 / hover 上浮变深 / active 下沉 / disabled 灰色不可点。
 */
export function PrimaryButton({
  variant = "brand",
  className = "",
  type = "button",
  ...rest
}: PrimaryButtonProps) {
  const base = variant === "mint" ? "btn-accent-mint-solid" : "btn-brand-primary";
  return <button type={type} className={[base, className].filter(Boolean).join(" ")} {...rest} />;
}
