/**
 * 设计规范（颜色 / 字体 / 圆角 / 动效）
 * —— 页面视觉单源配置，组件内请优先使用下列语义 token，少用裸十六进制。
 */
const palette = {
  /** 主色 · 品牌绿（步骤条、强调、主按钮描边等） */
  primary: "#52C41A",
  primaryHover: "#389e0d",
  /** 导航激活浅底、成功氛围 */
  primaryLight: "#E8F5E9",
  /** 上传区、预览容器浅绿底 */
  primaryTint: "#F6FFED",
  primaryMuted: "rgba(82, 196, 26, 0.12)",
  primaryRing: "rgba(82, 196, 26, 0.35)",

  /** 登录主按钮 · 薄荷绿（实心） */
  accentMint: "#8FD9C1",
  accentMintHover: "#6fc9a8",

  /** 强操作按钮（如「开始批改」） */
  accentBlue: "#597EF7",
  accentBlueHover: "#4368e8",

  /** 正文 / 导航激活字色 */
  ink: "#1F2937",
  inkNavActive: "#006D41",

  surfacePage: "#F5F7FA",
  surfaceCard: "#FFFFFF",

  /** 「演示」角标 · 品牌绿底白字 */
  badgeDemoBg: "#52C41A",
  badgeDemoFg: "#FFFFFF",
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /** @deprecated 组件逐步迁移至 primary / ink / accent；暂保留以兼容现有 class */
        brand: {
          DEFAULT: palette.primary,
          hover: palette.primaryHover,
          muted: palette.primaryMuted,
          ring: palette.primaryRing,
        },
        primary: {
          DEFAULT: palette.primary,
          hover: palette.primaryHover,
          light: palette.primaryLight,
          tint: palette.primaryTint,
          muted: palette.primaryMuted,
          ring: palette.primaryRing,
        },
        accent: {
          mint: palette.accentMint,
          "mint-hover": palette.accentMintHover,
          blue: palette.accentBlue,
          "blue-hover": palette.accentBlueHover,
        },
        ink: {
          DEFAULT: palette.ink,
          navActive: palette.inkNavActive,
          /** 辅助说明（略浅于 gray-500） */
          muted: "#94A3B8",
          /** 次级辅助 */
          subtle: "#B0B8C4",
        },
        surface: {
          page: palette.surfacePage,
          card: palette.surfaceCard,
        },
        badge: {
          demo: {
            bg: palette.badgeDemoBg,
            fg: palette.badgeDemoFg,
          },
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          '"Noto Sans SC"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        /** Small / Body 量级（约 14px / 16px），正文行高 1.6 */
        body: ["1rem", { lineHeight: "1.6" }],
        small: ["0.875rem", { lineHeight: "1.52" }],
        caption: ["0.75rem", { lineHeight: "1.45" }],
      },
      borderRadius: {
        card: "12px",
        tile: "10px",
      },
      boxShadow: {
        nav: "0 2px 8px rgba(15, 45, 35, 0.06)",
        card: "0 2px 12px rgba(15, 45, 35, 0.06)",
        fab: "0 6px 18px rgba(82, 196, 26, 0.35)",
      },
      transitionDuration: {
        /** 悬停略加长：导航下划线、卡片上浮等 */
        hover: "380ms",
        /** 按钮等控件 hover */
        button: "200ms",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
