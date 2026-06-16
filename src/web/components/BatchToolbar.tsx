import React, { useState } from 'react';
import { apiClient } from '../lib/api';
import { BatchProgress } from '../components/BatchProgress';
import { BatchActionModal } from '../components/BatchActionModal';
import { useToast } from '../components/Toast';
import { Tooltip } from '../components/Tooltip';

interface BatchToolbarProps {
  selectedCount: number;
  selectedProjects: string[];
  onComplete: () => void;
}

type BatchActionType = 'install' | 'pull' | 'clean' | 'upgrade' | 'createBranch' | 'commit' | 'push' | 'checkout';

export function BatchToolbar({ selectedCount, selectedProjects, onComplete }: BatchToolbarProps) {
  const [running, setRunning] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobTotal, setJobTotal] = useState(0);
  const [modalAction, setModalAction] = useState<BatchActionType | null>(null);
  const { showToast } = useToast();

  const handleBatchAction = async (actionName: BatchActionType, params: Record<string, string> = {}) => {
    setRunning(true);
    setAction(actionName);
    setModalAction(null);

    try {
      const result = await apiClient.startBatch(actionName, selectedProjects, params.packageName, params.packageVersion, params.branchName, params.commitMessage);
      setJobId(result.jobId);
      setJobTotal(result.total);
    } catch (error) {
      showToast('批量操作失败: ' + (error as Error).message, 'error');
      setRunning(false);
      setAction(null);
    }
  };

  const handleJobComplete = () => {
    setRunning(false);
    setAction(null);
    setJobId(null);
    onComplete();
  };

  const openModal = (actionType: BatchActionType) => {
    setModalAction(actionType);
  };

  return (
    <>
      {/* 浮动批量操作栏 (Glassmorphism UI) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 glass border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-4 animate-slide-up z-50">
        {/* 已选择计数 */}
        <div className="flex flex-col flex-shrink-0">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">已选择</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white leading-none">
            {selectedCount} 个项目
          </span>
        </div>

        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>

        {/* 操作按钮组 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Git 操作 */}
          <Tooltip content="批量拉取最新代码">
            <button
              onClick={() => handleBatchAction('pull')}
              disabled={running}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                <path d="M11 18H8a2 2 0 0 1-2-2V9" />
              </svg>
              Pull
            </button>
          </Tooltip>

          <Tooltip content="批量创建并切换到新分支">
            <button
              onClick={() => openModal('createBranch')}
              disabled={running}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="6" y1="3" x2="6" y2="15" />
                <circle cx="18" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <path d="M18 9a9 9 0 0 0-9 9" />
              </svg>
              切换分支
            </button>
          </Tooltip>

          {/* 分隔线 */}
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

          {/* 依赖操作 */}
          <Tooltip content="批量安装依赖">
            <button
              onClick={() => handleBatchAction('install')}
              disabled={running}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              Install
            </button>
          </Tooltip>

          <Tooltip content="批量更新指定包版本">
            <button
              onClick={() => openModal('upgrade')}
              disabled={running}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              升级包
            </button>
          </Tooltip>

          {/* 分隔线 */}
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

          {/* 更多操作 */}
          <Tooltip content="更多批量操作">
            <button
              onClick={() => openModal('commit')}
              disabled={running}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
              更多
            </button>
          </Tooltip>
        </div>

        {/* 取消选择 */}
        <Tooltip content="取消选择">
          <button
            onClick={onComplete}
            disabled={running}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors disabled:opacity-50 ml-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </Tooltip>

        {running && !jobId && (
          <span className="text-brand-600 animate-pulse text-sm ml-2">
            正在执行 {action}...
          </span>
        )}
      </div>

      {/* 批量操作弹窗 */}
      {modalAction && (
        <BatchActionModal
          action={modalAction}
          selectedCount={selectedCount}
          onConfirm={(params) => handleBatchAction(modalAction, params)}
          onCancel={() => setModalAction(null)}
        />
      )}

      {/* 进度显示 */}
      {jobId && (
        <BatchProgress
          jobId={jobId}
          total={jobTotal}
          onComplete={handleJobComplete}
        />
      )}
    </>
  );
}
