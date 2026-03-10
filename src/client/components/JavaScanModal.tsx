/**
 * Java 进程扫描弹窗
 * @author caiguoyu
 * @date 2026/3/10
 * 扫描本机所有 Java 进程，识别 SpringBoot 服务，支持勾选后一键导入
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  X, ScanLine, Coffee, CheckCircle2, AlertCircle,
  FolderOpen, MapPin, Loader2, Download,
} from 'lucide-react';
import { javaApi, settingsApi } from '../api/client';
import { JavaScannedProcess } from '../../../src/shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export default function JavaScanModal({ open, onClose, onImported }: Props) {
  const [scanning, setScanning] = useState(false);
  const [processes, setProcesses] = useState<JavaScannedProcess[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<Record<number, 'ok' | 'err'>>({});

  const scan = useCallback(async () => {
    setScanning(true);
    setError(null);
    setProcesses([]);
    setSelected(new Set());
    setImportResults({});
    try {
      const result = await javaApi.scan();
      setProcesses(result);
      // 默认勾选所有 SpringBoot 且未导入的进程
      const defaultSelected = new Set(
        result
          .filter((p) => p.isSpringBoot && !p.alreadyImported)
          .map((p) => p.pid)
      );
      setSelected(defaultSelected);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    if (open) scan();
  }, [open]);

  const toggle = (pid: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  };

  const handleImport = async () => {
    const toImport = processes.filter((p) => selected.has(p.pid) && !p.alreadyImported);
    if (toImport.length === 0) return;

    setImporting(true);
    const results: Record<number, 'ok' | 'err'> = {};

    for (const proc of toImport) {
      try {
        await settingsApi.addJavaService({
          name: proc.suggestedName,
          cwd: proc.cwd || '',
          port: proc.port,
          description: proc.isSpringBoot ? 'SpringBoot 服务（自动导入）' : 'Java 服务（自动导入）',
        });
        results[proc.pid] = 'ok';
      } catch {
        results[proc.pid] = 'err';
      }
    }

    setImportResults(results);
    setImporting(false);

    // 刷新进程列表（更新已导入标记）
    const successCount = Object.values(results).filter((r) => r === 'ok').length;
    if (successCount > 0) onImported();
    await scan();
  };

  if (!open) return null;

  const canImportCount = processes.filter((p) => selected.has(p.pid) && !p.alreadyImported).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh]">

        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <ScanLine size={18} className="text-blue-500" />
            <span className="font-semibold text-slate-900 dark:text-white">扫描本机 Java 进程</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={scan}
              disabled={scanning}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {scanning ? <Loader2 size={12} className="animate-spin" /> : <ScanLine size={12} />}
              重新扫描
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-5">
          {scanning ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <span className="text-sm">正在扫描本机 Java 进程...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-red-500">
              <AlertCircle size={32} />
              <span className="text-sm">扫描失败：{error}</span>
            </div>
          ) : processes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
              <Coffee size={40} className="opacity-30" />
              <span className="text-sm">未发现正在运行的 Java 进程</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-slate-500 mb-1">
                发现 {processes.length} 个 Java 进程
                {processes.filter((p) => p.isSpringBoot).length > 0 && (
                  <span className="ml-1 text-blue-500">
                    （其中 {processes.filter((p) => p.isSpringBoot).length} 个识别为 SpringBoot）
                  </span>
                )}
              </div>

              {processes.map((proc) => {
                const isChecked = selected.has(proc.pid);
                const resultStatus = importResults[proc.pid];

                return (
                  <div
                    key={proc.pid}
                    onClick={() => !proc.alreadyImported && toggle(proc.pid)}
                    className={`
                      flex items-start gap-3 p-3 rounded-lg border transition-all
                      ${proc.alreadyImported
                        ? 'border-slate-200 dark:border-slate-700 opacity-60 cursor-default'
                        : isChecked
                          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 cursor-pointer'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer'
                      }
                    `}
                  >
                    {/* 复选框区域 */}
                    <div className="mt-0.5 shrink-0">
                      {proc.alreadyImported ? (
                        <CheckCircle2 size={16} className="text-green-500" />
                      ) : (
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {isChecked && <div className="w-2 h-2 bg-white rounded-sm" />}
                        </div>
                      )}
                    </div>

                    {/* 进程信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-slate-900 dark:text-white">
                          {proc.suggestedName}
                        </span>
                        {proc.isSpringBoot && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                            SpringBoot
                          </span>
                        )}
                        {proc.alreadyImported && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">
                            已导入
                          </span>
                        )}
                        {resultStatus === 'ok' && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600">
                            导入成功
                          </span>
                        )}
                        {resultStatus === 'err' && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600">
                            导入失败
                          </span>
                        )}
                        {!proc.alreadyImported && !proc.cwd && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                            工作目录未知，导入后请编辑补充
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                        <span className="text-xs text-slate-400 font-mono">PID: {proc.pid}</span>
                        {proc.port && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <MapPin size={10} />:{proc.port}
                          </span>
                        )}
                        {proc.cwd ? (
                          <span className="flex items-center gap-1 text-xs text-slate-400 truncate max-w-[300px]">
                            <FolderOpen size={10} />{proc.cwd}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-amber-500">
                            <FolderOpen size={10} />工作目录未知
                          </span>
                        )}
                      </div>

                      {/* 命令行（截断展示） */}
                      <div className="mt-1.5 text-xs text-slate-400 dark:text-slate-500 font-mono truncate">
                        {proc.commandLine.length > 80
                          ? proc.commandLine.slice(0, 80) + '…'
                          : proc.commandLine}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        {!scanning && processes.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500">
              已选 {canImportCount} 个待导入
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                关闭
              </button>
              <button
                onClick={handleImport}
                disabled={canImportCount === 0 || importing}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {importing
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Download size={14} />
                }
                导入选中（{canImportCount}）
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
