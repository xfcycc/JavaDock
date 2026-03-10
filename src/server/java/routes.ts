/**
 * Java 服务模块路由
 * @author caiguoyu
 * @date 2026/3/10
 * GET  /api/java/scan                            - 扫描本机 Java 进程
 * GET  /api/java/services                        - 服务列表（含运行状态）
 * GET  /api/java/services/:id/logs               - 日志（tail 行数）
 * GET  /api/java/services/:id/logs/stream        - 日志流（SSE）
 * GET  /api/java/services/:id/config-files       - 列出 SpringBoot 配置文件
 * GET  /api/java/services/:id/config-file        - 读取配置文件内容（?path=）
 * PUT  /api/java/services/:id/config-file        - 写入配置文件内容（?path=）
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
  scanJavaProcesses,
  listConfigFiles,
  readConfigFile,
  writeConfigFile,
} from './service';

export const javaRoutes = Router();

/** 一键扫描本机 Java 进程 */
javaRoutes.get('/scan', (_req, res) => {
  try {
    const processes = scanJavaProcesses();
    res.json(processes);
  } catch (err: any) {
    res.status(500).json({ error: '扫描失败', details: err.message });
  }
});

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

/** 列出服务目录下的 SpringBoot 配置文件 */
javaRoutes.get('/services/:id/config-files', (req, res) => {
  try {
    const files = listConfigFiles(req.params.id);
    res.json(files);
  } catch (err: any) {
    res.status(500).json({ error: '获取配置文件列表失败', details: err.message });
  }
});

/** 读取指定配置文件内容（?path=绝对路径） */
javaRoutes.get('/services/:id/config-file', (req, res) => {
  const filePath = String(req.query.path || '');
  if (!filePath) {
    res.status(400).json({ error: '缺少 path 参数' });
    return;
  }
  try {
    const content = readConfigFile(filePath);
    res.json({ content });
  } catch (err: any) {
    res.status(500).json({ error: '读取配置文件失败', details: err.message });
  }
});

/** 写入配置文件内容（?path=绝对路径，body: { content: string }） */
javaRoutes.put('/services/:id/config-file', (req, res) => {
  const filePath = String(req.query.path || '');
  if (!filePath) {
    res.status(400).json({ error: '缺少 path 参数' });
    return;
  }
  const { content } = req.body;
  if (typeof content !== 'string') {
    res.status(400).json({ error: '缺少 content 字段' });
    return;
  }
  try {
    writeConfigFile(filePath, content);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: '写入配置文件失败', details: err.message });
  }
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
