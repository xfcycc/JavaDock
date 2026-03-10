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
import { Router } from 'express';
import {
  listJavaServices,
  startJavaService,
  stopJavaService,
  restartJavaService,
  buildJavaService,
  readServiceLogs,
  streamServiceLogs,
} from './service';

export const javaRoutes = Router();

javaRoutes.get('/services', (_req, res) => {
  try {
    res.json(listJavaServices());
  } catch (err: any) {
    res.status(500).json({ error: '获取服务列表失败', details: err.message });
  }
});

javaRoutes.get('/services/:id/logs', (req, res) => {
  const tail = parseInt(String(req.query.tail || '300'));
  try {
    const lines = readServiceLogs(req.params.id, tail);
    res.json({ lines });
  } catch (err: any) {
    res.status(500).json({ error: '读取日志失败', details: err.message });
  }
});

javaRoutes.get('/services/:id/logs/stream', (req, res) => {
  const tail = parseInt(String(req.query.tail || '100'));
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const cleanup = streamServiceLogs(req.params.id, tail, res);
  req.on('close', cleanup);
});

javaRoutes.post('/services/:id/start', (req, res) => {
  try {
    startJavaService(req.params.id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: '启动失败', details: err.message });
  }
});

javaRoutes.post('/services/:id/stop', (req, res) => {
  try {
    stopJavaService(req.params.id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: '停止失败', details: err.message });
  }
});

javaRoutes.post('/services/:id/restart', (req, res) => {
  try {
    restartJavaService(req.params.id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: '重启失败', details: err.message });
  }
});

/** Maven 编译：SSE 流式推送编译输出 */
javaRoutes.post('/services/:id/build', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const cleanup = buildJavaService(req.params.id, res);
  req.on('close', cleanup);
});
