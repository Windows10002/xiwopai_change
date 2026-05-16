import { IpBrandFace } from "@/components/atoms/IpMascot";

type FabHelpProps = {
  onClick?: () => void;
  ariaLabel?: string;
};

/**
 * 右下角帮助：仅展示 IP 形象（无底色素板），保留触控区域与焦点环。
 */
export function FabHelp({ onClick, ariaLabel = "帮助中心" }: FabHelpProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-transparent p-0 shadow-none outline-none transition-transform duration-button ease-smooth hover:scale-[1.06] active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent md:bottom-8 md:right-8"
    >
      <IpBrandFace size="fab" decorative className="scale-110" />
    </button>
  );
}
