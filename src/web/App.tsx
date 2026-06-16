import { useState, useEffect } from 'react';
import { ProjectList } from './pages/ProjectList';
import { ProjectDetail } from './pages/ProjectDetail';
import { Settings } from './pages/Settings';
import { HealthCheck } from './pages/HealthCheck';
import { ToastProvider } from './components/Toast';
import { Tooltip } from './components/Tooltip';
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
  const [search, setSearch] = useState('');

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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors flex flex-col">
        {/* 顶部导航栏 */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* 左侧 Logo 和导航 */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => setPage('list')}
                className="flex items-center gap-2 text-brand-600 dark:text-brand-500 font-bold text-xl hover:text-brand-700 dark:hover:text-brand-400 transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                <span>DevHub</span>
              </button>

              {/* 导航按钮组 */}
              <nav className="hidden md:flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setPage('list')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${page === 'list'
                    ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  项目列表
                </button>
                <button
                  onClick={() => setPage('health')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${page === 'health'
                    ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  健康检查
                </button>
              </nav>
            </div>

            {/* 右侧搜索和设置 */}
            <div className="flex items-center gap-4">
              {/* 搜索框 */}
              <div className="relative hidden sm:block w-64">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="搜索项目、分支..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-brand-500 focus:bg-white dark:focus:bg-slate-800 rounded-md outline-none transition-all dark:text-white placeholder-slate-400"
                />
              </div>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

              {/* 主题切换 */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                <Tooltip content="浅色模式" position="bottom">
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-1.5 rounded transition-all ${theme === 'light'
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-yellow-500'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                      }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  </button>
                </Tooltip>
                <Tooltip content="跟随系统" position="bottom">
                  <button
                    onClick={() => setTheme('auto')}
                    className={`p-1.5 rounded transition-all ${theme === 'auto'
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-brand-500'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                      }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </button>
                </Tooltip>
                <Tooltip content="深色模式" position="bottom">
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-1.5 rounded transition-all ${theme === 'dark'
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-500'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                      }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  </button>
                </Tooltip>
              </div>

              {/* 设置按钮 */}
              <Tooltip content="打开设置" position="bottom">
                <button
                  onClick={() => setPage('settings')}
                  className={`p-2 rounded-md transition-colors ${page === 'settings'
                    ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
              </Tooltip>
            </div>
          </div>
        </header>

        {/* 主体内容 */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {page === 'list' && (
            <ProjectList onSelectProject={handleSelectProject} search={search} onSearchChange={setSearch} />
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