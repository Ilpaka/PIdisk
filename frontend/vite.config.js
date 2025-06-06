import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import postcssPlugin from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      "@tauri-apps/api/dialog",
      "@tauri-apps/api/core",
      "@tauri-apps/api/tauri",
    ],
    exclude: ["some-large-lib"],
  },
  server: {
    watch: {
      ignored: ["!**/node_modules/**"]
    }
  },
  css: {
    postcss: {
      plugins: [
        postcssPlugin(),
        autoprefixer(),
      ],
    },
  },
});
