import React, { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

interface HealthIssue {
  type: string;
  message: string;
  fixable: boolean;
}

interface HealthResult {
  project: string;
  healthy: boolean;
  issues: HealthIssue[];
}

export function HealthCheck({ onBack }: { onBack: () => void }) {
  const [results, setResults] = useState<HealthResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(false);

  useEffect(() => {
    runCheck();
  }, []);

  const runCheck = async () => {
    setLoading(true);
    try {
      // Get all projects and check each
      const { projects } = await apiClient.getProjects();
      const healthResults: HealthResult[] = [];

      for (const project of projects) {
        const issues: HealthIssue[] = [];

        // Check git status
        if (project.status === 'dirty') {
          issues.push({
            type: 'git_dirty',
            message: `有 ${project.uncommittedChanges || 0} 处未提交的更改`,
            fixable: false,
          });
        }

        // Check behind remote
        if (project.behind && project.behind > 5) {
          issues.push({
            type: 'git_behind',
            message: `落后 origin/${project.branch} ${project.behind} 个提交`,
            fixable: true,
          });
        }

        // Check if has package.json but no package manager
        if (project.hasPackageJson && !project.packageManager) {
          issues.push({
            type: 'no_pm',
            message: '存在 package.json 但未找到锁文件',
            fixable: false,
          });
        }

        healthResults.push({
          project: project.name,
          healthy: issues.length === 0,
          issues,
        });
      }

      setResults(healthResults);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFix = async (projectName: string) => {
    setFixing(true);
    try {
      await apiClient.gitPull(projectName);
      await runCheck();
    } catch (error) {
      console.error('Fix failed:', error);
    } finally {
      setFixing(false);
    }
  };

  const healthyCount = results.filter(r => r.healthy).length;
  const unhealthyCount = results.filter(r => !r.healthy).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
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

      <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white flex items-center justify-between gap-4">
        <span>项目健康检查</span>
        <button
          type="button"
          onClick={() => void runCheck()}
          disabled={loading || fixing}
          className="text-sm px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          重新检查
        </button>
      </h2>

      {/* Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm mb-6 flex justify-around">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-500 mb-1 flex items-center justify-center gap-2">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            {healthyCount}
          </div>
          <div className="text-sm text-slate-500">健康项目</div>
        </div>
        <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
        <div className="text-center">
          <div className="text-3xl font-bold text-amber-500 mb-1 flex items-center justify-center gap-2">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {unhealthyCount}
          </div>
          <div className="text-sm text-slate-500">发现问题</div>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {results.map((result) => (
          <div
            key={result.project}
            className={`bg-white dark:bg-slate-800 rounded-xl border-y border-r border-slate-200 dark:border-slate-700 p-5 shadow-sm ${
              result.healthy ? '' : 'border-l-4 border-l-amber-500'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <svg className={`w-4 h-4 ${result.healthy ? 'text-slate-400' : 'text-amber-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M1.05 12H7m10.95 12H17m0-12h5.95M12 1.05V7m0 10.95V22.95" />
                </svg>
                {result.project}
              </h3>
              {result.healthy ? (
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-500">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  健康
                </span>
              ) : (
                <span className="px-2 py-1 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded text-xs font-medium border border-amber-200 dark:border-amber-800/50">
                  ⚠ {result.issues.length} 个问题
                </span>
              )}
            </div>

            {!result.healthy && (
              <div className="space-y-2">
                {result.issues.map((issue, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-sm"
                  >
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="6" y1="3" x2="6" y2="15" />
                        <circle cx="18" cy="6" r="3" />
                        <circle cx="6" cy="18" r="3" />
                        <path d="M18 9a9 9 0 0 0-9 9" />
                      </svg>
                      {issue.message}
                    </span>
                    {issue.fixable && (
                      <button
                        onClick={() => handleFix(result.project)}
                        disabled={fixing}
                        className="text-blue-600 hover:text-blue-700 font-medium hover:underline disabled:opacity-50 transition-colors"
                      >
                        一键同步
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}