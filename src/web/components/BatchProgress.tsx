import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

interface BatchProgressProps {
  jobId: string;
  total: number;
  onComplete: () => void;
}

interface BatchResult {
  project: string;
  status: 'success' | 'failed' | 'running' | 'waiting';
  message?: string;
}

interface JobStatus {
  id: string;
  action: string;
  status: 'running' | 'completed' | 'failed';
  total: number;
  completed: number;
  results: BatchResult[];
}

export function BatchProgress({ jobId, total, onComplete }: BatchProgressProps) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (cancelled) return;

    const poll = async () => {
      try {
        const status = await apiClient.getBatchStatus(jobId);
        setJob(status);

        if (status.status === 'completed') {
          setTimeout(onComplete, 2000);
        }
      } catch (error) {
        console.error('获取任务状态失败:', error);
      }
    };

    poll();
    const interval = setInterval(poll, 1000);

    return () => clearInterval(interval);
  }, [jobId, cancelled, onComplete]);

  const handleCancel = () => {
    setCancelled(true);
    onComplete();
  };

  const successCount = job?.results.filter(r => r.status === 'success').length || 0;
  const failedCount = job?.results.filter(r => r.status === 'failed').length || 0;

  const actionText = (action: string) => {
    switch (action) {
      case 'install': return '批量安装';
      case 'pull': return '批量拉取';
      case 'clean': return '批量清理';
      default: return '批量操作';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {actionText(job?.action || '操作')}
          </h3>
          {job?.status === 'running' && (
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
            >
              取消
            </button>
          )}
        </div>

        {/* 进度条 */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span>进度</span>
            <span>{job?.completed || 0} / {total}</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                job?.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${((job?.completed || 0) / total) * 100}%` }}
            />
          </div>
        </div>

        {/* 结果列表 */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {job?.results.map((result, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded"
            >
              <span className="text-sm text-gray-900 dark:text-white">
                {result.project}
              </span>
              <span className={`text-sm ${
                result.status === 'success' ? 'text-green-600 dark:text-green-400' :
                result.status === 'failed' ? 'text-red-600 dark:text-red-400' :
                result.status === 'running' ? 'text-blue-600 dark:text-blue-400' :
                'text-gray-400'
              }`}>
                {result.status === 'success' ? '✓ 完成' :
                 result.status === 'failed' ? `✗ ${result.message || '失败'}` :
                 result.status === 'running' ? '🔄 运行中...' :
                 '⏳ 等待'}
              </span>
            </div>
          ))}
        </div>

        {/* 汇总 */}
        {job?.status === 'completed' && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-green-600 dark:text-green-400">
                ✓ {successCount} 成功
              </span>
              {failedCount > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  ✗ {failedCount} 失败
                </span>
              )}
            </div>
            <button
              onClick={onComplete}
              className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  );
}