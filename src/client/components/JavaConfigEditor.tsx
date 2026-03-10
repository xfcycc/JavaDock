/**
 * SpringBoot 配置文件编辑器
 * @author caiguoyu
 * @date 2026/3/10
 * 扫描服务目录下的 application.* 配置文件，支持标签页切换、编辑、保存
 * 写入前自动备份（后端创建 .bak 文件）
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  X, FileCode2, Save, Loader2, AlertCircle,
  RotateCcw, ShieldCheck, FileText,
} from 'lucide-react';
import { javaApi } from '../api/client';
import { JavaConfigFile, JavaServiceStatus } from '../../../src/shared/types';

interface Props {
  service: JavaServiceStatus;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface FileState {
  original: string;
  current: string;
  loading: boolean;
  saving: boolean;
  error: string | null;
  saved: boolean;
}

export default function JavaConfigEditor({ service, open, onClose, onSaved }: Props) {
  const [configFiles, setConfigFiles] = useState<JavaConfigFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [fileStates, setFileStates] = useState<Record<string, FileState>>({});
  const [filesError, setFilesError] = useState<string | null>(null);

  /** 加载配置文件列表 */
  const loadFiles = useCallback(async () => {
    setLoadingFiles(true);
    setFilesError(null);
    try {
      const files = await javaApi.listConfigFiles(service.id);
      setConfigFiles(files);
      if (files.length > 0) {
        setActiveTab(files[0].path);
      }
    } catch (e: any) {
      setFilesError(e.message);
    } finally {
      setLoadingFiles(false);
    }
  }, [service.id]);

  useEffect(() => {
    if (open) {
      loadFiles();
      setFileStates({});
    }
  }, [open, loadFiles]);

  /** 加载单个配置文件内容 */
  const loadFileContent = useCallback(async (filePath: string) => {
    if (fileStates[filePath]) return; // 已加载过，不重复请求

    setFileStates((prev) => ({
      ...prev,
      [filePath]: { original: '', current: '', loading: true, saving: false, error: null, saved: false },
    }));

    try {
      const { content } = await javaApi.getConfigFile(service.id, filePath);
      setFileStates((prev) => ({
        ...prev,
        [filePath]: { original: content, current: content, loading: false, saving: false, error: null, saved: false },
      }));
    } catch (e: any) {
      setFileStates((prev) => ({
        ...prev,
        [filePath]: { original: '', current: '', loading: false, saving: false, error: e.message, saved: false },
      }));
    }
  }, [service.id, fileStates]);

  /** 切换标签页时懒加载文件内容 */
  useEffect(() => {
    if (activeTab) loadFileContent(activeTab);
  }, [activeTab]);

  const updateContent = (filePath: string, value: string) => {
    setFileStates((prev) => ({
      ...prev,
      [filePath]: { ...prev[filePath], current: value, saved: false },
    }));
  };

  const resetContent = (filePath: string) => {
    setFileStates((prev) => ({
      ...prev,
      [filePath]: { ...prev[filePath], current: prev[filePath].original, saved: false },
    }));
  };

  const saveFile = async (filePath: string) => {
    const state = fileStates[filePath];
    if (!state || state.saving) return;

    setFileStates((prev) => ({
      ...prev,
      [filePath]: { ...prev[filePath], saving: true, error: null },
    }));

    try {
      await javaApi.updateConfigFile(service.id, filePath, state.current);
      setFileStates((prev) => ({
        ...prev,
        [filePath]: { ...prev[filePath], original: state.current, saving: false, saved: true },
      }));
      onSaved?.();
      // 3 秒后清除保存成功状态
      setTimeout(() => {
        setFileStates((prev) => ({
          ...prev,
          [filePath]: { ...prev[filePath], saved: false },
        }));
      }, 3000);
    } catch (e: any) {
      setFileStates((prev) => ({
        ...prev,
        [filePath]: { ...prev[filePath], saving: false, error: e.message },
      }));
    }
  };

  if (!open) return null;

  const activeState = activeTab ? fileStates[activeTab] : null;
  const isDirty = activeState ? activeState.current !== activeState.original : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col" style={{ height: '85vh' }}>

        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <FileCode2 size={18} className="text-amber-500" />
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">配置文件</span>
              <span className="text-slate-400 text-sm ml-2">· {service.name}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 文件标签页 */}
        {!loadingFiles && configFiles.length > 0 && (
          <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-200 dark:border-slate-700 overflow-x-auto shrink-0">
            {configFiles.map((file) => {
              const fstate = fileStates[file.path];
              const dirty = fstate && fstate.current !== fstate.original;
              const isActive = activeTab === file.path;

              return (
                <button
                  key={file.path}
                  onClick={() => setActiveTab(file.path)}
                  className={`
                    flex items-center gap-1.5 px-3 py-2 text-xs rounded-t-lg whitespace-nowrap border-b-2 transition-all
                    ${isActive
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }
                  `}
                >
                  <FileText size={11} />
                  {file.name}
                  {dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* 编辑区域 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loadingFiles ? (
            <div className="flex items-center justify-center h-full text-slate-500 gap-2">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">加载配置文件列表...</span>
            </div>
          ) : filesError ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-red-500">
              <AlertCircle size={32} />
              <span className="text-sm">加载失败：{filesError}</span>
            </div>
          ) : configFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
              <FileCode2 size={40} className="opacity-30" />
              <span className="text-sm">未找到配置文件</span>
              <span className="text-xs text-slate-400">请确认服务目录下存在 application.properties 或 application.yml</span>
            </div>
          ) : activeState?.loading ? (
            <div className="flex items-center justify-center h-full text-slate-500 gap-2">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">加载文件内容...</span>
            </div>
          ) : activeState?.error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-red-500">
              <AlertCircle size={32} />
              <span className="text-sm">读取失败：{activeState.error}</span>
            </div>
          ) : activeTab && activeState ? (
            <textarea
              value={activeState.current}
              onChange={(e) => updateContent(activeTab, e.target.value)}
              spellCheck={false}
              className="flex-1 w-full p-4 font-mono text-xs leading-relaxed resize-none bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none border-0"
              style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace" }}
            />
          ) : null}
        </div>

        {/* 底部工具栏 */}
        {activeTab && activeState && !activeState.loading && !activeState.error && (
          <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <ShieldCheck size={12} className="text-green-500" />
              <span>保存时自动创建 .bak 备份</span>
              {isDirty && (
                <span className="text-amber-500">· 有未保存的更改</span>
              )}
              {activeState.saved && (
                <span className="text-green-500">· 已保存</span>
              )}
              {activeState.error && (
                <span className="text-red-500">· {activeState.error}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isDirty && (
                <button
                  onClick={() => resetContent(activeTab)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  <RotateCcw size={12} />
                  重置
                </button>
              )}
              <button
                onClick={() => saveFile(activeTab)}
                disabled={!isDirty || activeState.saving}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {activeState.saving
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Save size={12} />
                }
                保存
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
