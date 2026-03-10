/**
 * Toast 通知组件
 * @author caiguoyu
 * @date 2026/3/10
 */
import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../App';

interface Props {
  toast: ToastMessage;
  onClose: () => void;
}

const ICONS = {
  success: <CheckCircle size={16} className="text-green-400 shrink-0" />,
  error: <XCircle size={16} className="text-red-400 shrink-0" />,
  info: <Info size={16} className="text-blue-400 shrink-0" />,
};

const STYLES = {
  success: 'border-green-500/30 bg-green-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  info: 'border-blue-500/30 bg-blue-500/10',
};

export default function Toast({ toast, onClose }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border 
        bg-white dark:bg-slate-900 ${STYLES[toast.type]} backdrop-blur-sm shadow-xl
        transition-all duration-300 max-w-xs
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      {ICONS[toast.type]}
      <span className="text-sm text-slate-800 dark:text-slate-200 flex-1">{toast.message}</span>
      <button
        onClick={onClose}
        className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors ml-1"
      >
        <X size={14} />
      </button>
    </div>
  );
}
