/**
 * JavaDock 服务端入口
 * @author caiguoyu
 * @date 2026/3/10
 * 单进程：开发模式内嵌 Vite middleware（支持 HMR），生产模式静态托管
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

async function bootstrap() {
  if (IS_DEV) {
    /* 开发模式：将 Vite 以 middleware 模式嵌入 Express，保留完整 HMR 能力 */
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    /* 生产模式：托管 vite build 产物 dist/public */
    // dist 目录结构：dist/server/index.js, dist/public/...
    // __dirname = dist/server，所以 public = ../public
    const staticPath = path.join(__dirname, '../public');
    app.use(express.static(staticPath));
    // SPA fallback：非 API 路由统一返回 index.html
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(staticPath, 'index.html'));
      }
    });
  }

  // ─── 启动 ────────────────────────────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`\n  ⚓  JavaDock 已启动`);
    console.log(`  →  http://localhost:${PORT}`);
    if (!IS_DEV) {
      console.log(`\n  提示：在浏览器中访问上述地址即可使用\n`);
    }
  });
}

bootstrap();
