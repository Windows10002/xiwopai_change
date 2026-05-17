/** 毛玻璃面板默认浓淡（0=更透，100=更实） */
export const GLASS_OPACITY_DEFAULT = 60;

export function clampGlassOpacity(value: number): number {
  if (!Number.isFinite(value)) return GLASS_OPACITY_DEFAULT;
  return Math.round(Math.min(100, Math.max(0, value)));
}

/** 将 0–100 偏好值映射为 documentElement 上的 CSS 变量 */
export function glassOpacityToCssVars(opacity: number): Record<string, string> {
  const p = clampGlassOpacity(opacity) / 100;
  const panel = 0.1 + p * 0.82;
  const inner = 0.06 + p * 0.64;
  const tint = 0.05 + p * 0.48;
  const warm = 0.05 + p * 0.48;
  const border = 0.22 + p * 0.48;
  const ring = 0.12 + p * 0.52;
  const blurPx = Math.round(6 + p * 18);
  return {
    "--glass-panel-alpha": panel.toFixed(3),
    "--glass-inner-alpha": inner.toFixed(3),
    "--glass-tint-alpha": tint.toFixed(3),
    "--glass-tint-warm-alpha": warm.toFixed(3),
    "--glass-border-alpha": border.toFixed(3),
    "--glass-ring-alpha": ring.toFixed(3),
    "--glass-blur": `${blurPx}px`,
  };
}

export function applyGlassThemeToDom(opacity: number): void {
  if (typeof document === "undefined") return;
  const vars = glassOpacityToCssVars(opacity);
  const root = document.documentElement;
  for (const [key, val] of Object.entries(vars)) {
    root.style.setProperty(key, val);
  }
  root.dataset.glassOpacity = String(clampGlassOpacity(opacity));
}
