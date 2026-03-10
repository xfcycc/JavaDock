/**
 * JavaDock 服务端入口
 * @author caiguoyu
 * @date 2026/3/10
 * 单进程：同时托管 REST API 与前端静态资源
 * 端口：7091（可通过环境变量 PORT 覆盖）
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { settingsRoutes } from './settings/routes';
import { dockerRoutes } from './docker/routes';
import { javaRoutes } from './java/routes';
import { scriptsRoutes } from './scripts/routes';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 7091;
const IS_DEV = process.env.NODE_ENV !== 'production';

// ─── 中间件 ────────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── API 路由 ──────────────────────────────────────────────────────────────────
app.use('/api/settings', settingsRoutes);
app.use('/api/docker', dockerRoutes);
app.use('/api/java', javaRoutes);
app.use('/api/scripts', scriptsRoutes);

// ─── 生产模式托管前端静态文件 ────────────────────────────────────────────────────
if (!IS_DEV) {
  // dist 目录结构：dist/server/index.js, dist/public/...
  // 所以 __dirname = dist/server，public = dist/public = ../public
  const staticPath = path.join(__dirname, '../public');
  app.use(express.static(staticPath));
  // SPA fallback：所有非 API 路由都返回 index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(staticPath, 'index.html'));
    }
  });
}

// ─── 启动 ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ⚓  JavaDock 已启动`);
  console.log(`  →  http://localhost:${PORT}`);
  if (!IS_DEV) {
    console.log(`\n  提示：在浏览器中访问上述地址即可使用\n`);
  }
});
