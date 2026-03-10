/**
 * 设置模块路由
 * @author caiguoyu
 * @date 2026/3/10
 * GET  /api/settings        - 获取完整配置
 * PUT  /api/settings        - 保存完整配置
 * GET  /api/settings/path   - 获取配置文件路径
 */
import { Router } from 'express';
import { readConfig, writeConfig, getConfigPath } from './service';

export const settingsRoutes = Router();

/** 读取配置 */
settingsRoutes.get('/', (_req, res) => {
  try {
    const config = readConfig();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: '读取配置失败', details: err.message });
  }
});

/** 保存配置 */
settingsRoutes.put('/', (req, res) => {
  try {
    writeConfig(req.body);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: '保存配置失败', details: err.message });
  }
});

/** 返回配置文件路径，方便用户手动编辑 */
settingsRoutes.get('/path', (_req, res) => {
  res.json({ path: getConfigPath() });
});
