"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readConfig = readConfig;
exports.writeConfig = writeConfig;
exports.getConfigPath = getConfigPath;
/**
 * 设置服务：读写 ~/.javadock/config.json
 * @author caiguoyu
 * @date 2026/3/10
 * 首次启动时若文件不存在则自动创建默认配置
 */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const defaultConfig_1 = require("../../shared/defaultConfig");
/** 配置文件存储目录（可通过环境变量 JAVADOCK_HOME 覆盖） */
const CONFIG_DIR = process.env.JAVADOCK_HOME
    ? process.env.JAVADOCK_HOME
    : path_1.default.join(os_1.default.homedir(), '.javadock');
const CONFIG_FILE = path_1.default.join(CONFIG_DIR, 'config.json');
/** 确保配置目录和文件存在，不存在则写入默认值 */
function ensureConfig() {
    if (!fs_1.default.existsSync(CONFIG_DIR)) {
        fs_1.default.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    if (!fs_1.default.existsSync(CONFIG_FILE)) {
        const defaultConfig = (0, defaultConfig_1.createDefaultConfig)();
        fs_1.default.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf-8');
        console.log(`[settings] 初始化配置文件: ${CONFIG_FILE}`);
    }
}
/** 读取配置，若缺少字段则用默认值补全（向前兼容） */
function readConfig() {
    ensureConfig();
    const raw = JSON.parse(fs_1.default.readFileSync(CONFIG_FILE, 'utf-8'));
    const defaults = (0, defaultConfig_1.createDefaultConfig)();
    return {
        environments: raw.environments ?? defaults.environments,
        defaultCommands: { ...defaults.defaultCommands, ...(raw.defaultCommands ?? {}) },
        customScripts: raw.customScripts ?? defaults.customScripts,
        javaServices: raw.javaServices ?? defaults.javaServices,
    };
}
/** 将配置写回文件 */
function writeConfig(config) {
    ensureConfig();
    fs_1.default.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}
/** 获取配置文件路径（供 UI 展示） */
function getConfigPath() {
    return CONFIG_FILE;
}
//# sourceMappingURL=service.js.map