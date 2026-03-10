/**
 * Docker 容器管理页面
 * @author caiguoyu
 * @date 2026/3/10
 * 功能：容器列表/卡片、启停/重启、详情查看、参数修改（recreate）、日志流
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Search, Container } from 'lucide-react';
import { dockerApi } from '../api/client';
import { DockerContainerSummary, DockerContainerDetail, DockerUpdateParams } from '../../../src/shared/types';
import DockerCard from '../components/DockerCard';
import Modal from '../components/Modal';
import LogViewer from '../components/LogViewer';
import PageHeader from '../components/PageHeader';
import Spinner, { PageLoader } from '../components/Spinner';
import { useToast } from '../App';

// ─── 容器详情模态 ──────────────────────────────────────────────────────────────

function InspectModal({ detail, open, onClose }: {
  detail: DockerContainerDetail | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!detail) return null;

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex gap-3 py-2 border-b border-slate-800/60 text-sm">
      <span className="text-slate-500 w-28 shrink-0">{label}</span>
      <span className="text-slate-200 break-all">{value}</span>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={`容器详情 · ${detail.name}`} width="max-w-2xl">
      <div className="space-y-0">
        <InfoRow label="容器 ID" value={<code className="text-xs font-mono text-brand-400">{detail.id}</code>} />
        <InfoRow label="镜像" value={detail.image} />
        <InfoRow label="状态" value={detail.status} />
        <InfoRow label="重启策略" value={detail.restartPolicy} />
        <InfoRow label="工作目录" value={detail.workDir || '（默认）'} />
        <InfoRow label="入口点" value={detail.entrypoint.join(' ') || '（默认）'} />
        <InfoRow label="命令" value={detail.cmd.join(' ') || '（默认）'} />
        <InfoRow label="内存限制" value={detail.memoryLimit > 0 ? `${(detail.memoryLimit / 1024 / 1024).toFixed(0)} MB` : '不限制'} />

        {detail.ports.length > 0 && (
          <InfoRow label="端口映射" value={
            <div className="flex flex-wrap gap-1">
              {detail.ports.map((p, i) => (
                <span key={i} className="bg-slate-700 px-2 py-0.5 rounded text-xs font-mono">
                  {p.ip && `${p.ip}:`}{p.publicPort ? `${p.publicPort}→${p.privatePort}` : p.privatePort}/{p.type}
                </span>
              ))}
            </div>
          } />
        )}

        {detail.env.length > 0 && (
          <div className="py-2">
            <div className="text-slate-500 text-sm mb-2">环境变量</div>
            <div className="bg-slate-900 rounded-lg p-3 max-h-40 overflow-y-auto">
              {detail.env.map((e, i) => (
                <div key={i} className="terminal-text text-slate-300">{e}</div>
              ))}
            </div>
          </div>
        )}

        {detail.mounts.length > 0 && (
          <div className="py-2">
            <div className="text-slate-500 text-sm mb-2">挂载点</div>
            <div className="space-y-1">
              {detail.mounts.map((m, i) => (
                <div key={i} className="text-xs terminal-text text-slate-400">
                  {m.source} → {m.destination} [{m.type}, {m.rw ? 'rw' : 'ro'}]
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── 修改参数模态 ──────────────────────────────────────────────────────────────

function EditModal({ detail, open, onClose, onSave }: {
  detail: DockerContainerDetail | null;
  open: boolean;
  onClose: () => void;
  onSave: (params: DockerUpdateParams) => void;
}) {
  const [envText, setEnvText] = useState('');
  const [restartPolicy, setRestartPolicy] = useState('no');
  const [memLimit, setMemLimit] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (detail) {
      setEnvText(detail.env.join('\n'));
      setRestartPolicy(detail.restartPolicy || 'no');
      setMemLimit(detail.memoryLimit > 0 ? `${(detail.memoryLimit / 1024 / 1024).toFixed(0)}m` : '');
    }
  }, [detail]);

  const handleSave = async () => {
    setSaving(true);
    const envLines = envText.split('\n').map((l) => l.trim()).filter(Boolean);
    onSave({
      env: envLines,
      restartPolicy,
      memoryLimit: memLimit || undefined,
    });
    setSaving(false);
  };

  if (!detail) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`修改参数 · ${detail.name}`}
      width="max-w-xl"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">取消</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving && <Spinner size={14} />}
            保存并重建容器
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-400">
          保存后将停止当前容器、删除并以新参数重新创建（镜像不变）
        </div>

        <div>
          <label className="form-label">环境变量（每行一个 KEY=VALUE）</label>
          <textarea
            className="form-input font-mono text-xs resize-none"
            rows={8}
            value={envText}
            onChange={(e) => setEnvText(e.target.value)}
            placeholder="SPRING_PROFILES_ACTIVE=prod&#10;SERVER_PORT=8080"
          />
        </div>

        <div>
          <label className="form-label">重启策略</label>
          <select
            className="form-input"
            value={restartPolicy}
            onChange={(e) => setRestartPolicy(e.target.value)}
          >
            <option value="no">no（不自动重启）</option>
            <option value="always">always（总是重启）</option>
            <option value="on-failure">on-failure（失败时重启）</option>
            <option value="unless-stopped">unless-stopped（除非主动停止）</option>
          </select>
        </div>

        <div>
          <label className="form-label">内存限制（如 512m、1g，留空不限制）</label>
          <input
            className="form-input"
            value={memLimit}
            onChange={(e) => setMemLimit(e.target.value)}
            placeholder="512m"
          />
        </div>
      </div>
    </Modal>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────────────────────

export default function DockerPage() {
  const { showToast } = useToast();
  const [containers, setContainers] = useState<DockerContainerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [inspectDetail, setInspectDetail] = useState<DockerContainerDetail | null>(null);
  const [editDetail, setEditDetail] = useState<DockerContainerDetail | null>(null);
  const [logContainerId, setLogContainerId] = useState<string | null>(null);

  const setIdLoading = (id: string, val: boolean) =>
    setLoadingIds((prev) => {
      const next = new Set(prev);
      val ? next.add(id) : next.delete(id);
      return next;
    });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setContainers(await dockerApi.listContainers());
    } catch (e: any) {
      showToast('error', `获取容器列表失败：${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { refresh(); }, []);

  const act = async (id: string, label: string, fn: () => Promise<unknown>) => {
    setIdLoading(id, true);
    try {
      await fn();
      showToast('success', label + ' 成功');
      await refresh();
    } catch (e: any) {
      showToast('error', `${label}失败：${e.message}`);
    } finally {
      setIdLoading(id, false);
    }
  };

  const openInspect = async (id: string) => {
    try {
      const detail = await dockerApi.inspectContainer(id);
      setInspectDetail(detail);
    } catch (e: any) {
      showToast('error', `获取详情失败：${e.message}`);
    }
  };

  const openEdit = async (id: string) => {
    try {
      const detail = await dockerApi.inspectContainer(id);
      setEditDetail(detail);
    } catch (e: any) {
      showToast('error', `获取配置失败：${e.message}`);
    }
  };

  const handleSaveEdit = async (params: DockerUpdateParams) => {
    if (!editDetail) return;
    setIdLoading(editDetail.id, true);
    try {
      await dockerApi.update(editDetail.id, params);
      showToast('success', '容器已重建');
      setEditDetail(null);
      await refresh();
    } catch (e: any) {
      showToast('error', `重建失败：${e.message}`);
    } finally {
      setIdLoading(editDetail.id, false);
    }
  };

  const filtered = containers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.image.toLowerCase().includes(search.toLowerCase())
  );

  const logContainer = containers.find((c) => c.id === logContainerId);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Docker 容器"
        subtitle={`共 ${containers.length} 个容器，${containers.filter((c) => c.state === 'running').length} 个运行中`}
        onRefresh={refresh}
        loading={loading}
      />

      <div className="p-6 flex flex-col gap-4 flex-1">
        {/* 搜索 */}
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="form-input pl-8 py-1.5"
            placeholder="搜索容器名或镜像..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* 容器卡片 */}
        {loading ? (
          <PageLoader text="加载容器列表..." />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Container size={48} className="mb-3 opacity-20" />
            <div className="text-sm">{search ? '未找到匹配的容器' : '未检测到 Docker 容器'}</div>
            {!search && <div className="text-xs mt-1">请确认 Docker 已运行且当前用户有权限</div>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filtered.map((c) => (
              <DockerCard
                key={c.id}
                container={c}
                loading={loadingIds.has(c.id)}
                onStart={() => act(c.id, '启动', () => dockerApi.start(c.id))}
                onStop={() => act(c.id, '停止', () => dockerApi.stop(c.id))}
                onRestart={() => act(c.id, '重启', () => dockerApi.restart(c.id))}
                onLogs={() => setLogContainerId(c.id)}
                onInspect={() => openInspect(c.id)}
                onEdit={() => openEdit(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 详情模态 */}
      <InspectModal
        detail={inspectDetail}
        open={!!inspectDetail}
        onClose={() => setInspectDetail(null)}
      />

      {/* 修改参数模态 */}
      <EditModal
        detail={editDetail}
        open={!!editDetail}
        onClose={() => setEditDetail(null)}
        onSave={handleSaveEdit}
      />

      {/* 日志流 */}
      <LogViewer
        title={`日志 · ${logContainer?.name ?? ''}`}
        open={!!logContainerId}
        onClose={() => setLogContainerId(null)}
        streamUrl={logContainerId ? `/api/docker/containers/${logContainerId}/logs/stream` : undefined}
      />
    </div>
  );
}
