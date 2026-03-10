"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRoutes = void 0;
/**
 * 设置模块路由
 * @author caiguoyu
 * @date 2026/3/10
 * GET  /api/settings        - 获取完整配置
 * PUT  /api/settings        - 保存完整配置
 * GET  /api/settings/path   - 获取配置文件路径
 */
const express_1 = require("express");
const service_1 = require("./service");
exports.settingsRoutes = (0, express_1.Router)();
/** 读取配置 */
exports.settingsRoutes.get('/', (_req, res) => {
    try {
        const config = (0, service_1.readConfig)();
        res.json(config);
    }
    catch (err) {
        res.status(500).json({ error: '读取配置失败', details: err.message });
    }
});
/** 保存配置 */
exports.settingsRoutes.put('/', (req, res) => {
    try {
        (0, service_1.writeConfig)(req.body);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: '保存配置失败', details: err.message });
    }
});
/** 返回配置文件路径，方便用户手动编辑 */
exports.settingsRoutes.get('/path', (_req, res) => {
    res.json({ path: (0, service_1.getConfigPath)() });
});
//# sourceMappingURL=routes.js.map