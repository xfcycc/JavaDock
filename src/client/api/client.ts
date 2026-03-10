/**
 * API 请求客户端
 * @author caiguoyu
 * @date 2026/3/10
 * 封装所有与后端的通信，统一错误处理
 */
import type {
  AppConfig,
  DockerContainerSummary,
  DockerContainerDetail,
  DockerStats,
  DockerUpdateParams,
  JavaServiceStatus,
  JavaService,
  JavaScannedProcess,
  JavaConfigFile,
  CustomScript,
  CommandOutput,
} from '../../shared/types';

/** 基础 fetch 封装，自动解析 JSON 和错误 */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// ─── Docker API ───────────────────────────────────────────────────────────────

export const dockerApi = {
  listContainers: () =>
    request<DockerContainerSummary[]>('GET', '/docker/containers'),

  inspectContainer: (id: string) =>
    request<DockerContainerDetail>('GET', `/docker/containers/${id}`),

  getStats: (id: string) =>
    request<DockerStats>('GET', `/docker/containers/${id}/stats`),

  getLogs: (id: string, tail = 200) =>
    request<{ lines: string[] }>('GET', `/docker/containers/${id}/logs?tail=${tail}`),

  start: (id: string) =>
    request<{ ok: boolean }>('POST', `/docker/containers/${id}/start`),

  stop: (id: string) =>
    request<{ ok: boolean }>('POST', `/docker/containers/${id}/stop`),

  restart: (id: string) =>
    request<{ ok: boolean }>('POST', `/docker/containers/${id}/restart`),

  update: (id: string, params: DockerUpdateParams) =>
    request<{ ok: boolean }>('PUT', `/docker/containers/${id}`, params),

  /** 返回 EventSource 对象，调用方负责关闭 */
  streamLogs: (id: string, tail = 100): EventSource =>
    new EventSource(`/api/docker/containers/${id}/logs/stream?tail=${tail}`),
};

// ─── Java 服务 API ────────────────────────────────────────────────────────────

export const javaApi = {
  listServices: () =>
    request<JavaServiceStatus[]>('GET', '/java/services'),

  getLogs: (id: string, tail = 300) =>
    request<{ lines: string[] }>('GET', `/java/services/${id}/logs?tail=${tail}`),

  start: (id: string) =>
    request<{ ok: boolean }>('POST', `/java/services/${id}/start`),

  stop: (id: string) =>
    request<{ ok: boolean }>('POST', `/java/services/${id}/stop`),

  restart: (id: string) =>
    request<{ ok: boolean }>('POST', `/java/services/${id}/restart`),

  /** 返回 EventSource 对象，用于接收构建输出流 */
  buildStream: (id: string): EventSource =>
    new EventSource(`/api/java/services/${id}/build`),

  streamLogs: (id: string, tail = 100): EventSource =>
    new EventSource(`/api/java/services/${id}/logs/stream?tail=${tail}`),

  /** 扫描本机 Java 进程 */
  scan: () =>
    request<JavaScannedProcess[]>('GET', '/java/scan'),

  /** 列出服务目录下的 SpringBoot 配置文件 */
  listConfigFiles: (id: string) =>
    request<JavaConfigFile[]>('GET', `/java/services/${id}/config-files`),

  /** 读取配置文件内容 */
  getConfigFile: (id: string, filePath: string) =>
    request<{ content: string }>('GET', `/java/services/${id}/config-file?path=${encodeURIComponent(filePath)}`),

  /** 写入配置文件内容 */
  updateConfigFile: (id: string, filePath: string, content: string) =>
    request<{ ok: boolean }>('PUT', `/java/services/${id}/config-file?path=${encodeURIComponent(filePath)}`, { content }),
};

// ─── 设置 API ─────────────────────────────────────────────────────────────────

export const settingsApi = {
  getConfig: () =>
    request<AppConfig>('GET', '/settings'),

  updateConfig: (config: AppConfig) =>
    request<{ ok: boolean }>('PUT', '/settings', config),

  getConfigPath: () =>
    request<{ path: string }>('GET', '/settings/path'),

  /** 新增单个 Java 服务（导入扫描结果） */
  addJavaService: (service: Omit<JavaService, 'id'>) =>
    request<JavaService>('POST', '/settings/java-services', service),

  /** 更新单个 Java 服务配置 */
  updateJavaService: (id: string, service: Partial<JavaService>) =>
    request<JavaService>('PUT', `/settings/java-services/${id}`, service),

  /** 删除单个 Java 服务 */
  deleteJavaService: (id: string) =>
    request<{ ok: boolean }>('DELETE', `/settings/java-services/${id}`),
};

// ─── 脚本 API ─────────────────────────────────────────────────────────────────

export const scriptsApi = {
  list: () =>
    request<CustomScript[]>('GET', '/scripts'),

  /** 返回 EventSource 对象，用于接收脚本输出流 */
  runStream: (id: string): EventSource =>
    new EventSource(`/api/scripts/${id}/run`),
};

// ─── SSE 辅助工具 ─────────────────────────────────────────────────────────────

export type SseLineEvent = {
  type: 'stdout' | 'stderr' | 'info' | 'done' | 'error';
  text?: string;
  exitCode?: number;
  status?: string;
};

/** 包装 POST 类 SSE（因为 EventSource 只支持 GET，通过后端直接 GET 模拟即可） */
export function connectSse(
  url: string,
  onLine: (event: SseLineEvent | string) => void,
  onDone?: (exitCode: number) => void
): () => void {
  const source = new EventSource(url);

  source.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.__eof) {
        source.close();
        return;
      }
      if (typeof data === 'object' && data.type === 'done') {
        onDone?.(data.exitCode ?? 0);
        source.close();
      } else {
        onLine(data);
      }
    } catch {
      onLine(e.data);
    }
  };

  source.onerror = () => source.close();

  return () => source.close();
}
