import React, { useState, useEffect, useCallback } from 'react';
import type { Project } from '../lib/types';
import { apiClient, type ProjectDetailMeta } from '../lib/api';
import { formatRelativeTime, formatProjectPath } from '../lib/format';
import { useToast } from '../components/Toast';
import { Tooltip } from '../components/Tooltip';
import { RepoLinks } from '../components/RepoLinks';
import { ProjectTags } from '../components/ProjectTags';
import { ProjectTagEditor } from '../components/ProjectTagEditor';
import type { Config } from '../lib/types';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
}

interface ProjectDetailData extends Project {
  branches: { name: string; isCurrent: boolean; isRemote: boolean }[];
  commits: { hash: string; message: string; author: string; date: string }[];
  size: { total: number; breakdown: { name: string; size: number; cleanable: boolean }[] };
  dependencies: { name: string; version: string; dependencies: Record<string, string>; devDependencies: Record<string, string> } | null;
  outdatedPackages: { name: string; current: string; latest: string }[];
}

function buildInitialDetail(p: Project): ProjectDetailData {
  return {
    ...p,
    branches: [],
    commits: [],
    size: { total: 0, breakdown: [] },
    dependencies: null,
    outdatedPackages: [],
  };
}

export function ProjectDetail({ project, onBack }: ProjectDetailProps) {
  const [data, setData] = useState<ProjectDetailData>(() => buildInitialDetail(project));
  const [detailMeta, setDetailMeta] = useState<ProjectDetailMeta | null>(null);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tagPresets, setTagPresets] = useState<string[]>(['工作', '个人', '归档']);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    apiClient.getConfig().then((cfg: Config) => {
      if (cfg.tags?.presets?.length) {
        setTagPresets(cfg.tags.presets);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setData(buildInitialDetail(project));
    setDetailMeta(null);
    setLoadError(null);
    setLoadingExtra(true);
    void loadDetails(false);
  }, [project.path]);

  const loadDetails = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoadingExtra(true);
      }
      setLoadError(null);
      const detail = await apiClient.getProject(project.path, { refresh });
      const { meta, ...rest } = detail;
      setData(rest as ProjectDetailData);
      setDetailMeta(meta ?? null);
    } catch (error) {
      console.error('Failed to load project details:', error);
      setLoadError((error as Error).message);
      if (!refresh) {
        showToast('加载详情失败', 'error');
      }
    } finally {
      setLoadingExtra(false);
      setRefreshing(false);
    }
  }, [project.name, showToast]);

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
      await loadDetails(true);
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
      await loadDetails(true);
    } catch (error) {
      showToast('切换分支失败: ' + (error as Error).message, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [project.name, loadDetails, showToast]);

  const handleRevealInFinder = useCallback(async () => {
    setActionLoading('reveal');
    try {
      await apiClient.revealInFinder(project.name);
      showToast('已在文件管理器中显示', 'success');
    } catch (error) {
      showToast('打开失败: ' + (error as Error).message, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [project.name, showToast]);

  const handleOpenPackageJson = useCallback(async () => {
    setActionLoading('package');
    try {
      await apiClient.openProject(project.name, undefined, 'package.json');
      showToast('已打开 package.json', 'success');
    } catch (error) {
      showToast('打开失败: ' + (error as Error).message, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [project.name, showToast]);

  const handleCleanDir = useCallback(async (dirName: string) => {
    if (!confirm(`确定要删除 ${dirName} 目录吗？此操作不可撤销。`)) return;
    setActionLoading(`clean-${dirName}`);
    try {
      const result = await apiClient.cleanProjectDir(project.name, dirName);
      if (result.success) {
        const mb = result.freedBytes ? (result.freedBytes / 1024 / 1024).toFixed(0) : '?';
        showToast(`已删除 ${dirName}，释放约 ${mb} MB`, 'success');
        await loadDetails(true);
      } else {
        showToast(result.error || '删除失败', 'error');
      }
    } catch (error) {
      showToast('删除失败: ' + (error as Error).message, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [project.name, loadDetails, showToast]);

  const handleCreateBranch = useCallback(async () => {
    const name = newBranchName.trim();
    if (!name) {
      showToast('请输入分支名', 'error');
      return;
    }
    setActionLoading('createBranch');
    try {
      const result = await apiClient.createBranch(project.name, name) as { success: boolean; error?: string };
      if (result.success) {
        showToast(`已创建分支 ${name}`, 'success');
        setShowBranchModal(false);
        setNewBranchName('');
        await loadDetails(true);
      } else {
        showToast(result.error || '创建分支失败', 'error');
      }
    } catch (error) {
      showToast('创建分支失败: ' + (error as Error).message, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [project.name, newBranchName, loadDetails, showToast]);

  const extraReady = !loadingExtra;

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
        {detailMeta?.cachedAt && (
          <span className="text-xs text-slate-400">
            · 更新于 {formatRelativeTime(new Date(detailMeta.cachedAt))}
            {(detailMeta.refreshing || refreshing) ? ' · 后台刷新中' : detailMeta.fromCache ? ' · 缓存' : ''}
          </span>
        )}
      </nav>

      {loadError && !extraReady && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
          加载详情失败: {loadError}
          <button onClick={() => loadDetails(true)} className="ml-3 underline">重试</button>
        </div>
      )}

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
            {data.tags && data.tags.length > 0 && (
              <div className="mt-2">
                <ProjectTags tags={data.tags} size="sm" />
              </div>
            )}
            <Tooltip content={project.path}>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-1 flex items-center gap-1 truncate max-w-xl">
                <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="truncate">{formatProjectPath(project.path)}</span>
              </p>
            </Tooltip>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
          <Tooltip content="重新加载分支、依赖、空间占用等详情">
            <button
              onClick={() => loadDetails(true)}
              disabled={refreshing || loadingExtra}
              className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm disabled:opacity-50"
            >
              {(refreshing || (detailMeta?.refreshing && loadingExtra)) ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              )}
              刷新详情
            </button>
          </Tooltip>
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
          <Tooltip content="在访达 / 资源管理器中显示项目目录">
            <button
              onClick={handleRevealInFinder}
              disabled={actionLoading !== null}
              className="flex items-center justify-center p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
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
                <div className="text-xs text-slate-500 mb-1">项目路径</div>
                <div className="text-sm font-mono bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-700 break-all text-slate-700 dark:text-slate-300">
                  {project.path}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">远程仓库 (Remote)</div>
                <div className="text-sm font-mono bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-700 break-all text-slate-700 dark:text-slate-300">
                  {project.remote || '-'}
                </div>
                {project.remote && (
                  <div className="mt-2">
                    <RepoLinks remote={project.remote} branch={project.branch} variant="inline" />
                  </div>
                )}
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

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              项目标签
            </h3>
            <ProjectTagEditor
              projectId={project.path}
              tags={data.tags ?? []}
              presets={tagPresets}
              onChange={(tags) => setData((prev) => (prev ? { ...prev, tags } : prev))}
            />
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
                <button
                  type="button"
                  onClick={handleOpenPackageJson}
                  disabled={actionLoading !== null}
                  className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                >
                  查看 package.json
                </button>
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
            {loadingExtra && data.size.total === 0 ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                正在计算空间占用...
              </div>
            ) : data.size.total > 0 ? (
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
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleCleanDir(item.name);
                            }}
                            disabled={actionLoading !== null}
                            className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          >
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
            ) : null}
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
                  <button
                    type="button"
                    onClick={() => setShowBranchModal(true)}
                    disabled={actionLoading !== null}
                    className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-sm shadow-sm flex items-center gap-1 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
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
              {loadingExtra && data.branches.length === 0 ? (
                <div className="flex items-center justify-center h-full gap-2 text-sm text-slate-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                  正在加载分支与提交记录...
                </div>
              ) : data.branches.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-slate-400">
                  暂无分支信息
                </div>
              ) : (
              data.branches.slice(0, 15).map((branch) => (
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleCheckout(branch.name);
                        }}
                        className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded"
                      >
                        切换
                      </button>
                    </Tooltip>
                  )}
                </div>
              )))}
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
                {data.commits.slice(0, 5).map((commit) => (
                  <div key={commit.hash} className="relative">
                    <div className={`absolute -left-6 top-1 w-4 h-4 bg-white dark:bg-slate-800 border-2 ${data.commits[0]?.hash === commit.hash ? 'border-blue-500' : 'border-slate-300 dark:border-slate-600'} rounded-full`} />
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {commit.message || '(无提交说明)'}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                      <Tooltip content="提交哈希">
                        <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{commit.hash}</span>
                      </Tooltip>
                      {commit.author && <span>{commit.author}</span>}
                      {commit.date && (
                        <span>{formatRelativeTime(new Date(commit.date))}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">暂无提交记录</p>
            )}
          </div>
        </div>
      </div>

      {showBranchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">创建新分支</h3>
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreateBranch();
              }}
              placeholder="例如: feature/my-task"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowBranchModal(false);
                  setNewBranchName('');
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleCreateBranch()}
                disabled={actionLoading === 'createBranch'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading === 'createBranch' ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
