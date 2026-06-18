import { useState, useRef } from 'react';
import { apiClient, type ImportResponse } from '../lib/api';
import { useToast } from './Toast';

interface WorkspaceImportModalProps {
  onClose: () => void;
  onComplete?: () => void;
}

export function WorkspaceImportModal({ onClose, onComplete }: WorkspaceImportModalProps) {
  const [targetDir, setTargetDir] = useState('~/Projects');
  const [fileName, setFileName] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setContent(text);
      setFileName(file.name);
      setResult(null);
    } catch {
      showToast('无法读取文件', 'error');
    }
  };

  const handleImport = async () => {
    if (!content?.trim()) {
      showToast('请先选择 YAML 配置文件', 'error');
      return;
    }
    if (!targetDir.trim()) {
      showToast('请输入目标目录', 'error');
      return;
    }

    setImporting(true);
    try {
      const response = await apiClient.importProjects({
        content,
        targetDir: targetDir.trim(),
      });
      setResult(response);
      showToast(
        `导入完成：${response.summary.success}/${response.summary.total} 成功`,
        response.summary.failed > 0 ? 'error' : 'success'
      );
      if (response.summary.success > 0) {
        onComplete?.();
      }
    } catch (error) {
      showToast('导入失败: ' + (error as Error).message, 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
          导入工作区配置
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          上传导出的 YAML 文件，将在目标目录自动 clone 远程仓库并切换到指定分支。
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
              配置文件 <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".yaml,.yml"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-3 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
            >
              {fileName ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  {fileName}
                </span>
              ) : (
                '点击选择 devhub-workspace-*.yaml'
              )}
            </button>
          </div>

          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
              目标目录 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={targetDir}
              onChange={(e) => setTargetDir(e.target.value)}
              placeholder="例如: ~/Work 或 /Users/me/projects"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <p className="text-xs text-slate-400 mt-1">
              每个项目将以仓库名创建子目录，如 ~/Projects/my-app
            </p>
          </div>

          {result && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                结果：{result.summary.success} 成功，{result.summary.failed} 失败
                <span className="text-slate-400 ml-2">→ {result.targetDir}</span>
              </div>
              <ul className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                {result.results.map((item) => (
                  <li
                    key={item.project}
                    className="px-3 py-2 text-sm flex items-start justify-between gap-2"
                  >
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                      {item.project}
                    </span>
                    <span className="shrink-0 text-right">
                      {item.success ? (
                        <span className="text-green-600 dark:text-green-400">
                          {item.cloned ? '已克隆' : item.updated ? '已更新' : '完成'}
                        </span>
                      ) : (
                        <span className="text-red-500" title={item.error}>
                          失败
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {result ? '关闭' : '取消'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={importing || !content}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importing && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              )}
              {importing ? '拉取中...' : '开始拉取'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function downloadYaml(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/x-yaml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportSelectedProjects(
  projectPaths: string[],
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void
): Promise<void> {
  if (projectPaths.length === 0) {
    showToast('请先勾选要导出的项目', 'error');
    return;
  }

  try {
    const result = await apiClient.exportProjects(projectPaths);
    if (!result.success || !result.content) {
      showToast(result.error || '导出失败', 'error');
      return;
    }

    downloadYaml(result.content, result.filename || 'devhub-workspace.yaml');

    const skippedMsg =
      result.skipped && result.skipped > 0
        ? `（${result.skipped} 个无远程地址已跳过）`
        : '';
    showToast(`已导出 ${result.count} 个项目${skippedMsg}`, 'success');
  } catch (error) {
    showToast('导出失败: ' + (error as Error).message, 'error');
  }
}
