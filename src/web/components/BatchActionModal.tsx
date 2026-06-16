import { useState } from 'react';
import { useToast } from './Toast';

interface BatchActionModalProps {
  action: 'upgrade' | 'createBranch' | 'commit' | 'push' | 'checkout';
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
      case 'checkout':
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
      case 'checkout': return '批量切换分支';
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
              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
                包名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                placeholder="例如: react, lodash, @types/node"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
                目标版本 (可选)
              </label>
              <input
                type="text"
                value={packageVersion}
                onChange={(e) => setPackageVersion(e.target.value)}
                placeholder="留空则升级到最新版本，例如: 18.0.0, ^2.0.0"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                将对 <span className="font-semibold text-brand-600">{selectedCount}</span> 个项目执行：
              </p>
              <code className="mt-2 block text-sm bg-white dark:bg-slate-800 px-3 py-2 rounded border border-slate-200 dark:border-slate-700 font-mono">
                pnpm update {packageName || '{包名}'}{packageVersion && `@${packageVersion}`}
              </code>
            </div>
          </div>
        );

      case 'createBranch':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
                新分支名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="例如: upgrade/react-18, feature/new-ui"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                autoFocus
              />
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                将在 <span className="font-semibold text-brand-600">{selectedCount}</span> 个项目中创建并切换到新分支：
              </p>
              <code className="mt-2 block text-sm bg-white dark:bg-slate-800 px-3 py-2 rounded border border-slate-200 dark:border-slate-700 font-mono">
                git checkout -b {branchName || '{分支名}'}
              </code>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              如果有未提交的更改，操作将失败
            </p>
          </div>
        );

      case 'checkout':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
                分支名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="例如: main, develop, feature/xxx"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                autoFocus
              />
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                将对 <span className="font-semibold text-brand-600">{selectedCount}</span> 个项目执行切换分支：
              </p>
              <code className="mt-2 block text-sm bg-white dark:bg-slate-800 px-3 py-2 rounded border border-slate-200 dark:border-slate-700 font-mono">
                git checkout {branchName || '{分支名}'}
              </code>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              如果有未提交的更改，操作将失败
            </p>
          </div>
        );

      case 'commit':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
                提交信息 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="例如: chore: upgrade react to 18.0.0"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none"
                rows={3}
                autoFocus
              />
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                将对 <span className="font-semibold text-brand-600">{selectedCount}</span> 个项目执行提交
              </p>
            </div>
          </div>
        );

      case 'push':
        return (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                确定要将 <span className="font-semibold text-brand-600">{selectedCount}</span> 个项目推送到远程仓库吗？
              </p>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              请确保已经提交了所有更改
            </p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {getTitle()}
        </h3>

        {renderContent()}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
          >
            确认执行
          </button>
        </div>
      </div>
    </div>
  );
}
