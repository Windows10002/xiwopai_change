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
      /* 与 app.py 默认端口一致（当前 50003） */
      "/api": { target: "http://127.0.0.1:50003", changeOrigin: true },
      "/uploads": { target: "http://127.0.0.1:50003", changeOrigin: true },
    },
  },
});
