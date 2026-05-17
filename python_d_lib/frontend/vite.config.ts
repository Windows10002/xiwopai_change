import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ["docx", "exceljs"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/docx")) return "docx-vendor";
          if (id.includes("node_modules/exceljs")) return "exceljs-vendor";
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
  server: {
    proxy: {
      /* 与 app.py 默认 PORT=5005 一致；若用 PORT=5001 启动后端请改此处 */
      "/api": { target: "http://127.0.0.1:5005", changeOrigin: true },
      "/uploads": { target: "http://127.0.0.1:5005", changeOrigin: true },
    },
  },
});
