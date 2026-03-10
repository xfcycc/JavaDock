/**
 * 设置页面：管理 Java 服务配置、环境变量、默认命令、自定义脚本
 * @author caiguoyu
 * @date 2026/3/10
 */
import React, { useEffect, useState } from 'react';
import {
  Coffee, Globe, Terminal, Zap, Plus, Trash2,
  Save, Info, ChevronDown, ChevronUp, Shield,
} from 'lucide-react';
import { settingsApi } from '../api/client';
import { AppConfig, JavaService, EnvEntry, CustomScript } from '../../../src/shared/types';
import { DEFAULT_COMMANDS } from '../../../src/shared/defaultConfig';
import Spinner from '../components/Spinner';
import { useToast } from '../App';

// ─── Tab 导航 ──────────────────────────────────────────────────────────────────

type Tab = 'services' | 'environments' | 'commands' | 'scripts' | 'privilege';

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'services', label: 'Java 服务', icon: <Coffee size={15} /> },
  { id: 'environments', label: '环境变量', icon: <Globe size={15} /> },
  { id: 'commands', label: '默认命令', icon: <Zap size={15} /> },
  { id: 'scripts', label: '自定义脚本', icon: <Terminal size={15} /> },
  { id: 'privilege', label: '权限', icon: <Shield size={15} /> },
];

// ─── 工具函数 ──────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Java 服务表单 ─────────────────────────────────────────────────────────────

