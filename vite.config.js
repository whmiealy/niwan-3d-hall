import { defineConfig } from 'vite';

// base 用相对路径：本地预览和 GitHub Pages（/仓库名/ 子路径）都能直接用
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1000 },
});
