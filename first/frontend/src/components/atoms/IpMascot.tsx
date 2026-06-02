import type { ReactNode, SVGProps } from "react";
import { useId } from "react";

import { IP_BRAND_IMAGE } from "@/assets/ip";

/**
 * 希沃智教 π IP：统一使用品牌位图（经 Vite 打包到 /assets/...，Flask 仅托管 /assets 时也能加载）。
 */

const IP_BRAND_SRC = IP_BRAND_IMAGE;

type IpFaceBox = { x: number; y: number; w: number; h: number; rx: number };

/** 略放大位图再裁剪，吃掉 PNG 外圈杂边（资源本身已为 RGBA 透明底）。 */
function IpFaceBitmap({
  prefix,
  face,
  bleed = 0.09,
}: {
  prefix: string;
  face: IpFaceBox;
  /** 相对脸框各向多铺的比例，略大于 0 可裁掉一圈白边 */
  bleed?: number;
}) {
  const clipId = `${prefix}-fclip`;
  const { x, y, w, h, rx } = face;
  const ix = x - w * bleed;
  const iy = y - h * bleed;
  const iw = w * (1 + 2 * bleed);
  const ih = h * (1 + 2 * bleed);
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={w} height={h} rx={rx} />
        </clipPath>
      </defs>
      <image
        href={IP_BRAND_SRC}
        xlinkHref={IP_BRAND_SRC}
        x={ix}
        y={iy}
        width={iw}
        height={ih}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clipId})`}
      />
    </>
  );
}

function MascotShell({
  className = "",
  children,
  viewBox = "0 0 120 120",
  face,
  ...props
}: Omit<SVGProps<SVGSVGElement>, "children"> & { children?: ReactNode; face: IpFaceBox }) {
  const gid = useId().replace(/:/g, "");
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      aria-hidden
      className={className}
      {...props}
    >
      <IpFaceBitmap prefix={gid} face={face} />
      {children}
    </svg>
  );
}

/**
 * 品牌主 IP：官方位图（首页 / 学科卡片 / 导航 / FAB）。
 */
export function IpBrandFace({
  className = "",
  size = "hero",
  decorative = false,
}: {
  className?: string;
  size?: "hero" | "md" | "sm" | "fab";
  decorative?: boolean;
}) {
  const gid = useId().replace(/:/g, "");
  const dim =
    size === "hero"
      ? "h-36 w-36 sm:h-40 sm:w-40 md:h-44 md:w-44"
      : size === "md"
        ? "h-[2.65rem] w-[2.65rem] sm:h-11 sm:w-11"
        : size === "fab"
          ? "h-9 w-9"
          : "h-9 w-9 md:h-10 md:w-10";

  const shadow =
    size === "hero"
      ? "drop-shadow-[0_16px_40px_rgba(22,101,52,0.22)]"
      : size === "fab"
        ? "drop-shadow-[0_8px_22px_rgba(22,101,52,0.28)]"
        : "drop-shadow-[0_2px_8px_rgba(22,101,52,0.16)]";

  const face: IpFaceBox = { x: 8, y: 8, w: 112, h: 112, rx: 40 };

  return (
    <svg
      className={`shrink-0 ${shadow} ${dim} ${className}`}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "希沃智教π"}
      aria-hidden={decorative ? true : undefined}
    >
      <IpFaceBitmap prefix={gid} face={face} />
    </svg>
  );
}

/** 加载：外圈旋转 */
export function IpMascotLoading({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex h-[4.75rem] w-[4.75rem] items-center justify-center ${className}`}>
      <div
        className="absolute inset-0 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary"
        aria-hidden
      />
      <MascotShell className="relative z-10 h-[3.35rem] w-[3.35rem] drop-shadow-md" face={{ x: 22, y: 36, w: 76, h: 68, rx: 24 }} />
    </div>
  );
}

