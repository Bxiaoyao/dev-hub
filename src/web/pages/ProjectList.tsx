import { useState, useEffect, useCallback } from 'react';
import type { Project } from '../lib/types';
import { apiClient } from '../lib/api';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectTable } from '../components/ProjectTable';
import { SearchBar } from '../components/SearchBar';
import { BatchToolbar } from '../components/BatchToolbar';

interface ProjectListProps {
  onSelectProject: (project: Project) => void;
}

type ViewMode = 'card' | 'table';

export function ProjectList({ onSelectProject }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [sort, setSort] = useState<string>('recent');
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('devhub-view-mode') as ViewMode) || 'card';
    }
    return 'card';
  });

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
        <p className="text-red-600 dark:text-red-400">错误: {error}</p>
        <button
          onClick={loadProjects}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div>
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
        <div className="text-center py-12 text-gray-500">
          没有找到项目
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
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