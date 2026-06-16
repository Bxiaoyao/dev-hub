import { useState } from 'react';
import type { Project } from '../lib/types';
import { formatRelativeTime } from '../lib/format';
import { apiClient } from '../lib/api';
import { useToast } from './Toast';

interface ProjectCardProps {
  project: Project;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
}

export function ProjectCard({ project, selected, onSelect, onClick }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const { showToast } = useToast();

  const statusColor =
    project.status === 'clean' ? 'bg-green-500' :
    project.status === 'dirty' ? 'bg-yellow-500' :
    'bg-gray-400';

  const statusText =
    project.status === 'clean' ? '干净' :
    project.status === 'dirty' ? '有更改' :
    '未知';

  const handleOpenEditor = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading('open');
    try {
      await apiClient.openProject(project.name);
      showToast('已在编辑器中打开', 'success');
    } catch (error) {
      showToast('打开失败: ' + (error as Error).message, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleOpenTerminal = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
  };

  const handleGitPull = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
  };

  const handleInstallDeps = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
  };

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer ${
        selected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={onClick}
    >
      {/* 选择复选框 */}
      <div className="absolute top-3 left-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="w-4 h-4 rounded border-gray-300"
        />
      </div>

      {/* 项目信息 */}
      <div className="ml-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
          {project.name}
        </h3>

        <div className="flex items-center gap-2 mt-1">
          <span className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {project.branch || '无分支'}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-2 text-sm">
          {project.packageManager && (
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
              {project.packageManager}
            </span>
          )}
          {project.status === 'dirty' && project.uncommittedChanges && (
            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">
              {project.uncommittedChanges} 处更改
            </span>
          )}
        </div>

        <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          {formatRelativeTime(new Date(project.lastModified))}
        </div>

        {/* 操作按钮 */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleOpenEditor}
            disabled={loading !== null}
            className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
          >
            {loading === 'open' ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <span>📂</span>
            )}
            打开
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1"
          >
            ⋯ 更多
          </button>

          {/* 更多操作菜单 */}
          {showMenu && (
            <div className="absolute right-4 bottom-16 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-10 min-w-[120px]">
              <button
                onClick={handleOpenTerminal}
                disabled={loading !== null}
                className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2 disabled:opacity-50"
              >
                <span>💻</span>
                {loading === 'terminal' ? '打开中...' : '打开终端'}
              </button>
              <button
                onClick={handleGitPull}
                disabled={loading !== null}
                className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2 disabled:opacity-50"
              >
                <span>🔄</span>
                {loading === 'pull' ? '拉取中...' : 'Git 拉取'}
              </button>
              {project.packageManager && (
                <button
                  onClick={handleInstallDeps}
                  disabled={loading !== null}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2 disabled:opacity-50"
                >
                  <span>📦</span>
                  {loading === 'install' ? '安装中...' : '安装依赖'}
                </button>
              )}
              <hr className="my-1 border-gray-200 dark:border-gray-600" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onClick();
                }}
                className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <span>📋</span>
                查看详情
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}