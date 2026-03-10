"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dockerRoutes = void 0;
/**
 * Docker 模块路由
 * @author caiguoyu
 * @date 2026/3/10
 * GET    /api/docker/containers                  - 容器列表
 * GET    /api/docker/containers/:id              - 容器详情
 * GET    /api/docker/containers/:id/stats        - 资源快照
 * GET    /api/docker/containers/:id/logs         - 日志（tail 行数）
 * GET    /api/docker/containers/:id/logs/stream  - 日志流（SSE）
 * POST   /api/docker/containers/:id/start        - 启动
 * POST   /api/docker/containers/:id/stop         - 停止
 * POST   /api/docker/containers/:id/restart      - 重启
 * PUT    /api/docker/containers/:id              - 修改参数并重建
 */
const express_1 = require("express");
const child_process_1 = require("child_process");
const util_1 = require("util");
const service_1 = require("./service");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
exports.dockerRoutes = (0, express_1.Router)();
exports.dockerRoutes.get('/containers', async (_req, res) => {
    try {
        const containers = await (0, service_1.listContainers)();
        res.json(containers);
    }
    catch (err) {
        res.status(500).json({ error: '获取容器列表失败', details: err.message });
    }
});
exports.dockerRoutes.get('/containers/:id', async (req, res) => {
    try {
        const detail = await (0, service_1.inspectContainer)(req.params.id);
        res.json(detail);
    }
    catch (err) {
        res.status(500).json({ error: '获取容器详情失败', details: err.message });
    }
});
exports.dockerRoutes.get('/containers/:id/stats', async (req, res) => {
    try {
        const stats = await (0, service_1.getContainerStats)(req.params.id);
        if (!stats)
            return res.status(404).json({ error: '无法获取统计数据' });
        res.json(stats);
    }
    catch (err) {
        res.status(500).json({ error: '获取统计失败', details: err.message });
    }
});
/** 返回最近 N 行日志（非流式） */
exports.dockerRoutes.get('/containers/:id/logs', async (req, res) => {
    const tail = parseInt(String(req.query.tail || '200'));
    try {
        const { stdout, stderr } = await execAsync(`docker logs --tail ${tail} ${req.params.id} 2>&1`);
        const lines = (stdout + stderr).split('\n').filter(Boolean);
        res.json({ lines });
    }
    catch (err) {
        res.status(500).json({ error: '获取日志失败', details: err.message });
    }
});
/** SSE 流式日志 */
exports.dockerRoutes.get('/containers/:id/logs/stream', (req, res) => {
    const tail = parseInt(String(req.query.tail || '100'));
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const cleanup = (0, service_1.streamContainerLogs)(req.params.id, tail, res);
    req.on('close', cleanup);
});
exports.dockerRoutes.post('/containers/:id/start', async (req, res) => {
    try {
        await (0, service_1.startContainer)(req.params.id);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: '启动失败', details: err.message });
    }
});
exports.dockerRoutes.post('/containers/:id/stop', async (req, res) => {
    try {
        await (0, service_1.stopContainer)(req.params.id);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: '停止失败', details: err.message });
    }
});
exports.dockerRoutes.post('/containers/:id/restart', async (req, res) => {
    try {
        await (0, service_1.restartContainer)(req.params.id);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: '重启失败', details: err.message });
    }
});
exports.dockerRoutes.put('/containers/:id', async (req, res) => {
    try {
        await (0, service_1.recreateContainer)(req.params.id, req.body);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: '重建容器失败', details: err.message });
    }
});
//# sourceMappingURL=routes.js.map