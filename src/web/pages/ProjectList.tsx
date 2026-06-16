import { useState, useEffect, useCallback } from 'react';
import type { Project } from '../lib/types';
import { apiClient } from '../lib/api';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectTable } from '../components/ProjectTable';
import { SearchBar } from '../components/SearchBar';
import { BatchToolbar } from '../components/BatchToolbar';

interface ProjectListProps {
  onSelectProject: (project: Project) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
}

type ViewMode = 'card' | 'table';

export function ProjectList({ onSelectProject, search: externalSearch, onSearchChange }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalSearch, setInternalSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [sort, setSort] = useState<string>('recent');
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('devhub-view-mode') as ViewMode) || 'card';
    }
    return 'card';
  });

  // 使用外部或内部搜索状态
  const search = externalSearch !== undefined ? externalSearch : internalSearch;
  const setSearch = onSearchChange || setInternalSearch;

  // Save view preference
  useEffect(() => {
    localStorage.setItem('devhub-view-mode', viewMode);
  }, [viewMode]);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getProjects({ filter, sort, search });
      setProjects(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter, sort, search]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleToggleSelect = (projectPath: string) => {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectPath)) {
        next.delete(projectPath);
      } else {
        next.add(projectPath);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedProjects.size === projects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(projects.map((p) => p.path)));
    }
  };

  const handleClearSelection = () => {
    setSelectedProjects(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
        <p className="text-red-600 dark:text-red-400">错误: {error}</p>
        <button
          onClick={loadProjects}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* 页面头部操作区 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            工作区
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-medium px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              {projects.length} 个项目
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">管理您本地所有的开发项目，切换分支或同步配置。</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm">
            <svg className="w-4 h-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            导出环境配置
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            扫描目录
          </button>
        </div>
      </div>

      {/* 工具栏 */}
      <SearchBar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        sort={sort}
        onSortChange={setSort}
        totalCount={projects.length}
        selectedCount={selectedProjects.size}
        onSelectAll={handleSelectAll}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {projects.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <svg className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <p className="text-slate-500 dark:text-slate-400">没有找到项目</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">点击"扫描目录"来发现项目</p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {projects.map((project) => (
            <ProjectCard
              key={project.path}
              project={project}
              selected={selectedProjects.has(project.path)}
              onSelect={() => handleToggleSelect(project.path)}
              onClick={() => onSelectProject(project)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <ProjectTable
            projects={projects}
            selectedProjects={selectedProjects}
            onSelect={handleToggleSelect}
            onClick={onSelectProject}
          />
        </div>
      )}

      {selectedProjects.size > 0 && (
        <BatchToolbar
          selectedCount={selectedProjects.size}
          selectedProjects={Array.from(selectedProjects)}
          onComplete={handleClearSelection}
        />
      )}
    </div>
  );
}