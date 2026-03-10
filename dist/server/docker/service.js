"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listContainers = listContainers;
exports.inspectContainer = inspectContainer;
exports.getContainerStats = getContainerStats;
exports.startContainer = startContainer;
exports.stopContainer = stopContainer;
exports.restartContainer = restartContainer;
exports.recreateContainer = recreateContainer;
exports.streamContainerLogs = streamContainerLogs;
/**
 * Docker 服务层：通过 Docker CLI 实现容器管理
 * @author caiguoyu
 * @date 2026/3/10
 * 仅依赖系统已安装的 docker 命令，不引入 Docker SDK
 * 兼容 macOS / Linux
 */
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// ─── 解析辅助函数 ──────────────────────────────────────────────────────────────
/** 解析 "docker ps" 的 Ports 字段，如 "0.0.0.0:8080->80/tcp, 443/tcp" */
function parsePsPortsString(portsStr) {
    if (!portsStr)
        return [];
    const ports = [];
    for (const part of portsStr.split(', ')) {
        const withMapping = part.match(/^(?:(.+?):(\d+)->)?(\d+)\/(\w+)$/);
        if (withMapping) {
            ports.push({
                ip: withMapping[1] || undefined,
                publicPort: withMapping[2] ? parseInt(withMapping[2]) : undefined,
                privatePort: parseInt(withMapping[3]),
                type: withMapping[4],
            });
        }
    }
    return ports;
}
/** 将 docker ps --format '{{json .}}' 的单行 JSON 转换为摘要对象 */
function parsePsOutput(raw) {
    return {
        id: raw.ID,
        shortId: raw.ID.substring(0, 12),
        name: raw.Names.replace(/^\//, ''),
        image: raw.Image,
        status: raw.Status,
        state: (raw.State || 'created'),
        ports: parsePsPortsString(raw.Ports || ''),
        createdAt: raw.CreatedAt,
        networks: raw.Networks ? raw.Networks.split(',').map((n) => n.trim()) : [],
        command: raw.Command,
    };
}
/** 将 docker inspect 的原始 JSON 转换为详情对象 */
function parseInspectOutput(raw) {
    const config = raw.Config || {};
    const hostConfig = raw.HostConfig || {};
    const state = raw.State || {};
    const networkSettings = raw.NetworkSettings || {};
    // 解析端口映射
    const ports = [];
    if (networkSettings.Ports) {
        for (const [portKey, bindings] of Object.entries(networkSettings.Ports)) {
            const [privatePort, type] = portKey.split('/');
            if (Array.isArray(bindings)) {
                for (const b of bindings) {
                    ports.push({
                        ip: b.HostIp || undefined,
                        publicPort: b.HostPort ? parseInt(b.HostPort) : undefined,
                        privatePort: parseInt(privatePort),
                        type,
                    });
                }
            }
            else {
                ports.push({ privatePort: parseInt(privatePort), type });
            }
        }
    }
    // 解析挂载点
    const mounts = (raw.Mounts || []).map((m) => ({
        type: m.Type,
        source: m.Source,
        destination: m.Destination,
        mode: m.Mode,
        rw: m.RW,
    }));
    return {
        id: raw.Id,
        shortId: raw.Id.substring(0, 12),
        name: (raw.Name || '').replace(/^\//, ''),
        image: config.Image || '',
        status: state.Status || '',
        state: state.Status || 'created',
        ports,
        createdAt: raw.Created || '',
        networks: Object.keys(networkSettings.Networks || {}),
        command: Array.isArray(config.Cmd) ? config.Cmd.join(' ') : '',
        env: config.Env || [],
        cmd: config.Cmd || [],
        entrypoint: Array.isArray(config.Entrypoint)
            ? config.Entrypoint
            : config.Entrypoint
                ? [config.Entrypoint]
                : [],
        workDir: config.WorkingDir || '',
        labels: config.Labels || {},
        mounts,
        restartPolicy: hostConfig.RestartPolicy?.Name || 'no',
        memoryLimit: hostConfig.Memory || 0,
        cpuShares: hostConfig.CpuShares || 0,
        startedAt: state.StartedAt || '',
        finishedAt: state.FinishedAt || '',
    };
}
// ─── 主要操作函数 ──────────────────────────────────────────────────────────────
/** 获取所有容器列表（包含已停止的） */
async function listContainers() {
    const { stdout } = await execAsync("docker ps -a --format '{{json .}}'");
    if (!stdout.trim())
        return [];
    return stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => parsePsOutput(JSON.parse(line)));
}
/** 获取单个容器完整详情 */
async function inspectContainer(id) {
    const { stdout } = await execAsync(`docker inspect ${id}`);
    const [raw] = JSON.parse(stdout);
    return parseInspectOutput(raw);
}
/** 获取容器实时资源使用（单次快照，非流式） */
async function getContainerStats(id) {
    try {
        const { stdout } = await execAsync(`docker stats --no-stream --format '{{json .}}' ${id}`);
        const raw = JSON.parse(stdout.trim());
        return {
            cpuPercent: raw.CPUPerc || '0.00%',
            memUsage: raw.MemUsage || '0B / 0B',
            memPercent: raw.MemPerc || '0.00%',
            netIO: raw.NetIO || '0B / 0B',
            blockIO: raw.BlockIO || '0B / 0B',
            pids: raw.PIDs || '0',
        };
    }
    catch {
        return null;
    }
}
/** 启动容器 */
async function startContainer(id) {
    await execAsync(`docker start ${id}`);
}
/** 停止容器 */
async function stopContainer(id) {
    await execAsync(`docker stop ${id}`);
}
/** 重启容器 */
async function restartContainer(id) {
    await execAsync(`docker restart ${id}`);
}
/**
 * 修改容器参数并重新创建
 * 流程：inspect 当前配置 → 应用修改 → stop → rm → docker run 新参数
 */
async function recreateContainer(id, overrides) {
    const detail = await inspectContainer(id);
    // 构建 docker run 参数列表
    const args = ['run', '-d', `--name`, detail.name];
    // 端口映射
    const ports = overrides.ports
        ? overrides.ports.map((p) => ({
            ip: undefined,
            publicPort: parseInt(p.host),
            privatePort: parseInt(p.container),
            type: p.proto || 'tcp',
        }))
        : detail.ports;
    for (const p of ports) {
        if (p.publicPort) {
            const ipPart = p.ip ? `${p.ip}:` : '';
            args.push('-p', `${ipPart}${p.publicPort}:${p.privatePort}/${p.type}`);
        }
    }
    // 环境变量
    const envList = overrides.env ?? detail.env;
    for (const e of envList) {
        args.push('-e', e);
    }
    // 挂载点
    const mountList = overrides.mounts ?? detail.mounts;
    for (const m of mountList) {
        if (m.type === 'bind' || m.type === 'volume') {
            const mode = m.mode ? `:${m.mode}` : '';
            args.push('-v', `${m.source}:${m.destination}${mode}`);
        }
    }
    // 重启策略
    const restart = overrides.restartPolicy ?? detail.restartPolicy;
    if (restart && restart !== 'no') {
        args.push('--restart', restart);
    }
    // 内存限制
    if (overrides.memoryLimit) {
        args.push('--memory', overrides.memoryLimit);
    }
    else if (detail.memoryLimit > 0) {
        args.push('--memory', `${detail.memoryLimit}b`);
    }
    // CPU shares
    const cpu = overrides.cpuShares ?? detail.cpuShares;
    if (cpu && cpu > 0) {
        args.push('--cpu-shares', String(cpu));
    }
    // 工作目录
    if (detail.workDir) {
        args.push('-w', detail.workDir);
    }
    // 网络
    for (const net of detail.networks) {
        if (net !== 'bridge') {
            args.push('--network', net);
        }
    }
    // 镜像
    args.push(detail.image);
    // 自定义 CMD（如果非空）
    if (detail.cmd && detail.cmd.length > 0 && detail.cmd[0]) {
        args.push(...detail.cmd);
    }
    // 停止并删除旧容器
    try {
        await execAsync(`docker stop ${id}`);
    }
    catch { /* 容器可能已停止 */ }
    await execAsync(`docker rm ${id}`);
    // 创建新容器
    await new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)('docker', args);
        let stderr = '';
        child.stderr.on('data', (d) => (stderr += d.toString()));
        child.on('close', (code) => {
            if (code === 0)
                resolve();
            else
                reject(new Error(`docker run 失败: ${stderr}`));
        });
    });
}
/**
 * 以 SSE 形式流式推送容器日志
 * 调用方需先设置 SSE headers，并在连接关闭时 kill 子进程
 */
function streamContainerLogs(id, tail, res) {
    const child = (0, child_process_1.spawn)('docker', ['logs', '-f', '--tail', String(tail), id]);
    const sendLine = (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
            if (line.trim()) {
                res.write(`data: ${JSON.stringify(line)}\n\n`);
            }
        }
    };
    child.stdout.on('data', sendLine);
    child.stderr.on('data', sendLine); // docker 多数日志写到 stderr
    child.on('close', () => {
        res.write('data: {"__eof":true}\n\n');
        res.end();
    });
    return () => child.kill();
}
//# sourceMappingURL=service.js.map