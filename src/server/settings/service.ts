/**
 * 设置服务：读写 ~/.javadock/config.json
 * @author caiguoyu
 * @date 2026/3/10
 * 首次启动时若文件不存在则自动创建默认配置
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AppConfig } from '../../shared/types';
import { createDefaultConfig } from '../../shared/defaultConfig';

/** 配置文件存储目录（可通过环境变量 JAVADOCK_HOME 覆盖） */
const CONFIG_DIR = process.env.JAVADOCK_HOME
  ? process.env.JAVADOCK_HOME
  : path.join(os.homedir(), '.javadock');

const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/** 确保配置目录和文件存在，不存在则写入默认值 */
function ensureConfig(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaultConfig = createDefaultConfig();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    console.log(`[settings] 初始化配置文件: ${CONFIG_FILE}`);
  }
}

/** 读取配置，若缺少字段则用默认值补全（向前兼容） */
export function readConfig(): AppConfig {
  ensureConfig();
  const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  const defaults = createDefaultConfig();
  return {
    environments: raw.environments ?? defaults.environments,
    defaultCommands: { ...defaults.defaultCommands, ...(raw.defaultCommands ?? {}) },
    customScripts: raw.customScripts ?? defaults.customScripts,
    javaServices: raw.javaServices ?? defaults.javaServices,
    adminPassword: raw.adminPassword,
  };
}

/** 将配置写回文件 */
export function writeConfig(config: AppConfig): void {
  ensureConfig();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/** 获取配置文件路径（供 UI 展示） */
export function getConfigPath(): string {
  return CONFIG_FILE;
}
