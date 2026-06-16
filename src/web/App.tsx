import { useState, useEffect } from 'react';
import { ProjectList } from './pages/ProjectList';
import { ProjectDetail } from './pages/ProjectDetail';
import { Settings } from './pages/Settings';
import { HealthCheck } from './pages/HealthCheck';
import { ToastProvider } from './components/Toast';
import type { Project } from './lib/types';

type Page = 'list' | 'detail' | 'settings' | 'health';

type Theme = 'light' | 'dark' | 'auto';

export default function App() {
  const [page, setPage] = useState<Page>('list');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('devhub-theme') as Theme) || 'auto';
    }
    return 'auto';
  });

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('devhub-theme', theme);
  }, [theme]);

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setPage('detail');
  };

  const handleBack = () => {
    setPage('list');
    setSelectedProject(null);
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPage('list')}
                className="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
              >
                DevHub
              </button>
              <nav className="flex gap-2">
                <button
                  onClick={() => setPage('health')}
                  className={`px-3 py-1 text-sm rounded ${
                    page === 'health'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  健康检查
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {/* Theme toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`px-2 py-1 text-sm rounded ${
                    theme === 'light'
                      ? 'bg-white dark:bg-gray-600 shadow text-yellow-600'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                  title="浅色模式"
                >
                  ☀️
                </button>
                <button
                  onClick={() => setTheme('auto')}
                  className={`px-2 py-1 text-sm rounded ${
                    theme === 'auto'
                      ? 'bg-white dark:bg-gray-600 shadow text-blue-600'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                  title="跟随系统"
                >
                  💻
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`px-2 py-1 text-sm rounded ${
                    theme === 'dark'
                      ? 'bg-white dark:bg-gray-600 shadow text-indigo-600'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                  title="深色模式"
                >
                  🌙
                </button>
              </div>

              <button
                onClick={() => setPage('settings')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ⚙️ 设置
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {page === 'list' && (
            <ProjectList onSelectProject={handleSelectProject} />
          )}
          {page === 'detail' && selectedProject && (
            <ProjectDetail
              project={selectedProject}
              onBack={handleBack}
            />
          )}
          {page === 'settings' && (
            <Settings onBack={handleBack} />
          )}
          {page === 'health' && (
            <HealthCheck onBack={handleBack} />
          )}
        </main>
      </div>
    </ToastProvider>
  );
}