function ServiceForm({
  service, onChange, onRemove,
}: {
  service: JavaService;
  onChange: (s: JavaService) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-4 flex flex-col gap-3">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {service.name || '（新服务）'}
          </span>
          {service.port && (
            <span className="text-xs text-slate-500 font-mono">:{service.port}</span>
          )}
        </div>
        <button onClick={onRemove} className="action-btn text-slate-500 dark:text-slate-600 hover:text-red-400">
          <Trash2 size={14} />
        </button>
      </div>

      {/* 基础字段（始终可见） */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">服务名称 *</label>
          <input
            className="form-input"
            value={service.name}
            onChange={(e) => onChange({ ...service, name: e.target.value })}
            placeholder="my-service"
          />
        </div>
        <div>
          <label className="form-label">监听端口</label>
          <input
            className="form-input"
            type="number"
            value={service.port || ''}
            onChange={(e) => onChange({ ...service, port: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="8080"
          />
        </div>
      </div>

      <div>
        <label className="form-label">项目目录（cwd）*</label>
        <input
          className="form-input font-mono text-xs"
          value={service.cwd}
          onChange={(e) => onChange({ ...service, cwd: e.target.value })}
          placeholder="/home/user/my-project"
        />
      </div>

      {/* 展开字段 */}
      {expanded && (
        <>
          <div>
            <label className="form-label">描述</label>
            <input
              className="form-input"
              value={service.description || ''}
              onChange={(e) => onChange({ ...service, description: e.target.value })}
              placeholder="服务简介"
            />
          </div>

          <div>
            <label className="form-label">启动命令（留空使用默认命令模板）</label>
            <input
              className="form-input font-mono text-xs"
              value={service.startCommand || ''}
              onChange={(e) => onChange({ ...service, startCommand: e.target.value })}
              placeholder="java -jar target/app.jar --spring.profiles.active=prod"
            />
          </div>

          <div>
            <label className="form-label">编译命令（留空使用默认命令模板）</label>
            <input
              className="form-input font-mono text-xs"
              value={service.buildCommand || ''}
              onChange={(e) => onChange({ ...service, buildCommand: e.target.value })}
              placeholder="mvn clean package -DskipTests"
            />
          </div>

          <div>
            <label className="form-label">日志文件路径（留空自动生成至 ~/.javadock/logs/）</label>
            <input
              className="form-input font-mono text-xs"
              value={service.logPath || ''}
              onChange={(e) => onChange({ ...service, logPath: e.target.value })}
              placeholder="/var/log/my-service/app.log"
            />
          </div>

          <div>
            <label className="form-label">JAVA_HOME（留空使用系统默认）</label>
            <input
              className="form-input font-mono text-xs"
              value={service.javaHome || ''}
              onChange={(e) => onChange({ ...service, javaHome: e.target.value })}
              placeholder="/usr/lib/jvm/java-17"
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('services');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configPath, setConfigPath] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [cfg, pathRes] = await Promise.all([
          settingsApi.getConfig(),
          settingsApi.getConfigPath(),
        ]);
        setConfig(cfg);
        setConfigPath(pathRes.path);
      } catch (e: any) {
        showToast('error', `加载配置失败：${e.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await settingsApi.updateConfig(config);
      showToast('success', '配置已保存');
    } catch (e: any) {
      showToast('error', `保存失败：${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner text="加载配置..." /></div>;
  if (!config) return null;

  // ─── Java 服务管理 ────────────────────────────────────────────────────────────
  const ServicesTab = () => (
    <div className="flex flex-col gap-3">
      {config.javaServices.map((svc, i) => (
        <ServiceForm
          key={svc.id}
          service={svc}
          onChange={(updated) => {
            const next = [...config.javaServices];
            next[i] = updated;
            setConfig({ ...config, javaServices: next });
          }}
          onRemove={() => {
            const next = config.javaServices.filter((_, idx) => idx !== i);
            setConfig({ ...config, javaServices: next });
          }}
        />
      ))}
      <button
        onClick={() =>
          setConfig({
            ...config,
            javaServices: [
              ...config.javaServices,
              { id: genId(), name: '', cwd: '' },
            ],
          })
        }
        className="btn-secondary justify-center py-2.5 border border-dashed border-slate-400 dark:border-slate-700 rounded-xl"
      >
        <Plus size={15} /> 添加服务
      </button>
    </div>
  );

  // ─── 环境变量管理 ─────────────────────────────────────────────────────────────
  const EnvTab = () => (
    <div className="flex flex-col gap-3">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 text-xs text-blue-300 flex gap-2">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>
          环境变量可在命令模板中通过 <code className="bg-blue-900/50 px-1 rounded">{'{NAME}'}</code> 引用，
          也会作为环境变量注入到命令执行时的 Shell 上下文
        </span>
      </div>

      {config.environments.map((env, i) => (
        <div key={env.id} className="card p-4 grid grid-cols-[1fr_1fr_auto] gap-3 items-start">
          <div>
            <label className="form-label">名称</label>
            <input
              className="form-input font-mono text-xs"
              value={env.name}
              onChange={(e) => {
                const next = [...config.environments];
                next[i] = { ...next[i], name: e.target.value };
                setConfig({ ...config, environments: next });
              }}
              placeholder="JAVA_HOME"
            />
          </div>
          <div>
            <label className="form-label">值</label>
            <input
              className="form-input font-mono text-xs"
              value={env.value}
              onChange={(e) => {
                const next = [...config.environments];
                next[i] = { ...next[i], value: e.target.value };
                setConfig({ ...config, environments: next });
              }}
              placeholder="/usr/lib/jvm/java-17"
            />
          </div>
          <div className="pt-5">
            <button
              onClick={() =>
                setConfig({ ...config, environments: config.environments.filter((_, idx) => idx !== i) })
              }
              className="action-btn text-slate-500 dark:text-slate-600 hover:text-red-400"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={() =>
          setConfig({
            ...config,
            environments: [...config.environments, { id: genId(), name: '', value: '' }],
          })
        }
        className="btn-secondary justify-center py-2.5 border border-dashed border-slate-400 dark:border-slate-700 rounded-xl"
      >
        <Plus size={15} /> 添加环境变量
      </button>
    </div>
  );

  // ─── 默认命令管理 ─────────────────────────────────────────────────────────────
  const CommandsTab = () => {
    const cmdKeys = Object.keys({ ...DEFAULT_COMMANDS, ...config.defaultCommands });
    return (
      <div className="flex flex-col gap-3">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 text-xs text-blue-300 flex gap-2">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>
            可用占位符：<code className="bg-blue-900/50 px-1 rounded">{'{cwd}'}</code>（项目目录）、
            <code className="bg-blue-900/50 px-1 rounded ml-1">{'{port}'}</code>（端口）、
            <code className="bg-blue-900/50 px-1 rounded ml-1">{'{name}'}</code>（服务名）
          </span>
        </div>

        {cmdKeys.map((key) => (
          <div key={key} className="card p-4">
            <label className="form-label">{key}</label>
            <input
              className="form-input font-mono text-xs"
              value={config.defaultCommands[key] ?? DEFAULT_COMMANDS[key] ?? ''}
              onChange={(e) =>
                setConfig({
                  ...config,
                  defaultCommands: { ...config.defaultCommands, [key]: e.target.value },
                })
              }
              placeholder={DEFAULT_COMMANDS[key] || `${key} 默认命令`}
            />
          </div>
        ))}
      </div>
    );
  };

  // ─── 自定义脚本管理 ───────────────────────────────────────────────────────────
  const ScriptsTab = () => (
    <div className="flex flex-col gap-3">
      {config.customScripts.map((script, i) => (
        <div key={script.id} className="card p-4 flex flex-col gap-3">
          <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
            <div>
              <label className="form-label">脚本名称</label>
              <input
                className="form-input"
                value={script.name}
                onChange={(e) => {
                  const next = [...config.customScripts];
                  next[i] = { ...next[i], name: e.target.value };
                  setConfig({ ...config, customScripts: next });
                }}
                placeholder="清理日志"
              />
            </div>
            <div className="pt-5">
              <button
                onClick={() =>
                  setConfig({
                    ...config,
                    customScripts: config.customScripts.filter((_, idx) => idx !== i),
                  })
                }
                className="action-btn text-slate-500 dark:text-slate-600 hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div>
            <label className="form-label">命令</label>
            <input
              className="form-input font-mono text-xs"
              value={script.command}
              onChange={(e) => {
                const next = [...config.customScripts];
                next[i] = { ...next[i], command: e.target.value };
                setConfig({ ...config, customScripts: next });
              }}
              placeholder="rm -rf /var/log/app/*.log"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">执行目录（cwd，留空为当前目录）</label>
              <input
                className="form-input font-mono text-xs"
                value={script.cwd || ''}
                onChange={(e) => {
                  const next = [...config.customScripts];
                  next[i] = { ...next[i], cwd: e.target.value };
                  setConfig({ ...config, customScripts: next });
                }}
                placeholder="/opt/app"
              />
            </div>
            <div>
              <label className="form-label">描述</label>
              <input
                className="form-input"
                value={script.description || ''}
                onChange={(e) => {
                  const next = [...config.customScripts];
                  next[i] = { ...next[i], description: e.target.value };
                  setConfig({ ...config, customScripts: next });
                }}
                placeholder="脚本用途说明"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={() =>
          setConfig({
            ...config,
            customScripts: [
              ...config.customScripts,
              { id: genId(), name: '', command: '' },
            ],
          })
        }
        className="btn-secondary justify-center py-2.5 border border-dashed border-slate-400 dark:border-slate-700 rounded-xl"
      >
        <Plus size={15} /> 添加脚本
      </button>
    </div>
  );

  // ─── 权限（管理员密码，用于 sudo）────────────────────────────────────────────
  const PrivilegeTab = () => (
    <div className="flex flex-col gap-4 max-w-lg">
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-xs text-amber-700 dark:text-amber-300 flex gap-2">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>
          填写后，扫描本机 Java 进程时会使用 sudo 执行 lsof 等命令，以获取其他用户进程的工作目录与端口。
          留空则不使用 sudo（仅能识别当前用户进程）。密码仅存于本地配置文件，请勿将配置暴露到公网。
        </span>
      </div>
      <div className="card p-4 flex flex-col gap-2">
        <label className="form-label">管理员密码（用于 sudo）</label>
        <input
          type="password"
          className="form-input font-mono"
          autoComplete="current-password"
          value={config.adminPassword === '********' ? '' : (config.adminPassword ?? '')}
          onChange={(e) => setConfig({ ...config, adminPassword: e.target.value })}
          placeholder={config.adminPassword === '********' ? '已设置（输入新密码可修改）' : '留空则不使用 sudo'}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/30 shrink-0 backdrop-blur-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">设置</h1>
          {configPath && (
            <p className="text-slate-500 dark:text-slate-600 text-xs mt-0.5 font-mono">{configPath}</p>
          )}
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <Spinner size={14} /> : <Save size={14} />}
          保存配置
        </button>
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-0 px-6 pt-4 border-b border-slate-200 dark:border-slate-800/60 shrink-0">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === id
                ? 'border-brand-500 text-brand-500 dark:text-brand-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'services' && <ServicesTab />}
        {tab === 'environments' && <EnvTab />}
        {tab === 'commands' && <CommandsTab />}
        {tab === 'scripts' && <ScriptsTab />}
        {tab === 'privilege' && <PrivilegeTab />}
      </div>
    </div>
  );
}
