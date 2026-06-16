import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import type { Config } from '../lib/types';

interface SettingsProps {
  onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await apiClient.getConfig();
      setConfig(data);
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await apiClient.updateConfig(config);
      alert('设置已保存！');
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500">加载设置中...</div>;
  }

  if (!config) {
    return <div className="text-red-500">加载设置失败</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="text-blue-600 hover:text-blue-700 mb-4"
      >
        ← 返回
      </button>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        设置
      </h2>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        {/* Workspace */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
            工作区
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                扫描根目录
              </label>
              <textarea
                value={config.workspace.roots.join('\n')}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    workspace: {
                      ...config.workspace,
                      roots: e.target.value.split('\n').filter(Boolean),
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                最大深度
              </label>
              <input
                type="number"
                value={config.workspace.maxDepth}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    workspace: {
                      ...config.workspace,
                      maxDepth: parseInt(e.target.value, 10),
                    },
                  })
                }
                className="w-24 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Editor */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
            编辑器
          </h3>
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
              默认编辑器
            </label>
            <select
              value={config.editor.default}
              onChange={(e) =>
                setConfig({
                  ...config,
                  editor: { ...config.editor, default: e.target.value },
                })
              }
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="cursor">Cursor</option>
              <option value="code">VS Code</option>
              <option value="webstorm">WebStorm</option>
            </select>
          </div>
        </div>

        {/* Terminal */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
            终端
          </h3>
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
              默认终端
            </label>
            <select
              value={config.terminal.default}
              onChange={(e) =>
                setConfig({
                  ...config,
                  terminal: { ...config.terminal, default: e.target.value },
                })
              }
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="terminal">Terminal</option>
              <option value="iterm2">iTerm2</option>
              <option value="warp">Warp</option>
            </select>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}