/**
 * Java 服务管理页面
 * @author caiguoyu
 * @date 2026/3/10
 * 功能：服务卡片列表、启停/重启/编译、日志查看（SSE 流）
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Coffee, Plus } from 'lucide-react';
import { javaApi } from '../api/client';
import { JavaServiceStatus } from '../../../src/shared/types';
import JavaCard from '../components/JavaCard';
import LogViewer from '../components/LogViewer';
import PageHeader from '../components/PageHeader';
import { PageLoader } from '../components/Spinner';
import { useToast } from '../App';
import { Link } from 'react-router-dom';

export default function JavaPage() {
  const { showToast } = useToast();
  const [services, setServices] = useState<JavaServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [logServiceId, setLogServiceId] = useState<string | null>(null);
  const [buildLogLines, setBuildLogLines] = useState<string[]>([]);
  const [buildLogOpen, setBuildLogOpen] = useState(false);

  const setIdLoading = (id: string, val: boolean) =>
    setLoadingIds((prev) => {
      const next = new Set(prev);
      val ? next.add(id) : next.delete(id);
      return next;
    });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setServices(await javaApi.listServices());
    } catch (e: any) {
      showToast('error', `获取服务列表失败：${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { refresh(); }, []);

  /** 定时刷新运行状态（每 10 秒） */
  useEffect(() => {
    const timer = setInterval(refresh, 10000);
    return () => clearInterval(timer);
  }, [refresh]);

  const act = async (id: string, label: string, fn: () => Promise<unknown>) => {
    setIdLoading(id, true);
    try {
      await fn();
      showToast('success', label + ' 成功');
      setTimeout(refresh, 1500); // 稍作等待后刷新状态
    } catch (e: any) {
      showToast('error', `${label}失败：${e.message}`);
    } finally {
      setIdLoading(id, false);
    }
  };

  /** 编译：通过 SSE 流实时展示 mvn 输出 */
  const handleBuild = (serviceId: string) => {
    setBuildingId(serviceId);
    setBuildLogLines([]);
    setBuildLogOpen(true);

    const source = new EventSource(`/api/java/services/${serviceId}/build`);
    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'done') {
          setBuildingId(null);
          source.close();
          const success = data.exitCode === 0;
          showToast(success ? 'success' : 'error', success ? '编译成功' : `编译失败（exit ${data.exitCode}）`);
          refresh();
        } else if (data.text) {
          setBuildLogLines((prev) => [...prev, data.text]);
        }
      } catch {
        setBuildLogLines((prev) => [...prev, e.data]);
      }
    };
    source.onerror = () => {
      setBuildingId(null);
      source.close();
    };
  };

  const logService = services.find((s) => s.id === logServiceId);
  const buildingService = services.find((s) => s.id === buildingId);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Java 服务"
        subtitle={`共 ${services.length} 个服务，${services.filter((s) => s.state === 'running').length} 个运行中`}
        onRefresh={refresh}
        loading={loading}
      />

      <div className="p-6 flex flex-col gap-4 flex-1">
        {loading ? (
          <PageLoader text="加载服务列表..." />
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Coffee size={48} className="mb-3 opacity-20" />
            <div className="text-sm">尚未配置 Java 服务</div>
            <div className="text-xs mt-1">请前往设置页面添加服务</div>
            <Link to="/settings" className="btn-primary mt-4 text-sm">
              <Plus size={14} />
              添加服务
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {services.map((svc) => (
              <JavaCard
                key={svc.id}
                service={svc}
                loading={loadingIds.has(svc.id)}
                onStart={() => act(svc.id, '启动', () => javaApi.start(svc.id))}
                onStop={() => act(svc.id, '停止', () => javaApi.stop(svc.id))}
                onRestart={() => act(svc.id, '重启', () => javaApi.restart(svc.id))}
                onBuild={() => handleBuild(svc.id)}
                onLogs={() => setLogServiceId(svc.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 编译输出日志 */}
      <LogViewer
        title={`编译输出 · ${buildingService?.name ?? ''}`}
        open={buildLogOpen}
        onClose={() => setBuildLogOpen(false)}
        lines={buildLogLines}
      />

      {/* 服务运行日志（SSE 流） */}
      <LogViewer
        title={`服务日志 · ${logService?.name ?? ''}`}
        open={!!logServiceId}
        onClose={() => setLogServiceId(null)}
        streamUrl={logServiceId ? `/api/java/services/${logServiceId}/logs/stream` : undefined}
      />
    </div>
  );
}
