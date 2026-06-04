/** 毛玻璃面板默认浓淡（0=更透，100=更实） */
export const GLASS_OPACITY_DEFAULT = 60;

export function clampGlassOpacity(value: number): number {
  if (!Number.isFinite(value)) return GLASS_OPACITY_DEFAULT;
  return Math.round(Math.min(100, Math.max(0, value)));
}

/** 将 0–100 偏好值映射为 documentElement 上的 CSS 变量 */
export function glassOpacityToCssVars(opacity: number): Record<string, string> {
  const p = clampGlassOpacity(opacity) / 100;
  /** 0 档更透：白底 alpha 与模糊均压低，避免「最淡仍发白」 */
  const panel = 0.02 + p * 0.86;
  const inner = 0.012 + p * 0.62;
  const tint = 0.018 + p * 0.46;
  const warm = 0.018 + p * 0.46;
  const border = 0.06 + p * 0.5;
  const ring = 0.04 + p * 0.48;
  const blurPx = Math.round(2 + p * 20);
  const scrimBlurPx = Math.round(1 + p * 14);
  const scrim = 0.006 + p * 0.26;
  /** 教师工作台侧栏：略实于内容卡片，保证导航可读 */
  const sidebar = 0.05 + p * 0.9;
  const navHover = 0.12 + p * 0.72;
  const moduleCard = 0.03 + p * 0.78;
  return {
    "--glass-sidebar-alpha": sidebar.toFixed(3),
    "--glass-sidebar-module-alpha": moduleCard.toFixed(3),
    "--glass-nav-hover-alpha": navHover.toFixed(3),
    "--glass-panel-alpha": panel.toFixed(3),
    "--glass-inner-alpha": inner.toFixed(3),
    "--glass-scrim-alpha": scrim.toFixed(3),
    "--glass-scrim-blur": `${scrimBlurPx}px`,
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
