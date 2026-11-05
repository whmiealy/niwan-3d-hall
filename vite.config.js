import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// 构建时写入版本信息（更新时间 + 提交号），页面右下角显示，方便确认手机/电脑看到的是不是最新版
const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'local';
  }
})();
const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });

// base 用相对路径：本地预览和 GitHub Pages（/仓库名/ 子路径）都能直接用
export default defineConfig({
  base: './',
  define: { __BUILD_INFO__: JSON.stringify(`更新于 ${time} · ${commit}`) },
  build: { chunkSizeWarningLimit: 1000 },
});
