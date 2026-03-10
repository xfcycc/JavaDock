/**
 * 日志查看器：支持静态日志行与 SSE 流式日志
 * @author caiguoyu
 * @date 2026/3/10
 */
import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Trash2, PauseCircle, PlayCircle } from 'lucide-react';

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  /** 提供 EventSource URL 来启用流式日志 */
  streamUrl?: string;
  /** 或直接提供静态日志行 */
  lines?: string[];
}

/** 给日志行着色（ANSI 级别简单判断） */
function getLineColor(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes('error') || lower.includes('exception') || lower.includes('fail')) {
    return 'text-red-400';
  }
  if (lower.includes('warn')) return 'text-yellow-400';
  if (lower.includes('info')) return 'text-blue-300';
  if (lower.includes('[build success]') || lower.includes('build success')) return 'text-green-400';
  return 'text-slate-300';
}

export default function LogViewer({ title, open, onClose, streamUrl, lines: staticLines }: Props) {
  const [lines, setLines] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  pausedRef.current = paused;

  /** 自动滚动到底部（未暂停时） */
  const scrollToBottom = () => {
    if (!pausedRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  /* 静态日志 */
  useEffect(() => {
    if (open && staticLines) {
      setLines(staticLines);
      setTimeout(scrollToBottom, 50);
    }
  }, [open, staticLines]);

  /* SSE 流式日志 */
  useEffect(() => {
    if (!open || !streamUrl) return;
    setLines([]);

    const source = new EventSource(streamUrl);
    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.__eof) { source.close(); return; }
        const text = typeof data === 'string' ? data : (data.text ?? JSON.stringify(data));
        setLines((prev) => [...prev, text]);
        scrollToBottom();
      } catch {
        setLines((prev) => [...prev, e.data]);
        scrollToBottom();
      }
    };
    source.onerror = () => source.close();

    return () => source.close();
  }, [open, streamUrl]);

  /* 下载日志 */
  const downloadLogs = () => {
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end">
      {/* 半透明遮罩 */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* 日志侧边栏 */}
      <div className="w-full max-w-3xl bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
          <div>
            <div className="text-sm font-semibold text-white">{title}</div>
            <div className="text-xs text-slate-500 mt-0.5">{lines.length} 行</div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPaused(!paused)}
              className="action-btn text-slate-400 hover:text-slate-200"
              title={paused ? '继续自动滚动' : '暂停自动滚动'}
            >
              {paused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
            </button>
            <button
              onClick={() => setLines([])}
              className="action-btn text-slate-400 hover:text-slate-200"
              title="清空"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={downloadLogs}
              className="action-btn text-slate-400 hover:text-slate-200"
              title="下载日志"
            >
              <Download size={16} />
            </button>
            <button
              onClick={onClose}
              className="action-btn text-slate-400 hover:text-slate-200"
              title="关闭"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 日志内容 */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto bg-[#0d1117] px-4 py-3"
        >
          {lines.length === 0 ? (
            <div className="text-slate-600 terminal-text">（暂无日志）</div>
          ) : (
            lines.map((line, i) => (
              <div key={i} className={`terminal-text whitespace-pre-wrap break-all ${getLineColor(line)}`}>
                {line}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
