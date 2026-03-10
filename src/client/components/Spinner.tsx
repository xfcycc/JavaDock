/**
 * 加载指示器
 * @author caiguoyu
 * @date 2026/3/10
 */
import React from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  size?: number;
  className?: string;
  text?: string;
}

export default function Spinner({ size = 16, className = '', text }: Props) {
  return (
    <div className={`flex items-center gap-2 text-slate-500 dark:text-slate-400 ${className}`}>
      <Loader2 size={size} className="animate-spin" />
      {text && <span className="text-sm">{text}</span>}
    </div>
  );
}

/** 全屏加载占位 */
export function PageLoader({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={24} text={text} />
    </div>
  );
}
