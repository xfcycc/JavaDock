"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listJavaServices = listJavaServices;
exports.getServiceStatus = getServiceStatus;
exports.startJavaService = startJavaService;
exports.stopJavaService = stopJavaService;
exports.restartJavaService = restartJavaService;
exports.buildJavaService = buildJavaService;
exports.readServiceLogs = readServiceLogs;
exports.streamServiceLogs = streamServiceLogs;
/**
 * Java 服务管理层
 * @author caiguoyu
 * @date 2026/3/10
 * 管理本机 Java 进程的生命周期：启动、停止、重启、Maven 编译、日志读取
 * 进程 PID 在运行时存储在内存 Map 中，服务重启后通过端口检测恢复状态
 */
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = __importDefault(require("os"));
const service_1 = require("../settings/service");
/** 内存中维护的进程映射（服务 id → 进程记录） */
const runningProcesses = new Map();
/** 构建进程记录的日志文件路径 */
function resolveLogPath(service) {
    if (service.logPath)
        return service.logPath;
    const logDir = (0, path_1.join)(os_1.default.homedir(), '.javadock', 'logs');
    try {
        (0, fs_1.mkdirSync)(logDir, { recursive: true });
    }
    catch { /* ignore */ }
    return (0, path_1.join)(logDir, `${service.id}.log`);
}
/** 替换命令模板中的占位符 */
function interpolateCommand(cmd, service, envMap) {
    let result = cmd;
    result = result.replace(/\{cwd\}/g, service.cwd);
    result = result.replace(/\{port\}/g, String(service.port || ''));
    result = result.replace(/\{name\}/g, service.name);
    // 替换环境变量占位符
    for (const [key, value] of Object.entries(envMap)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
}
/** 检查 PID 是否仍在运行（跨平台） */
function isPidAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
/** 通过端口号检测是否有进程在监听（用于服务器重启后的状态恢复） */
function isPortInUse(port) {
    try {
        const cmd = os_1.default.platform() === 'darwin'
            ? `lsof -ti tcp:${port}`
            : `fuser ${port}/tcp`;
        const result = (0, child_process_1.execSync)(cmd, { stdio: 'pipe' }).toString().trim();
        return result.length > 0;
    }
    catch {
        return false;
    }
}
/** 获取进程内存使用（macOS: ps rss；Linux: /proc/pid/status） */
function getMemUsage(pid) {
    try {
        if (os_1.default.platform() === 'linux') {
            const content = (0, fs_1.readFileSync)(`/proc/${pid}/status`, 'utf-8');
            const match = content.match(/VmRSS:\s+(\d+)/);
            if (match)
                return `${(parseInt(match[1]) / 1024).toFixed(1)} MB`;
        }
        else {
            const result = (0, child_process_1.execSync)(`ps -o rss= -p ${pid}`, { stdio: 'pipe' }).toString().trim();
            const kb = parseInt(result);
            if (!isNaN(kb))
                return `${(kb / 1024).toFixed(1)} MB`;
        }
    }
    catch { /* 忽略 */ }
    return undefined;
}
/** 计算运行时长（秒 → 人类可读格式） */
function formatUptime(startedAt) {
    const ms = Date.now() - new Date(startedAt).getTime();
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60)
        return `${seconds}s`;
    if (seconds < 3600)
        return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400)
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d`;
}
// ─── 对外接口函数 ──────────────────────────────────────────────────────────────
/** 获取所有 Java 服务的配置 + 运行状态 */
function listJavaServices() {
    const { javaServices } = (0, service_1.readConfig)();
    return javaServices.map((svc) => getServiceStatus(svc));
}
/** 获取单个服务的运行状态 */
function getServiceStatus(svc) {
    const record = runningProcesses.get(svc.id);
    // 如果内存中有记录，校验 PID 是否仍存活
    if (record && isPidAlive(record.pid)) {
        return {
            ...svc,
            pid: record.pid,
            state: 'running',
            memUsage: getMemUsage(record.pid),
            uptime: formatUptime(record.startedAt),
            lastStarted: record.startedAt,
        };
    }
    // 内存中无记录，但端口在监听（可能是外部启动的）
    if (svc.port && isPortInUse(svc.port)) {
        return { ...svc, state: 'running', uptime: '未知（外部启动）' };
    }
    return { ...svc, state: 'stopped' };
}
/** 启动 Java 服务 */
function startJavaService(serviceId) {
    const { javaServices, defaultCommands, environments } = (0, service_1.readConfig)();
    const svc = javaServices.find((s) => s.id === serviceId);
    if (!svc)
        throw new Error(`服务 "${serviceId}" 未在配置中找到`);
    const existing = runningProcesses.get(serviceId);
    if (existing && isPidAlive(existing.pid)) {
        throw new Error(`服务 "${svc.name}" 已在运行（PID: ${existing.pid}）`);
    }
    const envMap = Object.fromEntries(environments.map((e) => [e.name, e.value]));
    const rawCmd = svc.startCommand || defaultCommands['java.start'];
    const cmdStr = interpolateCommand(rawCmd, svc, envMap);
    const logPath = resolveLogPath(svc);
    const logStream = (0, fs_1.createWriteStream)(logPath, { flags: 'a' });
    const startedAt = new Date().toISOString();
    // 写入启动分隔线
    logStream.write(`\n${'─'.repeat(60)}\n[${startedAt}] 启动: ${cmdStr}\n${'─'.repeat(60)}\n`);
    const child = (0, child_process_1.spawn)('sh', ['-c', cmdStr], {
        cwd: svc.cwd,
        env: { ...process.env, ...envMap, ...(svc.javaHome ? { JAVA_HOME: svc.javaHome } : {}) },
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.pipe(logStream);
    child.stderr.pipe(logStream);
    child.on('exit', (code) => {
        logStream.write(`\n[${new Date().toISOString()}] 进程退出，exit code: ${code}\n`);
        logStream.end();
        runningProcesses.delete(serviceId);
    });
    if (!child.pid)
        throw new Error('进程启动失败');
    runningProcesses.set(serviceId, { pid: child.pid, startedAt, logPath });
}
/** 停止 Java 服务（SIGTERM，超时后强制 SIGKILL） */
function stopJavaService(serviceId) {
    const record = runningProcesses.get(serviceId);
    if (!record || !isPidAlive(record.pid)) {
        runningProcesses.delete(serviceId);
        throw new Error('服务未在运行');
    }
    process.kill(record.pid, 'SIGTERM');
    runningProcesses.delete(serviceId);
}
/** 重启 Java 服务 */
function restartJavaService(serviceId) {
    try {
        stopJavaService(serviceId);
    }
    catch { /* 可能已停止 */ }
    // 稍作等待再启动（异步，等待进程真正退出）
    setTimeout(() => startJavaService(serviceId), 1000);
}
/**
 * Maven 编译（异步执行，通过 SSE 流式输出）
 * 返回 cleanup 函数供调用方在连接关闭时调用
 */
function buildJavaService(serviceId, res) {
    const { javaServices, defaultCommands, environments } = (0, service_1.readConfig)();
    const svc = javaServices.find((s) => s.id === serviceId);
    if (!svc) {
        res.write(`data: ${JSON.stringify({ type: 'error', text: '服务未找到' })}\n\n`);
        res.end();
        return () => { };
    }
    const envMap = Object.fromEntries(environments.map((e) => [e.name, e.value]));
    const rawCmd = svc.buildCommand || defaultCommands['java.build'];
    const cmdStr = interpolateCommand(rawCmd, svc, envMap);
    res.write(`data: ${JSON.stringify({ type: 'info', text: `执行: ${cmdStr}` })}\n\n`);
    const child = (0, child_process_1.spawn)('sh', ['-c', cmdStr], {
        cwd: svc.cwd,
        env: { ...process.env, ...envMap, ...(svc.javaHome ? { JAVA_HOME: svc.javaHome } : {}) },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    const sendLine = (data, type) => {
        for (const line of data.toString().split('\n')) {
            if (line.trim())
                res.write(`data: ${JSON.stringify({ type, text: line })}\n\n`);
        }
    };
    child.stdout.on('data', (d) => sendLine(d, 'stdout'));
    child.stderr.on('data', (d) => sendLine(d, 'stderr'));
    child.on('close', (code) => {
        const status = code === 0 ? 'success' : 'failed';
        res.write(`data: ${JSON.stringify({ type: 'done', exitCode: code, status })}\n\n`);
        res.end();
    });
    return () => child.kill();
}
/** 读取日志最后 N 行 */
function readServiceLogs(serviceId, tail) {
    const { javaServices } = (0, service_1.readConfig)();
    const svc = javaServices.find((s) => s.id === serviceId);
    if (!svc)
        throw new Error('服务未找到');
    const logPath = resolveLogPath(svc);
    if (!(0, fs_1.existsSync)(logPath))
        return ['（日志文件尚未创建）'];
    const content = (0, fs_1.readFileSync)(logPath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    return lines.slice(-tail);
}
/** SSE 流式日志（tail -f 模拟） */
function streamServiceLogs(serviceId, tail, res) {
    const { javaServices } = (0, service_1.readConfig)();
    const svc = javaServices.find((s) => s.id === serviceId);
    if (!svc) {
        res.write(`data: ${JSON.stringify('服务未找到')}\n\n`);
        res.end();
        return () => { };
    }
    const logPath = resolveLogPath(svc);
    // 先发送历史日志
    if ((0, fs_1.existsSync)(logPath)) {
        const content = (0, fs_1.readFileSync)(logPath, 'utf-8');
        const lines = content.split('\n').filter(Boolean).slice(-tail);
        for (const line of lines) {
            res.write(`data: ${JSON.stringify(line)}\n\n`);
        }
    }
    // 通过 tail -f 监听新内容
    const child = (0, child_process_1.spawn)('tail', ['-f', logPath]);
    child.stdout.on('data', (data) => {
        for (const line of data.toString().split('\n')) {
            if (line.trim())
                res.write(`data: ${JSON.stringify(line)}\n\n`);
        }
    });
    child.on('close', () => res.end());
    return () => child.kill();
}
//# sourceMappingURL=service.js.map