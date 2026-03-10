/**
 * Java 服务卡片
 * @author caiguoyu
 * @date 2026/3/10
 * 展示 Java 服务状态，提供启停/重启/编译/日志操作
 */
import React from 'react';
import {
  Play, Square, RefreshCw, Terminal, Hammer,
  MapPin, Clock, Cpu, FolderOpen,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { JavaServiceStatus } from '../../../src/shared/types';

interface Props {
  service: JavaServiceStatus;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onBuild: () => void;
  onLogs: () => void;
  loading?: boolean;
}

export default function JavaCard({
  service, onStart, onStop, onRestart, onBuild, onLogs, loading,
}: Props) {
  const isRunning = service.state === 'running';
  const isBuilding = service.state === 'building';
  const isStarting = service.state === 'starting';

  return (
    <div className={`card p-5 flex flex-col gap-3 hover:border-slate-600 transition-all duration-200 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* 标题 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-white font-semibold text-sm">{service.name}</h3>
          {service.description && (
            <p className="text-slate-500 text-xs mt-0.5 truncate">{service.description}</p>
          )}
        </div>
        <StatusBadge status={service.state} />
      </div>

      {/* 元数据行 */}
      <div className="grid grid-cols-2 gap-2">
        {service.port && (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <MapPin size={11} className="text-slate-500 shrink-0" />
            <span>:{service.port}</span>
          </div>
        )}

        {service.memUsage && (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Cpu size={11} className="text-slate-500 shrink-0" />
            <span>{service.memUsage}</span>
          </div>
        )}

        {service.uptime && isRunning && (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Clock size={11} className="text-slate-500 shrink-0" />
            <span>已运行 {service.uptime}</span>
          </div>
        )}

        {service.cwd && (
          <div className="flex items-center gap-1.5 text-slate-500 text-xs col-span-2 truncate">
            <FolderOpen size={11} className="shrink-0" />
            <span className="truncate font-mono">{service.cwd}</span>
          </div>
        )}
      </div>

      {/* 上次构建状态 */}
      {service.lastBuilt && (
        <div className="text-xs text-slate-600 flex items-center gap-1">
          <Hammer size={10} />
          上次构建：
          <span className={service.lastBuildStatus === 'failed' ? 'text-red-500' : 'text-green-500'}>
            {service.lastBuildStatus === 'failed' ? '失败' : '成功'}
          </span>
          <span className="text-slate-700">· {new Date(service.lastBuilt).toLocaleString()}</span>
        </div>
      )}

      {/* 操作 */}
      <div className="flex items-center gap-1 pt-2 border-t border-slate-700/50">
        {isRunning ? (
          <>
            <button onClick={onStop} className="action-btn text-red-400 hover:bg-red-400/10" title="停止">
              <Square size={14} />
            </button>
            <button onClick={onRestart} className="action-btn text-yellow-400 hover:bg-yellow-400/10" title="重启">
              <RefreshCw size={14} />
            </button>
          </>
        ) : (
          <button
            onClick={onStart}
            className="action-btn text-green-400 hover:bg-green-400/10"
            title="启动"
            disabled={isBuilding || isStarting}
          >
            <Play size={14} />
          </button>
        )}

        <div className="flex-1" />

        <button
          onClick={onBuild}
          className={`action-btn ${isBuilding ? 'text-blue-400 animate-pulse' : 'text-slate-400 hover:text-blue-400 hover:bg-blue-400/10'}`}
          title="Maven 编译"
          disabled={isBuilding}
        >
          <Hammer size={14} />
        </button>

        <button
          onClick={onLogs}
          className="action-btn text-slate-400 hover:text-purple-400 hover:bg-purple-400/10"
          title="查看日志"
        >
          <Terminal size={14} />
        </button>
      </div>
    </div>
  );
}
