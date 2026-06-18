import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Project } from '../lib/types';
import { apiClient, type ProjectsListMeta } from '../lib/api';
import { groupProjectsByParent } from '../lib/group';
import { formatRelativeTime } from '../lib/format';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectTable } from '../components/ProjectTable';
import { ProjectGroupSection } from '../components/ProjectGroupSection';
import { SearchBar } from '../components/SearchBar';
import { BatchToolbar } from '../components/BatchToolbar';
import { WorkspaceImportModal, exportSelectedProjects } from '../components/WorkspaceImportModal';
import { useToast } from '../components/Toast';

interface ProjectListProps {
  onSelectProject: (project: Project) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
}

type ViewMode = 'card' | 'table';
type GroupMode = 'folder' | 'flat';

function loadCollapsedGroups(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem('devhub-collapsed-groups');
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function ProjectList({ onSelectProject, search: externalSearch, onSearchChange }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [listMeta, setListMeta] = useState<ProjectsListMeta | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalSearch, setInternalSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [sort, setSort] = useState<string>('recent');
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('devhub-view-mode') as ViewMode) || 'card';
    }
    return 'card';
  });
  const [groupMode, setGroupMode] = useState<GroupMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('devhub-group-mode') as GroupMode) || 'folder';
    }
    return 'folder';
  });
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(loadCollapsedGroups);
  const [showImportModal, setShowImportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();

  // 使用外部或内部搜索状态
  const search = externalSearch !== undefined ? externalSearch : internalSearch;
  const setSearch = onSearchChange || setInternalSearch;

  // Save view preference
  useEffect(() => {
    localStorage.setItem('devhub-view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('devhub-group-mode', groupMode);
  }, [groupMode]);

  useEffect(() => {
    localStorage.setItem('devhub-collapsed-groups', JSON.stringify([...collapsedGroups]));
  }, [collapsedGroups]);

  const projectGroups = useMemo(() => groupProjectsByParent(projects), [projects]);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apiClient.getProjects({ filter, sort, search, tag: tagFilter || undefined });
      setProjects(result.projects ?? []);
      setListMeta(result.meta ?? null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [filter, sort, search, tagFilter]);

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

  const handleSelectGroup = (groupProjects: Project[]) => {
    const paths = groupProjects.map((p) => p.path);
    const allInGroupSelected = paths.length > 0 && paths.every((p) => selectedProjects.has(p));
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (allInGroupSelected) {
        paths.forEach((p) => next.delete(p));
      } else {
        paths.forEach((p) => next.add(p));
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedProjects(new Set());
  };

  const handleToggleGroup = (parentDir: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(parentDir)) {
        next.delete(parentDir);
      } else {
        next.add(parentDir);
      }
      return next;
    });
  };

  const handleExpandAllGroups = () => {
    setCollapsedGroups(new Set());
  };

  const handleCollapseAllGroups = () => {
    setCollapsedGroups(new Set(projectGroups.map((g) => g.parentDir)));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportSelectedProjects([...selectedProjects], showToast);
    } finally {
      setExporting(false);
    }
  };

  const handleScan = async () => {
    try {
      setScanning(true);
      await apiClient.scanProjects();
      await loadProjects();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setScanning(false);
    }
  };

  if (initialLoading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
    <div className={`animate-fade-in ${loading && !initialLoading ? 'opacity-80' : ''}`}>
      {/* 页面头部操作区 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            工作区
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-medium px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              {projects.length} 个项目
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1 flex-wrap">
            <span>管理您本地所有的开发项目，切换分支或同步配置。</span>
            {listMeta?.cachedAt && (
              <span className="text-xs text-slate-400">
                · 更新于 {formatRelativeTime(new Date(listMeta.cachedAt))}
                {listMeta.refreshing ? ' · 后台刷新中' : listMeta.fromCache ? ' · 缓存' : ''}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleExport}
            disabled={exporting || selectedProjects.size === 0}
            title={selectedProjects.size === 0 ? '请先勾选要导出的项目' : undefined}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
            ) : (
              <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
            导出环境配置
            {selectedProjects.size > 0 && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                {selectedProjects.size}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm"
          >
            <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            导入并拉取
          </button>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors text-sm font-medium shadow-sm disabled:cursor-not-allowed"
          >
            {scanning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                扫描中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                重新扫描
              </>
            )}
          </button>
        </div>
      </div>

      {/* 工具栏 */}
      <SearchBar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        tag={tagFilter}
        onTagChange={setTagFilter}
        tagPresets={listMeta?.tagPresets ?? ['工作', '个人', '归档']}
        sort={sort}
        onSortChange={setSort}
        groupMode={groupMode}
        onGroupModeChange={setGroupMode}
        onExpandAllGroups={handleExpandAllGroups}
        onCollapseAllGroups={handleCollapseAllGroups}
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
      ) : groupMode === 'folder' ? (
        <div>
          {projectGroups.map((group) => (
            <ProjectGroupSection
              key={group.parentDir}
              parentDir={group.parentDir}
              projects={group.projects}
              collapsed={collapsedGroups.has(group.parentDir)}
              onToggle={() => handleToggleGroup(group.parentDir)}
              viewMode={viewMode}
              selectedProjects={selectedProjects}
              onSelect={handleToggleSelect}
              onClick={onSelectProject}
              onSelectAll={() => handleSelectGroup(group.projects)}
              onTagClick={setTagFilter}
            />
          ))}
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
              onTagClick={setTagFilter}
              showPath
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
            onSelectAll={handleSelectAll}
            onTagClick={setTagFilter}
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

      {showImportModal && (
        <WorkspaceImportModal
          onClose={() => setShowImportModal(false)}
          onComplete={() => {
            handleScan();
          }}
        />
      )}
    </div>
  );
}