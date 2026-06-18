import React, { useState, useEffect, useCallback } from 'react';
import type { Project } from '../lib/types';
import { apiClient } from '../lib/api';
import { formatRelativeTime } from '../lib/format';
import { useToast } from '../components/Toast';
import { Tooltip } from '../components/Tooltip';

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

  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      const detail = await apiClient.getProject(project.name);
      setData(detail);
    } catch (error) {
      console.error('Failed to load project details:', error);
    } finally {
      setLoading(false);
    }
  }, [project.name]);

  const handleAction = useCallback(async (action: string) => {
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
      showToast(`${action === 'pull' ? '拉取' : action === 'fetch' ? '获取' : action === 'open' ? '打开' : '打开终端'}失败: ${message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [project.name, loadDetails, showToast]);

  const handleCheckout = useCallback(async (branch: string) => {
    setActionLoading('checkout');
    try {
      await apiClient.gitCheckout(project.name, branch);
      showToast('已切换到分支 ' + branch, 'success');
      await loadDetails();
    } catch (error) {
      showToast('切换分支失败: ' + (error as Error).message, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [project.name, loadDetails, showToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-red-500">加载项目详情失败</div>;
  }

  return (
    <div className="animate-fade-in">
      {/* 面包屑导航 */}
      <nav className="flex text-sm text-slate-500 mb-6 gap-2 items-center">
        <Tooltip content="返回工作区">
          <button onClick={onBack} className="hover:text-blue-600 flex items-center gap-1 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            工作区
          </button>
        </Tooltip>
        <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="font-medium text-slate-900 dark:text-white">{project.name}</span>
      </nav>

      {/* 头部 Hero 区域 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 border border-brand-100 dark:border-brand-800">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="4" />
              <path d="M1.05 12H7m10.95 12H17m0-12h5.95M12 1.05V7m0 10.95V22.95" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{project.name}</h2>
            <p className="text-sm text-slate-500 font-mono mt-1 flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {project.path.replace(process.env.HOME || '', '~')}
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Tooltip content="在 Cursor 编辑器中打开项目">
            <button
              onClick={() => handleAction('open')}
              disabled={actionLoading !== null}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              用 Cursor 打开
            </button>
          </Tooltip>
          <Tooltip content="在终端中打开项目目录">
            <button
              onClick={() => handleAction('terminal')}
              disabled={actionLoading !== null}
              className="flex items-center justify-center p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip content="在访达中显示项目目录">
            <button
              onClick={onBack}
              className="flex items-center justify-center p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* 两列布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：环境信息 */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* 项目信息卡片 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              项目信息
            </h3>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">远程仓库 (Remote)</div>
                <div className="text-sm font-mono bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-700 break-all text-slate-700 dark:text-slate-300">
                  {project.remote || '-'}
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-sm text-slate-500">包管理器</span>
                <span className="text-sm font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-brand-300 px-2 py-0.5 rounded">
                  {project.packageManager || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-sm text-slate-500">Node 版本要求</span>
                <span className="text-sm font-mono">{project.nodeVersion || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500">最后修改</span>
                <span className="text-sm">{formatRelativeTime(new Date(project.lastModified))}</span>
              </div>
            </div>
          </div>

          {/* 依赖管理卡片 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                依赖管理
              </h3>
              {project.packageManager && (
                <button className="text-xs text-blue-600 hover:underline">查看 package.json</button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Tooltip content="从远程仓库拉取最新代码">
                <button
                  onClick={() => handleAction('pull')}
                  disabled={actionLoading !== null}
                  className="flex flex-col items-center justify-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors group disabled:opacity-50"
                >
                  <svg className="w-5 h-5 mb-1 text-slate-400 group-hover:text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="18" r="3" />
                    <circle cx="6" cy="6" r="3" />
                    <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                    <path d="M11 18H8a2 2 0 0 1-2-2V9" />
                  </svg>
                  <span className="text-sm font-medium">Git Pull</span>
                </button>
              </Tooltip>
              <Tooltip content="获取远程分支最新信息">
                <button
                  onClick={() => handleAction('fetch')}
                  disabled={actionLoading !== null}
                  className="flex flex-col items-center justify-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors group disabled:opacity-50"
                >
                  <svg className="w-5 h-5 mb-1 text-slate-400 group-hover:text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  <span className="text-sm font-medium">Git Fetch</span>
                </button>
              </Tooltip>
            </div>

            {/* 空间占用 */}
            {data.size && (
              <div className="mt-6">
                <h4 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">空间占用</h4>
                <div className="space-y-3">
                  {data.size.breakdown.slice(0, 5).map((item) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="text-sm w-24 truncate">{item.name}</span>
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.cleanable ? 'bg-red-400' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min((item.size / data.size.total) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-12 text-right">
                        {(item.size / 1024 / 1024).toFixed(0)}MB
                      </span>
                      {item.cleanable && (
                        <Tooltip content="删除此目录">
                          <button className="text-slate-400 hover:text-red-500 transition-colors">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：Git 分支与历史 */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* 分支管理 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="18" r="3" />
                  <circle cx="6" cy="6" r="3" />
                  <path d="M6 21V9a9 9 0 0 0 9 9" />
                </svg>
                分支管理
              </h3>
              <div className="flex gap-2">
                <Tooltip content="从远程仓库拉取最新代码">
                  <button
                    onClick={() => handleAction('pull')}
                    disabled={actionLoading !== null}
                    className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-sm shadow-sm flex items-center gap-1 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    拉取
                  </button>
                </Tooltip>
                <Tooltip content="创建新分支">
                  <button className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-sm shadow-sm flex items-center gap-1 hover:bg-slate-50 transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    新建
                  </button>
                </Tooltip>
              </div>
            </div>

            <div className="p-2 h-64 overflow-y-auto">
              {data.branches.slice(0, 15).map((branch) => (
                <div
                  key={branch.name}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer group transition-colors ${
                    branch.isCurrent
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-brand-100 dark:border-brand-800/50'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                  onClick={() => !branch.isCurrent && !branch.isRemote && handleCheckout(branch.name)}
                >
                  <div className="flex items-center gap-3">
                    {branch.isCurrent && (
                      <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {!branch.isCurrent && <div className="w-4 h-4" />}
                    <span className={`font-mono text-sm ${branch.isCurrent ? 'font-bold text-blue-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300'}`}>
                      {branch.name}
                    </span>
                    {branch.isRemote && (
                      <Tooltip content="远程分支">
                        <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                        </svg>
                      </Tooltip>
                    )}
                  </div>
                  {branch.isCurrent ? (
                    <span className="text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded text-slate-500 border border-slate-200 dark:border-slate-700">
                      当前分支
                    </span>
                  ) : !branch.isRemote && (
                    <Tooltip content="切换到此分支">
                      <button className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded">
                        切换
                      </button>
                    </Tooltip>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 最近提交 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              最近提交
            </h3>
            {data.commits.length > 0 ? (
              <div className="relative pl-4 border-l border-slate-200 dark:border-slate-700 space-y-6">
                {data.commits.slice(0, 5).map((commit, i) => {
                  const parts = commit.split(' ');
                  const hash = parts[0];
                  const message = parts.slice(1).join(' ');
                  return (
                    <div key={i} className="relative">
                      <div className={`absolute -left-6 top-1 w-4 h-4 bg-white dark:bg-slate-800 border-2 ${i === 0 ? 'border-blue-500' : 'border-slate-300 dark:border-slate-600'} rounded-full`} />
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{message}</div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <Tooltip content="提交哈希">
                          <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{hash}</span>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">暂无提交记录</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
