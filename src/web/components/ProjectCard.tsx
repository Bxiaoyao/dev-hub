import React, { useState, useCallback, memo } from 'react';
import type { Project } from '../lib/types';
import { formatRelativeTime, formatProjectPath } from '../lib/format';
import { apiClient } from '../lib/api';
import { useToast } from './Toast';
import { Tooltip } from './Tooltip';

interface ProjectCardProps {
  project: Project;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
}

// 使用 memo 避免不必要的重渲染
export const ProjectCard = memo(function ProjectCard({ project, selected, onSelect, onClick }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const { showToast } = useToast();

  const statusColor =
    project.status === 'clean' ? 'bg-green-500' :
    project.status === 'dirty' ? 'bg-amber-500' :
    'bg-slate-300 dark:bg-slate-600';

  const statusBg =
    project.status === 'clean' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50' :
    project.status === 'dirty' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50' :
    'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';

  // 复选框点击 - 直接处理
  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
  }, [onSelect]);

  const handleOpenEditor = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLoading('open');
    try {
      await apiClient.openProject(project.name);
      showToast('已在编辑器中打开', 'success');
    } catch (error) {
      showToast('打开失败: ' + (error as Error).message, 'error');
    } finally {
      setLoading(null);
    }
  }, [project.name, showToast]);

  const handleOpenTerminal = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMenu(false);
    setLoading('terminal');
    try {
      await apiClient.openTerminal(project.name);
      showToast('已打开终端', 'success');
    } catch (error) {
      showToast('打开终端失败: ' + (error as Error).message, 'error');
    } finally {
      setLoading(null);
    }
  }, [project.name, showToast]);

  const handleGitPull = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMenu(false);
    setLoading('pull');
    try {
      await apiClient.gitPull(project.name);
      showToast('拉取成功', 'success');
    } catch (error) {
      showToast('拉取失败: ' + (error as Error).message, 'error');
    } finally {
      setLoading(null);
    }
  }, [project.name, showToast]);

  const handleInstallDeps = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMenu(false);
    setLoading('install');
    try {
      await apiClient.installDeps(project.name);
      showToast('依赖安装成功', 'success');
    } catch (error) {
      showToast('安装失败: ' + (error as Error).message, 'error');
    } finally {
      setLoading(null);
    }
  }, [project.name, showToast]);

  const handleCardClick = useCallback(() => {
    if (!showMenu) {
      onClick();
    }
  }, [showMenu, onClick]);

  const handleMenuClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMenu(prev => !prev);
  }, []);

  const handleViewDetail = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMenu(false);
    onClick();
  }, [onClick]);

  return (
    <div
      className={`relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md cursor-pointer group flex flex-col transition-colors ${
        selected ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : ''
      }`}
      onClick={handleCardClick}
    >
      {/* 主要内容区 */}
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            {/* 复选框 - 自定义实现，响应更快 */}
            <Tooltip content="选择项目">
              <div
                role="checkbox"
                aria-checked={selected}
                tabIndex={0}
                onClick={handleCheckboxClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect();
                  }
                }}
                className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all ${
                  selected
                    ? 'bg-blue-600 border-2 border-blue-600'
                    : 'bg-white dark:bg-slate-700 border-2 border-slate-300 hover:border-blue-400'
                }`}
              >
                {selected && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </Tooltip>
            <div className={`p-2 rounded-lg ${project.packageManager ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {project.isGit ? (
                  <>
                    <circle cx="12" cy="12" r="4" />
                    <path d="M1.05 12H7m10.95 12H17m0-12h5.95M12 1.05V7m0 10.95V22.95" />
                  </>
                ) : (
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                )}
              </svg>
            </div>
          </div>
          <Tooltip content="更多操作">
            <button
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleMenuClick}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>
          </Tooltip>
        </div>

        {/* 项目名称 */}
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 truncate">{project.name}</h3>
        <Tooltip content={project.path}>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate mb-2" title={project.path}>
            {formatProjectPath(project.path)}
          </p>
        </Tooltip>

        {/* 分支和状态 */}
        <div className="flex items-center gap-2 mb-3">
          {project.branch && (
            <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${statusBg}`}>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="6" y1="3" x2="6" y2="15" />
                <circle cx="18" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <path d="M18 9a9 9 0 0 0-9 9" />
              </svg>
              {project.branch}
            </span>
          )}
          <Tooltip content={project.status === 'clean' ? '工作区干净' : project.status === 'dirty' ? '有未提交更改' : '未知状态'}>
            <span className={`w-2 h-2 rounded-full ${statusColor}`} />
          </Tooltip>
        </div>

        {/* 技术标签 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {project.packageManager && (
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs">
              {project.packageManager}
            </span>
          )}
          {project.nodeVersion && (
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs">
              Node {project.nodeVersion}
            </span>
          )}
          {project.status === 'dirty' && project.uncommittedChanges && (
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs">
              {project.uncommittedChanges} 处更改
            </span>
          )}
        </div>

        {/* 修改时间 */}
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {formatRelativeTime(new Date(project.lastModified))}
        </p>
      </div>

      {/* 快捷操作栏 */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 rounded-b-xl flex gap-2 items-center">
        <div className="flex-1 min-w-0">
          <Tooltip content="在 Cursor 中打开项目">
            <button
              onClick={handleOpenEditor}
              disabled={loading !== null}
              className="w-full h-9 flex justify-center items-center gap-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm disabled:opacity-50"
            >
            {loading === 'open' ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            )}
            Cursor
            </button>
          </Tooltip>
        </div>
        {project.packageManager && (
          <Tooltip content="安装/更新依赖">
            <button
              onClick={handleInstallDeps}
              disabled={loading !== null}
              className="h-9 w-9 shrink-0 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading === 'install' ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              )}
            </button>
          </Tooltip>
        )}
      </div>

      {/* 更多操作菜单 */}
      {showMenu && (
        <div className="absolute right-4 bottom-20 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 py-1 z-10 min-w-[140px] animate-fade-in">
          <button
            onClick={handleOpenTerminal}
            disabled={loading !== null}
            className="w-full px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-2 text-slate-700 dark:text-slate-200 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            {loading === 'terminal' ? '打开中...' : '打开终端'}
          </button>
          <button
            onClick={handleGitPull}
            disabled={loading !== null}
            className="w-full px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-2 text-slate-700 dark:text-slate-200 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="18" r="3" />
              <circle cx="6" cy="6" r="3" />
              <path d="M13 6h3a2 2 0 0 1 2 2v7" />
              <path d="M11 18H8a2 2 0 0 1-2-2V9" />
            </svg>
            {loading === 'pull' ? '拉取中...' : 'Git 拉取'}
          </button>
          <hr className="my-1 border-slate-200 dark:border-slate-600" />
          <button
            onClick={handleViewDetail}
            className="w-full px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-2 text-slate-700 dark:text-slate-200"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            查看详情
          </button>
        </div>
      )}
    </div>
  );
});
