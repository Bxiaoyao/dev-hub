import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { useToast } from '../components/Toast';
import type { Config } from '../lib/types';

interface SettingsProps {
  onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

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
      showToast('设置已保存！', 'success');
    } catch (error) {
      console.error('Failed to save config:', error);
      showToast('保存设置失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12 text-red-500">
        加载设置失败
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-24">
      {/* 返回按钮 */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        返回
      </button>

      <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">全局设置</h2>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-8">
        {/* 编辑器配置 */}
        <section>
          <h3 className="text-lg font-semibold border-b border-slate-100 dark:border-slate-700 pb-2 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-3.77 3.77a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1 7.94 7.94l-3.77 3.77a1 1 0 0 0 0 1.4l-1.6 1.6a1 1 0 0 0-1.4 0l-3.77-3.77a6 6 0 0 1-7.94-7.94l-3.77-3.77a1 1 0 0 0-1.4 0l-1.6-1.6a1 1 0 0 0 0-1.4l3.77-3.77a6 6 0 0 1 7.94-7.94l3.77-3.77a1 1 0 0 0 1.4 0z" />
            </svg>
            工具链偏好
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">默认编辑器</label>
              <select
                value={config.editor.default}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    editor: { ...config.editor, default: e.target.value },
                  })
                }
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="cursor">Cursor</option>
                <option value="code">VS Code</option>
                <option value="webstorm">WebStorm</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">默认终端</label>
              <select
                value={config.terminal.default}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    terminal: { ...config.terminal, default: e.target.value },
                  })
                }
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="terminal">系统自带</option>
                <option value="iterm2">iTerm2</option>
                <option value="warp">Warp</option>
              </select>
            </div>
          </div>
        </section>

        {/* Git 凭据配置 */}
        <section>
          <h3 className="text-lg font-semibold border-b border-slate-100 dark:border-slate-700 pb-2 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6m5.2-14.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m14.2 5.2l-4.2-4.2m0-6l4.2-4.2" />
            </svg>
            Git 凭据配置
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            配置 Git 认证信息，避免每次操作都需要输入密码。推荐使用 SSH 密钥认证。
          </p>

          <div className="space-y-4">
            {/* 使用 SSH */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="useSSH"
                checked={config.git?.credentials?.useSSH ?? true}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    git: {
                      ...config.git,
                      credentials: {
                        ...config.git?.credentials,
                        useSSH: e.target.checked,
                      },
                      rememberCredentials: config.git?.rememberCredentials ?? false,
                    },
                  })
                }
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="useSSH" className="text-sm text-slate-700 dark:text-slate-300">
                使用 SSH 密钥认证（推荐）
              </label>
            </div>

            {/* 仅在不使用 SSH 时显示 HTTPS 凭据配置 */}
            {config.git?.credentials?.useSSH === false && (
              <>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>注意：</strong>HTTPS 凭据将以明文形式存储在配置文件中。建议使用 SSH 密钥或系统 Git 凭据助手。
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Git 用户名
                  </label>
                  <input
                    type="text"
                    placeholder="your-username"
                    value={config.git?.credentials?.username ?? ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        git: {
                          ...config.git,
                          credentials: {
                            ...config.git?.credentials,
                            username: e.target.value || undefined,
                          },
                          rememberCredentials: config.git?.rememberCredentials ?? false,
                        },
                      })
                    }
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    密码 / Personal Access Token
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={config.git?.credentials?.password ?? config.git?.credentials?.token ?? ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        git: {
                          ...config.git,
                          credentials: {
                            ...config.git?.credentials,
                            password: e.target.value || undefined,
                            token: undefined, // 清除 token 字段
                          },
                          rememberCredentials: config.git?.rememberCredentials ?? false,
                        },
                      })
                    }
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    对于 GitHub，推荐使用 Personal Access Token (PAT) 而非密码
                  </p>
                </div>
              </>
            )}

            {/* 记住凭据选项 */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="rememberCredentials"
                checked={config.git?.rememberCredentials ?? false}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    git: {
                      ...config.git,
                      rememberCredentials: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="rememberCredentials" className="text-sm text-slate-700 dark:text-slate-300">
                记住凭据（保存到配置文件）
              </label>
            </div>
          </div>
        </section>

        {/* 扫描目录 */}
        <section>
          <h3 className="text-lg font-semibold border-b border-slate-100 dark:border-slate-700 pb-2 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            自动扫描目录
          </h3>
          <p className="text-sm text-slate-500 mb-3">DevHub 将在启动时自动扫描以下目录中的 Git 项目。</p>
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
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 text-sm font-mono h-24 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-400">扫描深度:</label>
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
              className="w-16 border border-slate-300 dark:border-slate-600 rounded p-1 text-center bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </section>

      </div>

      {/* 底部操作栏 — 固定显示，避免被页面内容遮挡 */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {saving && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
              </svg>
            )}
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}