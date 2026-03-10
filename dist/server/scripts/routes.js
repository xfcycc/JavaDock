"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scriptsRoutes = void 0;
/**
 * 自定义脚本模块路由
 * @author caiguoyu
 * @date 2026/3/10
 * GET  /api/scripts          - 获取自定义脚本列表
 * POST /api/scripts/:id/run  - 执行脚本（SSE 流式输出）
 */
const express_1 = require("express");
const child_process_1 = require("child_process");
const service_1 = require("../settings/service");
exports.scriptsRoutes = (0, express_1.Router)();
exports.scriptsRoutes.get('/', (_req, res) => {
    try {
        const { customScripts } = (0, service_1.readConfig)();
        res.json(customScripts);
    }
    catch (err) {
        res.status(500).json({ error: '读取脚本列表失败', details: err.message });
    }
});
/** 执行脚本并通过 SSE 流式返回输出 */
exports.scriptsRoutes.post('/:id/run', (req, res) => {
    const { customScripts, environments } = (0, service_1.readConfig)();
    const script = customScripts.find((s) => s.id === req.params.id);
    if (!script) {
        return res.status(404).json({ error: '脚本未找到' });
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const envMap = Object.fromEntries(environments.map((e) => [e.name, e.value]));
    res.write(`data: ${JSON.stringify({ type: 'info', text: `执行: ${script.command}` })}\n\n`);
    const child = (0, child_process_1.spawn)('sh', ['-c', script.command], {
        cwd: script.cwd || process.cwd(),
        env: { ...process.env, ...envMap },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (data) => {
        for (const line of data.toString().split('\n')) {
            if (line.trim())
                res.write(`data: ${JSON.stringify({ type: 'stdout', text: line })}\n\n`);
        }
    });
    child.stderr.on('data', (data) => {
        for (const line of data.toString().split('\n')) {
            if (line.trim())
                res.write(`data: ${JSON.stringify({ type: 'stderr', text: line })}\n\n`);
        }
    });
    child.on('close', (code) => {
        res.write(`data: ${JSON.stringify({ type: 'done', exitCode: code })}\n\n`);
        res.end();
    });
    req.on('close', () => child.kill());
});
//# sourceMappingURL=routes.js.map