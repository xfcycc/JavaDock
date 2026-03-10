/**
 * Docker 容器卡片
 * @author caiguoyu
 * @date 2026/3/10
 * 展示容器基本信息，提供启停/重启/日志/详情/编辑操作
 */
import React, { useState } from 'react';
import {
  Play, Square, RefreshCw, Terminal, Eye, Settings2,
  Package, Clock, Network,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { DockerContainerSummary } from '../../../src/shared/types';

interface Props {
  container: DockerContainerSummary;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onLogs: () => void;
  onInspect: () => void;
  onEdit: () => void;
  loading?: boolean;
}

export default function DockerCard({
  container, onStart, onStop, onRestart, onLogs, onInspect, onEdit, loading,
}: Props) {
  const isRunning = container.state === 'running';
  const isRestarting = container.state === 'restarting';

  return (
    <div className={`card p-5 flex flex-col gap-3 hover:border-slate-400 dark:hover:border-slate-600 transition-all duration-200 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* 标题行 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-slate-900 dark:text-white font-semibold text-sm truncate">{container.name}</h3>
          <p className="text-slate-500 text-xs mt-0.5 font-mono truncate flex items-center gap-1">
            <Package size={11} className="shrink-0" />
            {container.image}
          </p>
        </div>
        <StatusBadge status={container.state} />
      </div>

      {/* 状态描述 */}
      <div className="flex items-center gap-1 text-slate-500 text-xs">
        <Clock size={11} />
        <span className="truncate">{container.status}</span>
      </div>

      {/* 端口映射 */}
      {container.ports.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {container.ports.slice(0, 4).map((port, i) => (
            <span
              key={i}
              className="bg-slate-200 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs px-2 py-0.5 rounded-md font-mono border border-slate-300 dark:border-slate-700"
            >
              {port.publicPort ? `${port.publicPort}→${port.privatePort}` : port.privatePort}/{port.type}
            </span>
          ))}
          {container.ports.length > 4 && (
            <span className="text-slate-500 text-xs px-1">+{container.ports.length - 4}</span>
          )}
        </div>
      )}

      {/* 网络 */}
      {container.networks.length > 0 && (
        <div className="flex items-center gap-1 text-slate-600 text-xs">
          <Network size={11} />
          <span className="truncate">{container.networks.join(', ')}</span>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 pt-2 border-t border-slate-200 dark:border-slate-700/50">
        {isRunning || isRestarting ? (
          <>
            <button
              onClick={onStop}
              className="action-btn text-red-400 hover:bg-red-400/10"
              title="停止"
            >
              <Square size={14} />
            </button>
            <button
              onClick={onRestart}
              className="action-btn text-yellow-400 hover:bg-yellow-400/10"
              title="重启"
            >
              <RefreshCw size={14} />
            </button>
          </>
        ) : (
          <button
            onClick={onStart}
            className="action-btn text-green-400 hover:bg-green-400/10"
            title="启动"
          >
            <Play size={14} />
          </button>
        )}

        <div className="flex-1" />

        <button
          onClick={onLogs}
          className="action-btn text-slate-400 hover:text-blue-400 hover:bg-blue-400/10"
          title="查看日志"
        >
          <Terminal size={14} />
        </button>
        <button
          onClick={onInspect}
          className="action-btn text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
          title="详情"
        >
          <Eye size={14} />
        </button>
        <button
          onClick={onEdit}
          className="action-btn text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
          title="修改参数"
        >
          <Settings2 size={14} />
        </button>
      </div>
    </div>
  );
}
