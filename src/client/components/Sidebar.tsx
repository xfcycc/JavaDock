/**
 * 侧边栏导航
 * @author caiguoyu
 * @date 2026/3/10
 */
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Container,
  Coffee,
  Terminal,
  Settings,
  Anchor,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const navItems = [
  { to: '/', label: '总览', icon: LayoutDashboard, end: true },
  { to: '/docker', label: 'Docker', icon: Container },
  { to: '/java', label: 'Java 服务', icon: Coffee },
  { to: '/scripts', label: '自定义脚本', icon: Terminal },
];

export default function Sidebar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="w-56 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-900/50">
            <Anchor size={16} className="text-white" />
          </div>
          <div>
            <div className="text-slate-900 dark:text-white font-bold text-base leading-none">JavaDock</div>
            <div className="text-slate-500 text-xs mt-0.5">v1.0.0</div>
          </div>
        </div>
      </div>

      {/* 导航 */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-600/20 text-brand-500 dark:text-brand-400 border border-brand-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* 主题切换 + 设置 */}
      <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800 space-y-0.5">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium w-full transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          title={theme === 'dark' ? '切换为白天模式' : '切换为黑夜模式'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'dark' ? '白天模式' : '黑夜模式'}
        </button>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-600/20 text-brand-500 dark:text-brand-400 border border-brand-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`
          }
        >
          <Settings size={16} />
          设置
        </NavLink>
      </div>
    </aside>
  );
}
