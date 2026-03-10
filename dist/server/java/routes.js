"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.javaRoutes = void 0;
/**
 * Java 服务模块路由
 * @author caiguoyu
 * @date 2026/3/10
 * GET  /api/java/services                        - 服务列表（含运行状态）
 * GET  /api/java/services/:id/logs               - 日志（tail 行数）
 * GET  /api/java/services/:id/logs/stream        - 日志流（SSE）
 * POST /api/java/services/:id/start              - 启动
 * POST /api/java/services/:id/stop               - 停止
 * POST /api/java/services/:id/restart            - 重启
 * POST /api/java/services/:id/build              - Maven 编译（SSE 流输出）
 */
const express_1 = require("express");
const service_1 = require("./service");
exports.javaRoutes = (0, express_1.Router)();
exports.javaRoutes.get('/services', (_req, res) => {
    try {
        res.json((0, service_1.listJavaServices)());
    }
    catch (err) {
        res.status(500).json({ error: '获取服务列表失败', details: err.message });
    }
});
exports.javaRoutes.get('/services/:id/logs', (req, res) => {
    const tail = parseInt(String(req.query.tail || '300'));
    try {
        const lines = (0, service_1.readServiceLogs)(req.params.id, tail);
        res.json({ lines });
    }
    catch (err) {
        res.status(500).json({ error: '读取日志失败', details: err.message });
    }
});
exports.javaRoutes.get('/services/:id/logs/stream', (req, res) => {
    const tail = parseInt(String(req.query.tail || '100'));
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const cleanup = (0, service_1.streamServiceLogs)(req.params.id, tail, res);
    req.on('close', cleanup);
});
exports.javaRoutes.post('/services/:id/start', (req, res) => {
    try {
        (0, service_1.startJavaService)(req.params.id);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: '启动失败', details: err.message });
    }
});
exports.javaRoutes.post('/services/:id/stop', (req, res) => {
    try {
        (0, service_1.stopJavaService)(req.params.id);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: '停止失败', details: err.message });
    }
});
exports.javaRoutes.post('/services/:id/restart', (req, res) => {
    try {
        (0, service_1.restartJavaService)(req.params.id);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: '重启失败', details: err.message });
    }
});
/** Maven 编译：SSE 流式推送编译输出 */
exports.javaRoutes.post('/services/:id/build', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const cleanup = (0, service_1.buildJavaService)(req.params.id, res);
    req.on('close', cleanup);
});
//# sourceMappingURL=routes.js.map