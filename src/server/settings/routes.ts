/**
 * 设置模块路由
 * @author caiguoyu
 * @date 2026/3/10
 * GET    /api/settings                        - 获取完整配置
 * PUT    /api/settings                        - 保存完整配置
 * GET    /api/settings/path                   - 获取配置文件路径
 * POST   /api/settings/java-services          - 新增单个 Java 服务
 * PUT    /api/settings/java-services/:id      - 更新单个 Java 服务
 * DELETE /api/settings/java-services/:id      - 删除单个 Java 服务
 */
import { Router } from 'express';
import { readConfig, writeConfig, getConfigPath } from './service';
import { AppConfig, JavaService } from '../../shared/types';
import { randomUUID } from 'crypto';

export const settingsRoutes = Router();

/** 返回给前端时对管理员密码脱敏（不传明文） */
const ADMIN_PASSWORD_MASK = '********';

/** 读取配置（管理员密码以占位符返回，避免明文传输） */
settingsRoutes.get('/', (_req, res) => {
  try {
    const config = readConfig();
    const forClient = { ...config };
    if (forClient.adminPassword && forClient.adminPassword.length > 0) {
      forClient.adminPassword = ADMIN_PASSWORD_MASK;
    }
    res.json(forClient);
  } catch (err: any) {
    res.status(500).json({ error: '读取配置失败', details: err.message });
  }
});

/** 保存配置（若前端未修改密码则保留服务端已有密码） */
settingsRoutes.put('/', (req, res) => {
  try {
    const body = req.body as AppConfig;
    const existing = readConfig();
    if (
      body.adminPassword === undefined ||
      body.adminPassword === '' ||
      body.adminPassword === ADMIN_PASSWORD_MASK
    ) {
      body.adminPassword = existing.adminPassword;
    }
    writeConfig(body);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: '保存配置失败', details: err.message });
  }
});

/** 返回配置文件路径，方便用户手动编辑 */
settingsRoutes.get('/path', (_req, res) => {
  res.json({ path: getConfigPath() });
});

/** 新增单个 Java 服务（用于从扫描结果一键导入） */
settingsRoutes.post('/java-services', (req, res) => {
  try {
    const config = readConfig();
    const body = req.body as Partial<JavaService>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      res.status(400).json({ error: '缺少必填字段：name' });
      return;
    }
    /* cwd 允许为空（扫描时可能无法获取），用户可在编辑中补充 */
    const newService: JavaService = {
      id: randomUUID(),
      name,
      cwd: typeof body.cwd === 'string' ? body.cwd : '',
      description: body.description,
      port: body.port,
      logPath: body.logPath,
      startCommand: body.startCommand,
      buildCommand: body.buildCommand,
      javaHome: body.javaHome,
    };
    config.javaServices.push(newService);
    writeConfig(config);
    res.json(newService);
  } catch (err: any) {
    res.status(500).json({ error: '新增服务失败', details: err.message });
  }
});

/** 更新单个 Java 服务配置 */
settingsRoutes.put('/java-services/:id', (req, res) => {
  try {
    const config = readConfig();
    const idx = config.javaServices.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: '服务不存在' });
      return;
    }
    const updated: JavaService = {
      ...config.javaServices[idx],
      ...req.body,
      id: req.params.id, // 防止 body 中传入错误 id
    };
    config.javaServices[idx] = updated;
    writeConfig(config);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: '更新服务失败', details: err.message });
  }
});

/** 删除单个 Java 服务 */
settingsRoutes.delete('/java-services/:id', (req, res) => {
  try {
    const config = readConfig();
    const idx = config.javaServices.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: '服务不存在' });
      return;
    }
    config.javaServices.splice(idx, 1);
    writeConfig(config);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: '删除服务失败', details: err.message });
  }
});