/** 批改成功：举奖杯 */
export function IpMascotTrophy({ className = "" }: { className?: string }) {
  return (
    <MascotShell className={`h-16 w-16 shrink-0 drop-shadow-sm ${className}`} face={{ x: 28, y: 48, w: 64, h: 58, rx: 22 }}>
      <path
        d="M52 18h16v6H52V18zm-6 6h28v4c0 8-6 14-14 14S46 36 46 28v-4zm8 24v8h12v-8"
        fill="#fde68a"
        stroke="#f59e0b"
        strokeWidth="1.2"
      />
      <rect x="54" y="42" width="12" height="4" rx="1.5" fill="#fbbf24" />
    </MascotShell>
  );
}

/** 有错题：挠头 */
export function IpMascotScratchHead({ className = "" }: { className?: string }) {
  return (
    <MascotShell className={`h-16 w-16 shrink-0 drop-shadow-sm ${className}`} face={{ x: 28, y: 48, w: 64, h: 58, rx: 22 }}>
      <path
        d="M88 52c8-4 14 2 10 10-2 5-8 8-14 6"
        stroke="#166534"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="96" cy="48" r="5" fill="#86efac" stroke="#166534" strokeWidth="1.25" />
    </MascotShell>
  );
}

/** 空状态：指向一侧（上传区等） */
export function IpMascotPointGuide({ className = "h-16 w-16 shrink-0" }: { className?: string }) {
  return (
    <MascotShell className={`drop-shadow-sm ${className}`} face={{ x: 22, y: 44, w: 70, h: 62, rx: 24 }}>
      <path
        d="M92 58l14-6v12l-14-6z"
        fill="white"
        stroke="#16a34a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </MascotShell>
  );
}

/** 登录欢迎：挥手 */
export function IpMascotWaveWelcome({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "hero";
}) {
  const size =
    variant === "hero"
      ? "h-40 w-40 drop-shadow-2xl md:h-52 md:w-52"
      : "h-28 w-28 drop-shadow-md";
  return (
    <MascotShell className={`mx-auto ${size} ${className}`} face={{ x: 18, y: 38, w: 76, h: 68, rx: 24 }}>
      <g className="animate-mascot-wave-arm">
        <path
          d="M22 62c-10-6-10-18 4-20 6 0 10 4 12 10"
          stroke="#166534"
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="14" cy="56" r="6" fill="#86efac" stroke="#166534" strokeWidth="1.25" />
      </g>
    </MascotShell>
  );
}

/** 批改结果空：放大镜 */
export function IpMascotMagnifierEmpty({ className = "" }: { className?: string }) {
  return (
    <MascotShell className={`mx-auto h-24 w-24 drop-shadow-sm ${className}`} face={{ x: 22, y: 46, w: 68, h: 60, rx: 22 }}>
      <circle cx="86" cy="34" r="14" fill="none" stroke="white" strokeWidth="3.5" opacity={0.95} />
      <path d="M96 44l12 12" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
    </MascotShell>
  );
}

/** 预览区空：相机 */
export function IpMascotCameraEmpty({ className = "" }: { className?: string }) {
  return (
    <MascotShell className={`mx-auto h-24 w-24 drop-shadow-sm ${className}`} face={{ x: 22, y: 46, w: 68, h: 60, rx: 22 }}>
      <rect x="34" y="22" width="52" height="36" rx="9" fill="#475569" stroke="#334155" strokeWidth="1.8" />
      <circle cx="60" cy="40" r="12" fill="#1e293b" stroke="#64748b" strokeWidth="1.8" />
      <circle cx="60" cy="40" r="6" fill="#38bdf8" opacity={0.55} />
      <rect x="72" y="26" width="10" height="6" rx="1.5" fill="#94a3b8" />
    </MascotShell>
  );
}

/** 无薄弱知识点：比耶 */
export function IpMascotPeaceGreat({ className = "" }: { className?: string }) {
  return (
    <MascotShell className={`mx-auto h-20 w-20 drop-shadow-sm ${className}`} face={{ x: 24, y: 48, w: 72, h: 58, rx: 22 }}>
      <path
        d="M22 38l-6-14M16 24l10 6M28 24l-8 8"
        stroke="#fde047"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M14 50h12l-4 18h-6l-2-18z" fill="#fef9c3" stroke="#eab308" strokeWidth="1.25" />
      <path d="M18 24h8v10h-8z" fill="#fef9c3" stroke="#eab308" strokeWidth="1.25" />
    </MascotShell>
  );
}
