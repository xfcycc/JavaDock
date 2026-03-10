/**
 * 前后端共享类型定义
 * @author caiguoyu
 * @date 2026/3/10
 * 定义所有 API 接口数据结构，保证前后端字段名、类型完全一致
 */

// ─── Docker 相关类型 ───────────────────────────────────────────────────────────

export interface DockerPort {
  ip?: string;
  privatePort: number;
  publicPort?: number;
  type: string;
}

export interface DockerMount {
  type: string;
  source: string;
  destination: string;
  mode: string;
  rw: boolean;
}

/** Docker 容器列表摘要（来自 docker ps） */
export interface DockerContainerSummary {
  id: string;
  shortId: string;
  name: string;
  image: string;
  status: string;
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'dead' | 'created';
  ports: DockerPort[];
  createdAt: string;
  networks: string[];
  command: string;
}

/** Docker 容器详情（来自 docker inspect） */
export interface DockerContainerDetail extends DockerContainerSummary {
  env: string[];
  cmd: string[];
  entrypoint: string[];
  workDir: string;
  labels: Record<string, string>;
  mounts: DockerMount[];
  restartPolicy: string;
  memoryLimit: number;
  cpuShares: number;
  startedAt: string;
  finishedAt: string;
}

/** docker stats 实时资源数据 */
export interface DockerStats {
  cpuPercent: string;
  memUsage: string;
  memPercent: string;
  netIO: string;
  blockIO: string;
  pids: string;
}

/** 修改容器参数时提交的字段（用于 recreate） */
export interface DockerUpdateParams {
  ports?: Array<{ host: string; container: string; proto: string }>;
  env?: string[];
  mounts?: Array<{ source: string; destination: string; mode?: string; type?: string }>;
  restartPolicy?: string;
  memoryLimit?: string;
  cpuShares?: number;
}

// ─── Java 服务相关类型 ─────────────────────────────────────────────────────────

/** 扫描到的本机 Java/SpringBoot 进程 */
export interface JavaScannedProcess {
  /** 系统进程 ID */
  pid: number;
  /** 监听端口（从命令行参数或 lsof 解析） */
  port?: number;
  /** 进程工作目录（lsof 获取） */
  cwd?: string;
  /** 可执行 JAR 路径 */
  jarPath?: string;
  /** 是否为 SpringBoot 应用 */
  isSpringBoot: boolean;
  /** 建议的服务名称 */
  suggestedName: string;
  /** 完整命令行 */
  commandLine: string;
  /** 是否已在配置中注册（按端口/cwd 比对） */
  alreadyImported: boolean;
  /** 已导入时对应的服务 ID */
  existingServiceId?: string;
}

/** SpringBoot 配置文件信息 */
export interface JavaConfigFile {
  /** 绝对路径 */
  path: string;
  /** 文件名（含扩展名） */
  name: string;
  /** 文件格式 */
  type: 'properties' | 'yaml';
}

/** Java 服务的基础配置（存储于 config.json） */
export interface JavaService {
  id: string;
  name: string;
  cwd: string;
  description?: string;
  port?: number;
  logPath?: string;
  startCommand?: string;
  buildCommand?: string;
  javaHome?: string;
}

export type JavaServiceState = 'running' | 'stopped' | 'building' | 'starting' | 'error';

/** Java 服务配置 + 运行时状态（API 返回值） */
export interface JavaServiceStatus extends JavaService {
  pid?: number;
  state: JavaServiceState;
  memUsage?: string;
  uptime?: string;
  lastStarted?: string;
  lastBuilt?: string;
  lastBuildStatus?: 'success' | 'failed';
}

// ─── 设置与配置相关类型 ────────────────────────────────────────────────────────

/** 环境变量条目，可在命令模板中通过 {NAME} 引用 */
export interface EnvEntry {
  id: string;
  name: string;
  value: string;
  description?: string;
}

/** 默认命令模板，key 格式为 "模块.操作" */
export interface DefaultCommands {
  'java.start': string;
  'java.restart': string;
  'java.build': string;
  [key: string]: string;
}

/** 自定义脚本 */
export interface CustomScript {
  id: string;
  name: string;
  command: string;
  description?: string;
  cwd?: string;
}

/** 完整应用配置（对应 ~/.javadock/config.json） */
export interface AppConfig {
  environments: EnvEntry[];
  defaultCommands: DefaultCommands;
  customScripts: CustomScript[];
  javaServices: JavaService[];
  /** 管理员密码，用于需要 sudo 的操作（如扫描其他用户进程）。留空则不使用 sudo */
  adminPassword?: string;
}

// ─── 通用 API 响应类型 ─────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: string;
}

/** 命令执行结果 */
export interface CommandOutput {
  exitCode: number;
  stdout: string;
  stderr: string;
}
