import { useState, useEffect } from 'react';
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
      const projects = await apiClient.getProjects();
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
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="text-blue-600 hover:text-blue-700 mb-4"
      >
        ← 返回
      </button>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        项目健康检查
      </h2>

      {/* Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between">
          <span className="text-green-600 dark:text-green-400 text-lg font-medium">
            ✓ {healthyCount} 健康
          </span>
          <span className="text-yellow-600 dark:text-yellow-400 text-lg font-medium">
            ⚠ {unhealthyCount} 有问题
          </span>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {results.map((result) => (
          <div
            key={result.project}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${
              result.healthy ? '' : 'border-l-4 border-yellow-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {result.project}
              </h3>
              {result.healthy ? (
                <span className="text-green-600 dark:text-green-400">✅ 健康</span>
              ) : (
                <span className="text-yellow-600 dark:text-yellow-400">
                  ⚠ {result.issues.length} 个问题
                </span>
              )}
            </div>

            {!result.healthy && (
              <div className="mt-3 space-y-2">
                {result.issues.map((issue, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600 dark:text-gray-400">
                      • {issue.message}
                    </span>
                    {issue.fixable && (
                      <button
                        onClick={() => handleFix(result.project)}
                        disabled={fixing}
                        className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
                      >
                        修复
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