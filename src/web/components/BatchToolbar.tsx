import { useState } from 'react';
import { apiClient } from '../lib/api';
import { BatchProgress } from '../components/BatchProgress';
import { BatchActionModal } from '../components/BatchActionModal';
import { useToast } from '../components/Toast';

interface BatchToolbarProps {
  selectedCount: number;
  selectedProjects: string[];
  onComplete: () => void;
}

type BatchActionType = 'install' | 'pull' | 'clean' | 'upgrade' | 'createBranch' | 'commit' | 'push';

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
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-gray-900 dark:text-white font-medium">
            ☑ 已选 {selectedCount} 个项目
          </span>

          <div className="flex gap-2 flex-wrap">
            {/* 基础操作 */}
            <button
              onClick={() => handleBatchAction('install')}
              disabled={running}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>📦</span> 安装依赖
            </button>
            <button
              onClick={() => handleBatchAction('pull')}
              disabled={running}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>🔄</span> 拉取
            </button>
            <button
              onClick={() => handleBatchAction('clean')}
              disabled={running}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>🧹</span> 清理
            </button>

            {/* 分隔线 */}
            <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-2" />

            {/* 升级流程操作 */}
            <button
              onClick={() => openModal('upgrade')}
              disabled={running}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>⬆️</span> 升级依赖
            </button>
            <button
              onClick={() => openModal('createBranch')}
              disabled={running}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>🌿</span> 创建分支
            </button>
            <button
              onClick={() => openModal('commit')}
              disabled={running}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>📝</span> 提交
            </button>
            <button
              onClick={() => openModal('push')}
              disabled={running}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>⬆️</span> 推送
            </button>

            {/* 清除选择 */}
            <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-2" />
            <button
              onClick={onComplete}
              disabled={running}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              ✕ 清除
            </button>
          </div>

          {running && !jobId && (
            <span className="text-blue-600 animate-pulse">
              正在执行 {action}...
            </span>
          )}
        </div>
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