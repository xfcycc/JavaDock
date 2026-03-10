/**
 * Java 服务快速编辑/删除弹窗
 * @author caiguoyu
 * @date 2026/3/10
 * 在 JavaPage 直接编辑服务配置（名称、目录、端口、命令等），
 * 调用单条 CRUD 接口，无需跳转到设置页面
 */
import React, { useEffect, useState } from 'react';
import {
  X, Settings2, Save, Trash2, Loader2, AlertTriangle,
} from 'lucide-react';
import { settingsApi } from '../api/client';
import { JavaService, JavaServiceStatus } from '../../../src/shared/types';

interface Props {
  service: JavaServiceStatus | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

type FormData = Omit<JavaService, 'id'>;

const EMPTY_FORM: FormData = {
  name: '',
  cwd: '',
  description: '',
  port: undefined,
  logPath: '',
  startCommand: '',
  buildCommand: '',
  javaHome: '',
};

export default function JavaServiceEditModal({ service, open, onClose, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (service && open) {
      setForm({
        name: service.name,
        cwd: service.cwd,
        description: service.description ?? '',
        port: service.port,
        logPath: service.logPath ?? '',
        startCommand: service.startCommand ?? '',
        buildCommand: service.buildCommand ?? '',
        javaHome: service.javaHome ?? '',
      });
      setError(null);
      setConfirmDelete(false);
    }
  }, [service, open]);

  const set = (key: keyof FormData, value: string | number | undefined) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!service) return;
    if (!form.name.trim() || !form.cwd.trim()) {
      setError('服务名称和工作目录不能为空');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await settingsApi.updateJavaService(service.id, {
        ...form,
        port: form.port ? Number(form.port) : undefined,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!service) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await settingsApi.deleteJavaService(service.id);
      onDeleted();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!open || !service) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">

        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <Settings2 size={18} className="text-slate-500" />
            <span className="font-semibold text-slate-900 dark:text-white">编辑服务</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-4">

            {/* 基本信息 */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">基本信息</h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-xs text-slate-500">服务名称 *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="my-service"
                    className="input-field text-sm"
                  />
                </div>

                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-xs text-slate-500">工作目录 *</label>
                  <input
                    type="text"
                    value={form.cwd}
                    onChange={(e) => set('cwd', e.target.value)}
                    placeholder="/path/to/project"
                    className="input-field text-sm font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">端口</label>
                  <input
                    type="number"
                    value={form.port ?? ''}
                    onChange={(e) => set('port', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="8080"
                    className="input-field text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">描述</label>
                  <input
                    type="text"
                    value={form.description ?? ''}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="服务描述"
                    className="input-field text-sm"
                  />
                </div>
              </div>
            </div>

            {/* 命令配置 */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">命令配置</h4>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">启动命令</label>
                <input
                  type="text"
                  value={form.startCommand ?? ''}
                  onChange={(e) => set('startCommand', e.target.value)}
                  placeholder="java -jar target/*.jar"
                  className="input-field text-sm font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">构建命令</label>
                <input
                  type="text"
                  value={form.buildCommand ?? ''}
                  onChange={(e) => set('buildCommand', e.target.value)}
                  placeholder="mvn clean package -DskipTests"
                  className="input-field text-sm font-mono"
                />
              </div>
            </div>

            {/* 高级配置 */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">高级配置</h4>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">日志路径</label>
                <input
                  type="text"
                  value={form.logPath ?? ''}
                  onChange={(e) => set('logPath', e.target.value)}
                  placeholder="留空使用默认路径 ~/.javadock/logs/"
                  className="input-field text-sm font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">JAVA_HOME</label>
                <input
                  type="text"
                  value={form.javaHome ?? ''}
                  onChange={(e) => set('javaHome', e.target.value)}
                  placeholder="留空使用系统默认 Java"
                  className="input-field text-sm font-mono"
                />
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            {/* 删除确认提示 */}
            {confirmDelete && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">
                <AlertTriangle size={14} />
                再次点击删除按钮将永久移除此服务配置
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
              confirmDelete
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
            } disabled:opacity-50`}
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {confirmDelete ? '确认删除' : '删除服务'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setConfirmDelete(false); onClose(); }}
              className="px-4 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
