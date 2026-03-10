/**
 * Java 服务管理层
 * @author caiguoyu
 * @date 2026/3/10
 * 管理本机 Java 进程的生命周期：启动、停止、重启、Maven 编译、日志读取
 * 进程 PID 在运行时存储在内存 Map 中，服务重启后通过端口检测恢复状态
 * 新增：一键扫描本机 Java 进程、SpringBoot 配置文件读写
 */
import { spawn, execSync } from 'child_process';
import { createWriteStream, readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { join, basename, extname } from 'path';
import os from 'os';
import { Response } from 'express';
import { JavaService, JavaServiceStatus, JavaServiceState, JavaScannedProcess, JavaConfigFile } from '../../shared/types';
import { readConfig } from '../settings/service';

/** 运行时进程记录 */
interface ProcessRecord {
  pid: number;
  startedAt: string;
  logPath: string;
}

/** 内存中维护的进程映射（服务 id → 进程记录） */
const runningProcesses = new Map<string, ProcessRecord>();

/** 构建进程记录的日志文件路径 */
function resolveLogPath(service: JavaService): string {
  if (service.logPath) return service.logPath;
  const logDir = join(os.homedir(), '.javadock', 'logs');
  try { mkdirSync(logDir, { recursive: true }); } catch { /* ignore */ }
  return join(logDir, `${service.id}.log`);
}

/** 替换命令模板中的占位符 */
function interpolateCommand(cmd: string, service: JavaService, envMap: Record<string, string>): string {
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
function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** 通过端口号检测是否有进程在监听（用于服务器重启后的状态恢复） */
function isPortInUse(port: number): boolean {
  try {
    const cmd = os.platform() === 'darwin'
      ? `lsof -ti tcp:${port}`
      : `fuser ${port}/tcp`;
    const result = execSync(cmd, { stdio: 'pipe' }).toString().trim();
    return result.length > 0;
  } catch {
    return false;
  }
}

/** 获取进程内存使用（macOS: ps rss；Linux: /proc/pid/status） */
function getMemUsage(pid: number): string | undefined {
  try {
    if (os.platform() === 'linux') {
      const content = readFileSync(`/proc/${pid}/status`, 'utf-8');
      const match = content.match(/VmRSS:\s+(\d+)/);
      if (match) return `${(parseInt(match[1]) / 1024).toFixed(1)} MB`;
    } else {
      const result = execSync(`ps -o rss= -p ${pid}`, { stdio: 'pipe' }).toString().trim();
      const kb = parseInt(result);
      if (!isNaN(kb)) return `${(kb / 1024).toFixed(1)} MB`;
    }
  } catch { /* 忽略 */ }
  return undefined;
}

/** 计算运行时长（秒 → 人类可读格式） */
function formatUptime(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d`;
}

// ─── 对外接口函数 ──────────────────────────────────────────────────────────────

/** 获取所有 Java 服务的配置 + 运行状态 */
export function listJavaServices(): JavaServiceStatus[] {
  const { javaServices } = readConfig();
  return javaServices.map((svc) => getServiceStatus(svc));
}

/** 获取单个服务的运行状态 */
export function getServiceStatus(svc: JavaService): JavaServiceStatus {
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
export function startJavaService(serviceId: string): void {
  const { javaServices, defaultCommands, environments } = readConfig();
  const svc = javaServices.find((s) => s.id === serviceId);
  if (!svc) throw new Error(`服务 "${serviceId}" 未在配置中找到`);

  const existing = runningProcesses.get(serviceId);
  if (existing && isPidAlive(existing.pid)) {
    throw new Error(`服务 "${svc.name}" 已在运行（PID: ${existing.pid}）`);
  }

  const envMap = Object.fromEntries(environments.map((e) => [e.name, e.value]));
  const rawCmd = svc.startCommand || defaultCommands['java.start'];
  const cmdStr = interpolateCommand(rawCmd, svc, envMap);

  const logPath = resolveLogPath(svc);
  const logStream = createWriteStream(logPath, { flags: 'a' });
  const startedAt = new Date().toISOString();

  // 写入启动分隔线
  logStream.write(`\n${'─'.repeat(60)}\n[${startedAt}] 启动: ${cmdStr}\n${'─'.repeat(60)}\n`);

  const child = spawn('sh', ['-c', cmdStr], {
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

  if (!child.pid) throw new Error('进程启动失败');
  runningProcesses.set(serviceId, { pid: child.pid, startedAt, logPath });
}

/** 停止 Java 服务（SIGTERM，超时后强制 SIGKILL） */
export function stopJavaService(serviceId: string): void {
  const record = runningProcesses.get(serviceId);
  if (!record || !isPidAlive(record.pid)) {
    runningProcesses.delete(serviceId);
    throw new Error('服务未在运行');
  }
  process.kill(record.pid, 'SIGTERM');
  runningProcesses.delete(serviceId);
}

/** 重启 Java 服务 */
export function restartJavaService(serviceId: string): void {
  try { stopJavaService(serviceId); } catch { /* 可能已停止 */ }
  // 稍作等待再启动（异步，等待进程真正退出）
  setTimeout(() => startJavaService(serviceId), 1000);
}

/**
 * Maven 编译（异步执行，通过 SSE 流式输出）
 * 返回 cleanup 函数供调用方在连接关闭时调用
 */
export function buildJavaService(
  serviceId: string,
  res: Response
): () => void {
  const { javaServices, defaultCommands, environments } = readConfig();
  const svc = javaServices.find((s) => s.id === serviceId);
  if (!svc) {
    res.write(`data: ${JSON.stringify({ type: 'error', text: '服务未找到' })}\n\n`);
    res.end();
    return () => {};
  }

  const envMap = Object.fromEntries(environments.map((e) => [e.name, e.value]));
  const rawCmd = svc.buildCommand || defaultCommands['java.build'];
  const cmdStr = interpolateCommand(rawCmd, svc, envMap);

  res.write(`data: ${JSON.stringify({ type: 'info', text: `执行: ${cmdStr}` })}\n\n`);

  const child = spawn('sh', ['-c', cmdStr], {
    cwd: svc.cwd,
    env: { ...process.env, ...envMap, ...(svc.javaHome ? { JAVA_HOME: svc.javaHome } : {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const sendLine = (data: Buffer, type: 'stdout' | 'stderr') => {
    for (const line of data.toString().split('\n')) {
      if (line.trim()) res.write(`data: ${JSON.stringify({ type, text: line })}\n\n`);
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
export function readServiceLogs(serviceId: string, tail: number): string[] {
  const { javaServices } = readConfig();
  const svc = javaServices.find((s) => s.id === serviceId);
  if (!svc) throw new Error('服务未找到');

  const logPath = resolveLogPath(svc);
  if (!existsSync(logPath)) return ['（日志文件尚未创建）'];

  const content = readFileSync(logPath, 'utf-8');
  const lines = content.split('\n').filter(Boolean);
  return lines.slice(-tail);
}

/** SSE 流式日志（tail -f 模拟） */
export function streamServiceLogs(
  serviceId: string,
  tail: number,
  res: Response
): () => void {
  const { javaServices } = readConfig();
  const svc = javaServices.find((s) => s.id === serviceId);
  if (!svc) {
    res.write(`data: ${JSON.stringify('服务未找到')}\n\n`);
    res.end();
    return () => {};
  }

  const logPath = resolveLogPath(svc);

  // 先发送历史日志
  if (existsSync(logPath)) {
    const content = readFileSync(logPath, 'utf-8');
    const lines = content.split('\n').filter(Boolean).slice(-tail);
    for (const line of lines) {
      res.write(`data: ${JSON.stringify(line)}\n\n`);
    }
  }

  // 通过 tail -f 监听新内容
  const child = spawn('tail', ['-f', logPath]);
  child.stdout.on('data', (data: Buffer) => {
    for (const line of data.toString().split('\n')) {
      if (line.trim()) res.write(`data: ${JSON.stringify(line)}\n\n`);
    }
  });

  child.on('close', () => res.end());
  return () => child.kill();
}

// ─── 扫描与配置文件管理 ────────────────────────────────────────────────────────

/**
 * 使用 sudo 执行命令（密码通过 stdin 传入，不暴露在命令行）
 * @param cmd 要执行的完整 shell 命令
 * @param sudoPassword 管理员密码
 */
function runWithSudo(cmd: string, sudoPassword: string): string {
  const safeCmd = JSON.stringify(cmd);
  return execSync(`sudo -S sh -c ${safeCmd}`, {
    input: sudoPassword + '\n',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 5000,
    encoding: 'utf-8',
  }).trim();
}

/**
 * 从 lsof 输出解析进程的 cwd（工作目录）
 * macOS: lsof -p <pid> | grep cwd
 * 若提供 sudoPassword 则用 sudo 执行，以获取其他用户进程的 cwd
 */
function getProcessCwd(pid: number, sudoPassword?: string): string | undefined {
  try {
    const cmd = `lsof -p ${pid} 2>/dev/null | grep ' cwd '`;
    const out = sudoPassword
      ? runWithSudo(cmd, sudoPassword)
      : execSync(cmd, { stdio: 'pipe', timeout: 3000 }).toString();
    // 格式: java  PID  user  cwd  DIR  ...  /path
    const match = out.match(/\s+DIR\s+\S+\s+\S+\s+(\/.+)$/m);
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}

/**
 * 解析进程监听的端口
 * 先从命令行参数 -Dserver.port=XXXX 解析，再尝试 lsof -i
 * 若提供 sudoPassword 则 lsof 使用 sudo 执行
 */
function getProcessPort(pid: number, cmdLine: string, sudoPassword?: string): number | undefined {
  // 从命令行参数解析
  const portMatch = cmdLine.match(/-Dserver\.port[= ](\d+)/);
  if (portMatch) return parseInt(portMatch[1]);

  const portMatch2 = cmdLine.match(/--server\.port[= ](\d+)/);
  if (portMatch2) return parseInt(portMatch2[1]);

  try {
    const cmd = `lsof -p ${pid} -iTCP -sTCP:LISTEN -n -P 2>/dev/null`;
    const out = sudoPassword
      ? runWithSudo(cmd, sudoPassword)
      : execSync(cmd, { stdio: 'pipe', timeout: 3000 }).toString();
    const match = out.match(/:(\d+) \(LISTEN\)/);
    if (match) return parseInt(match[1]);
  } catch { /* ignore */ }

  return undefined;
}

/**
 * 从命令行提取 JAR 文件路径
 * 匹配 java -jar /path/to/app.jar 或 -jar xxx.jar
 */
function extractJarPath(cmdLine: string, cwd?: string): string | undefined {
  const match = cmdLine.match(/-jar\s+([^\s]+\.jar)/);
  if (!match) return undefined;
  const jarArg = match[1];
  // 如果是相对路径且有 cwd，拼接成绝对路径
  if (!jarArg.startsWith('/') && cwd) return join(cwd, jarArg);
  return jarArg;
}

/**
 * 判断是否为 SpringBoot 应用
 * 检测点：loader 类、spring-boot in jar name、spring-boot classpath loader
 */
function detectSpringBoot(cmdLine: string, jarPath?: string): boolean {
  if (cmdLine.includes('org.springframework.boot.loader')) return true;
  if (cmdLine.includes('spring-boot')) return true;
  if (jarPath && jarPath.toLowerCase().includes('spring-boot')) return true;
  // 通过 BOOT-INF（SpringBoot 特有的 JAR 内目录结构）判断
  if (cmdLine.includes('BOOT-INF')) return true;
  return false;
}

/**
 * 从 JAR 路径或命令行生成建议的服务名称
 */
function suggestServiceName(cmdLine: string, jarPath?: string, cwd?: string): string {
  if (jarPath) {
    const name = basename(jarPath, '.jar');
    // 去除版本号后缀（如 myapp-1.0.0-SNAPSHOT → myapp）
    return name.replace(/-\d+[\d\.\-SNAPSHOT]*$/, '');
  }
  if (cwd) return basename(cwd);
  return `java-${Date.now()}`;
}

/**
 * 扫描本机所有 Java 进程，识别 SpringBoot 服务
 * 通过 ps aux + lsof 获取进程信息；若配置了 adminPassword 则使用 sudo 以获取其他用户进程
 */
export function scanJavaProcesses(): JavaScannedProcess[] {
  const { javaServices, adminPassword } = readConfig();
  const sudoPassword = typeof adminPassword === 'string' && adminPassword.length > 0 ? adminPassword : undefined;

  let psOutput: string;
  try {
    if (sudoPassword) {
      psOutput = runWithSudo('ps aux', sudoPassword);
    } else {
      psOutput = execSync('ps aux', { stdio: 'pipe', timeout: 5000 }).toString();
    }
  } catch {
    return [];
  }

  const lines = psOutput.split('\n').slice(1); // 跳过表头
  const results: JavaScannedProcess[] = [];

  for (const line of lines) {
    if (!line.includes('java') || line.includes('grep')) continue;

    // ps aux 格式：USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
    const parts = line.trim().split(/\s+/);
    if (parts.length < 11) continue;

    const pid = parseInt(parts[1]);
    if (isNaN(pid) || pid === process.pid) continue;

    // 完整命令行（第 11 列之后的所有内容）
    const cmdLine = parts.slice(10).join(' ');
    if (!cmdLine.includes('java')) continue;

    const cwd = getProcessCwd(pid, sudoPassword);
    const port = getProcessPort(pid, cmdLine, sudoPassword);
    const jarPath = extractJarPath(cmdLine, cwd);
    const isSpringBoot = detectSpringBoot(cmdLine, jarPath);
    const suggestedName = suggestServiceName(cmdLine, jarPath, cwd);

    // 检查是否已在配置中注册（按端口或 cwd 比对）
    const existing = javaServices.find((s) =>
      (port && s.port === port) || (cwd && s.cwd === cwd)
    );

    results.push({
      pid,
      port,
      cwd,
      jarPath,
      isSpringBoot,
      suggestedName,
      commandLine: cmdLine,
      alreadyImported: !!existing,
      existingServiceId: existing?.id,
    });
  }

  return results;
}

/**
 * 列出指定服务目录下的 SpringBoot 配置文件
 * 搜索路径优先级：./config/ → ./ → ./src/main/resources/
 */
export function listConfigFiles(serviceId: string): JavaConfigFile[] {
  const { javaServices } = readConfig();
  const svc = javaServices.find((s) => s.id === serviceId);
  if (!svc) throw new Error('服务未找到');

  const cwd = svc.cwd;
  const searchDirs = [
    join(cwd, 'config'),
    cwd,
    join(cwd, 'src', 'main', 'resources'),
    join(cwd, 'src', 'main', 'resources', 'config'),
  ];

  const files: JavaConfigFile[] = [];
  const seen = new Set<string>();

  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        // 匹配 application*.properties 和 application*.yml/yaml
        if (!/^application.*\.(properties|ya?ml)$/.test(entry)) continue;
        const fullPath = join(dir, entry);
        if (seen.has(fullPath)) continue;
        seen.add(fullPath);

        const ext = extname(entry).toLowerCase();
        files.push({
          path: fullPath,
          name: entry,
          type: ext === '.properties' ? 'properties' : 'yaml',
        });
      }
    } catch { /* 无读取权限，跳过 */ }
  }

  return files;
}

/**
 * 读取配置文件内容
 * @param filePath 配置文件绝对路径
 */
export function readConfigFile(filePath: string): string {
  if (!existsSync(filePath)) throw new Error(`配置文件不存在: ${filePath}`);
  return readFileSync(filePath, 'utf-8');
}

/**
 * 写入配置文件（写入前自动备份为 .bak）
 * @param filePath 配置文件绝对路径
 * @param content  新内容
 */
export function writeConfigFile(filePath: string, content: string): void {
  if (!existsSync(filePath)) throw new Error(`配置文件不存在: ${filePath}`);
  // 备份原文件
  const backupPath = `${filePath}.bak`;
  copyFileSync(filePath, backupPath);
  writeFileSync(filePath, content, 'utf-8');
}
