import React, { useState, useCallback, memo } from 'react';
import type { Project } from '../lib/types';
import { formatRelativeTime, formatProjectPath, formatShortRelativeTime } from '../lib/format';
import { apiClient } from '../lib/api';
import { useToast } from './Toast';
import { Tooltip } from './Tooltip';
import { RepoLinks } from './RepoLinks';
import { ProjectTags } from './ProjectTags';

interface ProjectCardProps {
  project: Project;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onTagClick?: (tag: string) => void;
  /** 平铺模式下显示路径；分组时父目录已在组标题展示 */
  showPath?: boolean;
}

const iconBtn =
  'h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50';

export const ProjectCard = memo(function ProjectCard({
  project,
  selected,
  onSelect,
  onClick,
  onTagClick,
  showPath = false,
}: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const { showToast } = useToast();

  const statusTip =
    project.status === 'clean'
      ? '工作区干净'
      : project.status === 'dirty'
        ? `有 ${project.uncommittedChanges ?? 0} 处未提交更改`
        : '未知状态';

  const statusDot =
    project.status === 'clean'
      ? 'bg-green-500'
      : project.status === 'dirty'
        ? 'bg-amber-500'
        : 'bg-slate-300 dark:bg-slate-600';

  const metaTip = [
    project.branch && `分支: ${project.branch}`,
    project.packageManager && `包管理: ${project.packageManager}`,
    project.nodeVersion && `Node ${project.nodeVersion}`,
    project.remote && `远程: ${project.remote}`,
    statusTip,
  ]
    .filter(Boolean)
    .join('\n');

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
    if (!showMenu) onClick();
  }, [showMenu, onClick]);

  const handleMenuClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMenu((prev) => !prev);
  }, []);

  const handleViewDetail = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMenu(false);
    onClick();
  }, [onClick]);

  return (
    <div
      className={`relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md cursor-pointer group flex flex-col transition-colors font-sans antialiased ${
        selected ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : ''
      }`}
      onClick={handleCardClick}
    >
      <div className="p-4 flex-1 min-w-0">
        {/* 标题行 */}
        <div className="flex items-center gap-2 mb-2">
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
              className={`w-4 h-4 rounded flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                selected
                  ? 'bg-blue-600 border-2 border-blue-600'
                  : 'bg-white dark:bg-slate-700 border-2 border-slate-300 hover:border-blue-400'
              }`}
            >
              {selected && (
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </Tooltip>

          <Tooltip content={metaTip}>
            <h3 className="flex-1 min-w-0 text-base font-semibold text-slate-900 dark:text-white truncate leading-tight">
              {project.name}
            </h3>
          </Tooltip>

          <Tooltip content="更多操作">
            <button
              type="button"
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={handleMenuClick}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>
          </Tooltip>
        </div>

        {/* 核心状态：分支 + 状态点 */}
        <div className="flex items-center gap-1.5 min-w-0 pl-6 text-xs text-slate-600 dark:text-slate-300">
          {project.branch ? (
            <span className="truncate tabular-nums">{project.branch}</span>
          ) : (
            <span className="text-slate-400">无分支</span>
          )}
          <Tooltip content={statusTip}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
          </Tooltip>
          {project.status === 'dirty' && project.uncommittedChanges ? (
            <span className="text-amber-600 dark:text-amber-400 shrink-0 tabular-nums">
              {project.uncommittedChanges}
            </span>
          ) : null}
          {project.packageManager && (
            <span className="text-slate-400 shrink-0 ml-auto uppercase tracking-wide text-[11px]">
              {project.packageManager}
            </span>
          )}
        </div>

        {showPath && (
          <Tooltip content={project.path}>
            <p className="text-xs text-slate-400 truncate mt-1 pl-6">
              {formatProjectPath(project.path)}
            </p>
          </Tooltip>
        )}

        {project.tags && project.tags.length > 0 && (
          <div className="mt-2 pl-6">
            <ProjectTags tags={project.tags} maxVisible={2} onTagClick={onTagClick} />
          </div>
        )}
      </div>

      {/* 底部：图标操作 + 时间 */}
      <div className="px-3 py-2.5 bg-slate-50/80 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700 rounded-b-xl flex items-center gap-1.5">
        <Tooltip content="用 Cursor 打开">
          <button type="button" onClick={handleOpenEditor} disabled={loading !== null} className={iconBtn}>
            {loading === 'open' ? (
              <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            )}
          </button>
        </Tooltip>

        {project.packageManager && (
          <Tooltip content="安装依赖">
            <button type="button" onClick={handleInstallDeps} disabled={loading !== null} className={iconBtn}>
              {loading === 'install' ? (
                <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              )}
            </button>
          </Tooltip>
        )}

        {project.isGit && project.remote && (
          <RepoLinks remote={project.remote} branch={project.branch} variant="compact" compactSize="sm" />
        )}

        <span className="flex-1" />

        <Tooltip content={`更新于 ${formatRelativeTime(new Date(project.lastModified))}`}>
          <span className="text-xs text-slate-500 tabular-nums shrink-0 pr-0.5">
            {formatShortRelativeTime(new Date(project.lastModified))}
          </span>
        </Tooltip>
      </div>

      {showMenu && (
        <div className="absolute right-3 top-12 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 py-1 z-10 min-w-[132px] animate-fade-in">
          <button
            type="button"
            onClick={handleOpenTerminal}
            disabled={loading !== null}
            className="w-full px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-2 text-slate-700 dark:text-slate-200 disabled:opacity-50"
          >
            打开终端
          </button>
          <button
            type="button"
            onClick={handleGitPull}
            disabled={loading !== null}
            className="w-full px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-2 text-slate-700 dark:text-slate-200 disabled:opacity-50"
          >
            {loading === 'pull' ? '拉取中...' : 'Git 拉取'}
          </button>
          <hr className="my-1 border-slate-200 dark:border-slate-600" />
          <button
            type="button"
            onClick={handleViewDetail}
            className="w-full px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
          >
            查看详情
          </button>
        </div>
      )}
    </div>
  );
});
