/**
 * 状态徽章：容器/服务的运行状态展示
 * @author caiguoyu
 * @date 2026/3/10
 */
import React from 'react';

type Status = 'running' | 'exited' | 'stopped' | 'paused' | 'restarting' |
              'building' | 'starting' | 'error' | 'dead' | 'created';

interface Props {
  status: Status | string;
  size?: 'sm' | 'md';
}

const CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  running: {
    label: '运行中',
    dot: 'status-dot-running',
    bg: 'bg-green-500/10 border-green-500/30',
    text: 'text-green-400',
  },
  starting: {
    label: '启动中',
    dot: 'bg-yellow-500 animate-pulse',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    text: 'text-yellow-400',
  },
  building: {
    label: '编译中',
    dot: 'bg-blue-500 animate-pulse',
    bg: 'bg-blue-500/10 border-blue-500/30',
    text: 'text-blue-400',
  },
  restarting: {
    label: '重启中',
    dot: 'bg-yellow-500 animate-pulse',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    text: 'text-yellow-400',
  },
  paused: {
    label: '已暂停',
    dot: 'bg-orange-500',
    bg: 'bg-orange-500/10 border-orange-500/30',
    text: 'text-orange-400',
  },
  exited: {
    label: '已退出',
    dot: 'bg-slate-500',
    bg: 'bg-slate-700/50 border-slate-600/50',
    text: 'text-slate-400',
  },
  stopped: {
    label: '已停止',
    dot: 'bg-slate-500',
    bg: 'bg-slate-700/50 border-slate-600/50',
    text: 'text-slate-400',
  },
  error: {
    label: '错误',
    dot: 'bg-red-500',
    bg: 'bg-red-500/10 border-red-500/30',
    text: 'text-red-400',
  },
  dead: {
    label: '异常',
    dot: 'bg-red-600',
    bg: 'bg-red-600/10 border-red-600/30',
    text: 'text-red-500',
  },
  created: {
    label: '已创建',
    dot: 'bg-slate-600',
    bg: 'bg-slate-700/50 border-slate-600/50',
    text: 'text-slate-500',
  },
};

const DEFAULT_CONFIG = {
  label: '未知',
  dot: 'bg-slate-600',
  bg: 'bg-slate-700/50 border-slate-600/50',
  text: 'text-slate-400',
};

export default function StatusBadge({ status, size = 'sm' }: Props) {
  const cfg = CONFIG[status] ?? DEFAULT_CONFIG;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
