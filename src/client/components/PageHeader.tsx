/**
 * 页面顶部标题栏
 * @author caiguoyu
 * @date 2026/3/10
 */
import React from 'react';
import { RefreshCw } from 'lucide-react';
import Spinner from './Spinner';

interface Props {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  loading?: boolean;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, onRefresh, loading, actions }: Props) {
  return (
    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-slate-900/30">
      <div>
        <h1 className="text-lg font-bold text-white">{title}</h1>
        {subtitle && <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="btn-secondary"
            title="刷新"
          >
            {loading ? (
              <Spinner size={14} />
            ) : (
              <RefreshCw size={14} />
            )}
            刷新
          </button>
        )}
      </div>
    </div>
  );
}
