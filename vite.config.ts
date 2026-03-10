/**
 * Vite 配置
 * @author caiguoyu
 * @date 2026/3/10
 * 开发模式下将 /api 代理到 Express 服务器（端口 7091）
 * 构建产物输出到 dist/public，由 Express 在生产模式下静态托管
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
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:7091',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@client': path.resolve(__dirname, 'src/client'),
    },
  },
});
