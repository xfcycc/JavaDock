/**
 * 自定义脚本执行页面
 * @author caiguoyu
 * @date 2026/3/10
 * 功能：展示自定义脚本列表，支持一键执行并实时查看输出
 */
import React, { useEffect, useState, useRef } from 'react';
import { Play, Terminal, Plus, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { settingsApi } from '../api/client';
import { CustomScript } from '../../../src/shared/types';
import PageHeader from '../components/PageHeader';
import { PageLoader } from '../components/Spinner';
import { useToast } from '../App';

interface OutputLine {
  type: 'stdout' | 'stderr' | 'info' | 'done' | 'error';
  text?: string;
  exitCode?: number;
}

export default function ScriptsPage() {
  const { showToast } = useToast();
  const [scripts, setScripts] = useState<CustomScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [outputLines, setOutputLines] = useState<OutputLine[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const cfg = await settingsApi.getConfig();
      setScripts(cfg.customScripts);
    } catch (e: any) {
      showToast('error', `加载脚本失败：${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const scrollBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const runScript = (id: string) => {
    if (runningId) return;

    sourceRef.current?.close();
    setSelectedId(id);
    setRunningId(id);
    setOutputLines([]);

    const source = new EventSource(`/api/scripts/${id}/run`);
    sourceRef.current = source;

    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as OutputLine;
        if (data.type === 'done') {
          setRunningId(null);
          source.close();
          const ok = data.exitCode === 0;
          showToast(ok ? 'success' : 'error', ok ? '脚本执行完成' : `脚本执行失败（exit ${data.exitCode}）`);
        }
        setOutputLines((prev) => [...prev, data]);
        scrollBottom();
      } catch {
        setOutputLines((prev) => [...prev, { type: 'stdout', text: e.data }]);
        scrollBottom();
      }
    };

    source.onerror = () => {
      setRunningId(null);
      source.close();
    };
  };

  const selectedScript = scripts.find((s) => s.id === selectedId);

  function getLineStyle(type: OutputLine['type']): string {
    if (type === 'stderr') return 'text-red-400';
    if (type === 'info') return 'text-blue-300';
    if (type === 'done') return 'text-green-400 font-medium';
    if (type === 'error') return 'text-red-500';
    return 'text-slate-300';
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="自定义脚本"
        subtitle={`共 ${scripts.length} 个脚本`}
        onRefresh={refresh}
        loading={loading}
        actions={
          <Link to="/settings" className="btn-secondary text-xs">
            <Settings size={13} />
            管理脚本
          </Link>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧脚本列表 */}
        <div className="w-72 shrink-0 border-r border-slate-800 flex flex-col">
          <div className="px-4 py-3 text-xs text-slate-500 font-medium border-b border-slate-800">
            脚本列表
          </div>

          {loading ? (
            <PageLoader text="加载脚本..." />
          ) : scripts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-4 text-center">
              <Terminal size={32} className="mb-2 opacity-30" />
              <div className="text-sm">尚无脚本</div>
              <Link to="/settings" className="btn-primary mt-3 text-xs">
                <Plus size={13} />
                添加脚本
              </Link>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {scripts.map((script) => (
                <div
                  key={script.id}
                  onClick={() => setSelectedId(script.id)}
                  className={`px-4 py-3 cursor-pointer border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors ${
                    selectedId === script.id ? 'bg-brand-600/10 border-l-2 border-l-brand-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{script.name}</div>
                      {script.description && (
                        <div className="text-xs text-slate-500 mt-0.5 truncate">{script.description}</div>
                      )}
                      <div className="text-xs text-slate-600 font-mono mt-0.5 truncate">{script.command}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); runScript(script.id); }}
                      disabled={!!runningId}
                      className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                        runningId === script.id
                          ? 'text-green-400 bg-green-400/10 animate-pulse'
                          : 'text-slate-400 hover:text-green-400 hover:bg-green-400/10'
                      }`}
                      title="执行脚本"
                    >
                      <Play size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧输出终端 */}
        <div className="flex-1 flex flex-col bg-[#0d1117]">
          {/* 终端标题 */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800/50 shrink-0">
            <Terminal size={14} className="text-slate-500" />
            <span className="text-xs text-slate-400 font-mono">
              {selectedScript ? selectedScript.command : '请选择并执行脚本'}
            </span>
            {runningId && (
              <span className="ml-auto text-xs text-green-400 flex items-center gap-1">
                <span className="status-dot-running" />
                执行中
              </span>
            )}
          </div>

          {/* 输出内容 */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {outputLines.length === 0 ? (
              <div className="terminal-text text-slate-700 mt-4">
                {selectedScript
                  ? `按下 ▶ 执行: ${selectedScript.command}`
                  : '在左侧选择一个脚本并点击 ▶ 执行'}
              </div>
            ) : (
              outputLines.map((line, i) => (
                <div key={i} className={`terminal-text whitespace-pre-wrap break-all ${getLineStyle(line.type)}`}>
                  {line.type === 'done'
                    ? `\n[完成] exit code: ${line.exitCode}`
                    : line.text}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
