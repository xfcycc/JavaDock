/**
 * 总览页面：展示 Docker 容器与 Java 服务的摘要统计
 * @author caiguoyu
 * @date 2026/3/10
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Coffee, Activity, Server, ArrowRight, RefreshCw } from 'lucide-react';
import { dockerApi, javaApi } from '../api/client';
import { DockerContainerSummary, JavaServiceStatus } from '../../../src/shared/types';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  color: string;
}

function StatCard({ icon, label, value, sub, color }: StatCardProps) {
  return (
    <div className={`card p-5 flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
        <div className="text-slate-500 dark:text-slate-400 text-sm">{label}</div>
        {sub && <div className="text-slate-600 text-xs mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [containers, setContainers] = useState<DockerContainerSummary[]>([]);
  const [services, setServices] = useState<JavaServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.allSettled([
        dockerApi.listContainers(),
        javaApi.listServices(),
      ]);
      if (c.status === 'fulfilled') setContainers(c.value);
      if (s.status === 'fulfilled') setServices(s.value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runningContainers = containers.filter((c) => c.state === 'running');
  const stoppedContainers = containers.filter((c) => c.state !== 'running');
  const runningServices = services.filter((s) => s.state === 'running');

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">总览</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date().toLocaleString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary">
          {loading ? <Spinner size={14} /> : <RefreshCw size={14} />}
          刷新
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Container size={22} className="text-blue-400" />}
          label="容器总计"
          value={containers.length}
          sub={`${runningContainers.length} 运行中`}
          color="bg-blue-500/10"
        />
        <StatCard
          icon={<Activity size={22} className="text-green-400" />}
          label="运行中容器"
          value={runningContainers.length}
          color="bg-green-500/10"
        />
        <StatCard
          icon={<Coffee size={22} className="text-orange-400" />}
          label="Java 服务"
          value={services.length}
          sub={`${runningServices.length} 运行中`}
          color="bg-orange-500/10"
        />
        <StatCard
          icon={<Server size={22} className="text-purple-400" />}
          label="已停止容器"
          value={stoppedContainers.length}
          color="bg-purple-500/10"
        />
      </div>

      {/* 最近容器 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Docker 容器</h2>
          <Link to="/docker" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
            查看全部 <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="card p-8 flex justify-center"><Spinner text="加载容器列表..." /></div>
        ) : containers.length === 0 ? (
          <div className="card p-8 text-center text-slate-500 text-sm">
            <Container size={32} className="mx-auto mb-2 opacity-30" />
            未检测到 Docker 容器，请确认 Docker 已运行
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/50">
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">名称</th>
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">镜像</th>
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">端口</th>
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">状态</th>
                </tr>
              </thead>
              <tbody>
                {containers.slice(0, 8).map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 text-slate-900 dark:text-white font-medium">{c.name}</td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 font-mono text-xs truncate max-w-[180px]">{c.image}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 flex-wrap">
                        {c.ports.slice(0, 2).map((p, i) => (
                          <span key={i} className="bg-slate-200 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs px-1.5 py-0.5 rounded font-mono">
                            {p.publicPort ? `${p.publicPort}:${p.privatePort}` : p.privatePort}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={c.state} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Java 服务 */}
      {services.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Java 服务</h2>
            <Link to="/java" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              查看全部 <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {services.slice(0, 6).map((svc) => (
              <div key={svc.id} className="card px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{svc.name}</div>
                  {svc.port && (
                    <div className="text-xs text-slate-500 font-mono mt-0.5">:{svc.port}</div>
                  )}
                </div>
                <StatusBadge status={svc.state} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
