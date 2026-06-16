import { useState, useEffect } from 'react';
import type { Project } from '../lib/types';
import { apiClient } from '../lib/api';
import { formatRelativeTime } from '../lib/format';
import { useToast } from '../components/Toast';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
}

interface ProjectDetailData extends Project {
  branches: { name: string; isCurrent: boolean; isRemote: boolean }[];
  commits: string[];
  size: { total: number; breakdown: { name: string; size: number; cleanable: boolean }[] };
  dependencies: { name: string; version: string; dependencies: Record<string, string>; devDependencies: Record<string, string> } | null;
  outdatedPackages: { name: string; current: string; latest: string }[];
}

export function ProjectDetail({ project, onBack }: ProjectDetailProps) {
  const [data, setData] = useState<ProjectDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadDetails();
  }, [project]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const detail = await apiClient.getProject(project.name);
      setData(detail);
    } catch (error) {
      console.error('Failed to load project details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      switch (action) {
        case 'pull':
          await apiClient.gitPull(project.name);
          showToast('拉取成功', 'success');
          break;
        case 'fetch':
          await apiClient.gitFetch(project.name);
          showToast('获取成功', 'success');
          break;
        case 'open':
          await apiClient.openProject(project.name);
          showToast('已在编辑器中打开', 'success');
          break;
        case 'terminal':
          await apiClient.openTerminal(project.name);
          showToast('已打开终端', 'success');
          break;
      }
      await loadDetails();
    } catch (error) {
      const message = (error as Error).message;
      switch (action) {
        case 'pull':
          showToast('拉取失败: ' + message, 'error');
          break;
        case 'fetch':
          showToast('获取失败: ' + message, 'error');
          break;
        case 'open':
          showToast('打开失败: ' + message, 'error');
          break;
        case 'terminal':
          showToast('打开终端失败: ' + message, 'error');
          break;
      }
      console.error(`Action ${action} failed:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckout = async (branch: string) => {
    setActionLoading('checkout');
    try {
      await apiClient.gitCheckout(project.name, branch);
      showToast('已切换到分支 ' + branch, 'success');
      await loadDetails();
    } catch (error) {
      showToast('切换分支失败: ' + (error as Error).message, 'error');
      console.error('Checkout failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载项目详情中...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-red-500">
        加载项目详情失败
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 mb-4"
        >
          ← 返回项目列表
        </button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {project.name}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overview */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              概览
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">路径</dt>
                <dd className="text-gray-900 dark:text-white font-mono text-sm">
                  {project.path.replace(process.env.HOME || '', '~')}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">分支</dt>
                <dd className="text-gray-900 dark:text-white">
                  {project.branch || '-'}
                  {project.ahead !== undefined && project.behind !== undefined && (
                    <span className="ml-2 text-sm text-gray-500">
                      {project.ahead > 0 && `↑${project.ahead} `}
                      {project.behind > 0 && `↓${project.behind}`}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">远程仓库</dt>
                <dd className="text-gray-900 dark:text-white text-sm truncate">
                  {project.remote || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">包管理器</dt>
                <dd className="text-gray-900 dark:text-white">
                  {project.packageManager || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">最后修改</dt>
                <dd className="text-gray-900 dark:text-white">
                  {formatRelativeTime(project.lastModified)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              操作
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAction('pull')}
                disabled={actionLoading !== null}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                🔄 拉取
              </button>
              <button
                onClick={() => handleAction('fetch')}
                disabled={actionLoading !== null}
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                📥 获取
              </button>
              <button
                onClick={() => handleAction('open')}
                disabled={actionLoading !== null}
                className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm"
              >
                📂 打开
              </button>
              <button
                onClick={() => handleAction('terminal')}
                disabled={actionLoading !== null}
                className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 text-sm"
              >
                💻 终端
              </button>
            </div>
          </div>
        </div>

        {/* Branches & Commits */}
        <div className="lg:col-span-2">
          {/* Branches */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              分支
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.branches.slice(0, 15).map((branch) => (
                <div
                  key={branch.name}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    branch.isCurrent ? 'bg-green-50 dark:bg-green-900/20' : ''
                  }`}
                  onClick={() => !branch.isCurrent && handleCheckout(branch.name)}
                >
                  <div className="flex items-center gap-2">
                    {branch.isCurrent && (
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                    )}
                    <span className={branch.isCurrent ? 'font-semibold text-green-700 dark:text-green-400' : ''}>
                      {branch.name}
                    </span>
                    {branch.isRemote && (
                      <span className="text-xs text-gray-400">(远程)</span>
                    )}
                  </div>
                  {!branch.isCurrent && !branch.isRemote && (
                    <span className="text-xs text-blue-600">点击切换</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Git Log */}
          {data.commits.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                最近提交
              </h3>
              <div className="space-y-2">
                {data.commits.slice(0, 10).map((commit, i) => (
                  <div key={i} className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                    {commit}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Size */}
          {data.size && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                空间占用
              </h3>
              <div className="space-y-2">
                {data.size.breakdown.slice(0, 8).map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="w-24 text-sm">{item.name}</span>
                    <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                      <div
                        className={`h-full ${item.cleanable ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${(item.size / data.size.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500">
                      {(item.size / 1024 / 1024).toFixed(0)} MB
                    </span>
                    {item.cleanable && (
                      <button className="text-xs text-red-600 hover:text-red-700">
                        清理
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}