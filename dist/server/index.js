"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * JavaDock 服务端入口
 * @author caiguoyu
 * @date 2026/3/10
 * 单进程：同时托管 REST API 与前端静态资源
 * 端口：7091（可通过环境变量 PORT 覆盖）
 */
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const routes_1 = require("./settings/routes");
const routes_2 = require("./docker/routes");
const routes_3 = require("./java/routes");
const routes_4 = require("./scripts/routes");
const app = (0, express_1.default)();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 7091;
const IS_DEV = process.env.NODE_ENV !== 'production';
// ─── 中间件 ────────────────────────────────────────────────────────────────────
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
// ─── API 路由 ──────────────────────────────────────────────────────────────────
app.use('/api/settings', routes_1.settingsRoutes);
app.use('/api/docker', routes_2.dockerRoutes);
app.use('/api/java', routes_3.javaRoutes);
app.use('/api/scripts', routes_4.scriptsRoutes);
// ─── 生产模式托管前端静态文件 ────────────────────────────────────────────────────
if (!IS_DEV) {
    // dist 目录结构：dist/server/index.js, dist/public/...
    // 所以 __dirname = dist/server，public = dist/public = ../public
    const staticPath = path_1.default.join(__dirname, '../public');
    app.use(express_1.default.static(staticPath));
    // SPA fallback：所有非 API 路由都返回 index.html
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path_1.default.join(staticPath, 'index.html'));
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
//# sourceMappingURL=index.js.map