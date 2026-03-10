/**
 * Vite 配置
 * @author caiguoyu
 * @date 2026/3/10
 * 开发模式：Vite 以 middleware 模式嵌入 Express，无需独立端口与代理
 * 生产构建产物输出到 dist/public，由 Express 静态托管
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/public',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@client': path.resolve(__dirname, 'src/client'),
    },
  },
});
