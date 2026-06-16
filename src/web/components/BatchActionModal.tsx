import { useState } from 'react';
import { useToast } from './Toast';

interface BatchActionModalProps {
  action: 'upgrade' | 'createBranch' | 'commit' | 'push';
  selectedCount: number;
  onConfirm: (params: Record<string, string>) => void;
  onCancel: () => void;
}

export function BatchActionModal({ action, selectedCount, onConfirm, onCancel }: BatchActionModalProps) {
  const [packageName, setPackageName] = useState('');
  const [packageVersion, setPackageVersion] = useState('');
  const [branchName, setBranchName] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const { showToast } = useToast();

  const handleSubmit = () => {
    switch (action) {
      case 'upgrade':
        if (!packageName.trim()) {
          showToast('请输入包名', 'error');
          return;
        }
        onConfirm({ packageName: packageName.trim(), packageVersion: packageVersion.trim() });
        break;
      case 'createBranch':
        if (!branchName.trim()) {
          showToast('请输入分支名', 'error');
          return;
        }
        onConfirm({ branchName: branchName.trim() });
        break;
      case 'commit':
        if (!commitMessage.trim()) {
          showToast('请输入提交信息', 'error');
          return;
        }
        onConfirm({ commitMessage: commitMessage.trim() });
        break;
      case 'push':
        onConfirm({});
        break;
    }
  };

  const getTitle = () => {
    switch (action) {
      case 'upgrade': return '批量升级依赖';
      case 'createBranch': return '批量创建分支';
      case 'commit': return '批量提交';
      case 'push': return '批量推送';
    }
  };

  const renderContent = () => {
    switch (action) {
      case 'upgrade':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                包名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                placeholder="例如: react, lodash, @types/node"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                版本 (可选)
              </label>
              <input
                type="text"
                value={packageVersion}
                onChange={(e) => setPackageVersion(e.target.value)}
                placeholder="留空则升级到最新版本，例如: 18.0.0, ^2.0.0"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
            <p className="text-sm text-gray-500">
             将对 {selectedCount} 个项目执行 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">pnpm update {packageName || '{包名}'}</code>
            </p>
          </div>
        );

      case 'createBranch':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                分支名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="例如: upgrade/react-18, feature/new-ui"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                autoFocus
              />
            </div>
            <p className="text-sm text-gray-500">
              将在 {selectedCount} 个项目中创建并切换到新分支 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{branchName || '{分支名}'}</code>
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              ⚠️ 如果有未提交的更改，操作将失败
            </p>
          </div>
        );

      case 'commit':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                提交信息 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="例如: chore: upgrade react to 18.0.0"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                rows={3}
                autoFocus
              />
            </div>
            <p className="text-sm text-gray-500">
              将对 {selectedCount} 个项目执行提交，包含所有已暂存的更改
            </p>
          </div>
        );

      case 'push':
        return (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              确定要将 {selectedCount} 个项目推送到远程仓库吗？
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              ⚠️ 请确保已经提交了所有更改
            </p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {getTitle()}
        </h3>

        {renderContent()}

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            确认执行
          </button>
        </div>
      </div>
    </div>
  );
}