import type { DevServerStatus, Project } from '../lib/types';
import { formatProjectPath } from '../lib/format';
import { ProjectCard } from './ProjectCard';
import { ProjectTable } from './ProjectTable';
import { Tooltip } from './Tooltip';

interface ProjectGroupSectionProps {
  parentDir: string;
  projects: Project[];
  collapsed: boolean;
  onToggle: () => void;
  viewMode: 'card' | 'table';
  selectedProjects: Set<string>;
  onSelect: (projectPath: string) => void;
  onClick: (project: Project) => void;
  onSelectAll?: () => void;
  onTagClick?: (tag: string) => void;
  devStatuses?: Record<string, DevServerStatus>;
  onDevStatusChange?: (projectPath: string) => (status: DevServerStatus) => void;
}

export function ProjectGroupSection({
  parentDir,
  projects,
  collapsed,
  onToggle,
  viewMode,
  selectedProjects,
  onSelect,
  onClick,
  onSelectAll,
  onTagClick,
  devStatuses,
  onDevStatusChange,
}: ProjectGroupSectionProps) {
  const selectedInGroup = projects.filter((p) => selectedProjects.has(p.path)).length;

  return (
    <section className="mb-6 last:mb-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 mb-3 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors text-left group"
      >
        <svg
          className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${collapsed ? '' : 'rotate-90'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <svg className="w-4 h-4 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <Tooltip content={parentDir}>
          <span className="font-mono text-sm text-slate-700 dark:text-slate-200 truncate flex-1 min-w-0">
            {formatProjectPath(parentDir)}
          </span>
        </Tooltip>
        <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
          {projects.length} 个项目
          {selectedInGroup > 0 && ` · 已选 ${selectedInGroup}`}
        </span>
      </button>

      {!collapsed && (
        viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {projects.map((project) => (
              <ProjectCard
                key={project.path}
                project={project}
                selected={selectedProjects.has(project.path)}
                onSelect={() => onSelect(project.path)}
                onClick={() => onClick(project)}
                onTagClick={onTagClick}
                devStatus={devStatuses?.[project.path] ?? null}
                onDevStatusChange={onDevStatusChange?.(project.path)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <ProjectTable
              projects={projects}
              selectedProjects={selectedProjects}
              onSelect={onSelect}
              onClick={onClick}
              onSelectAll={onSelectAll}
              hidePathColumn
              onTagClick={onTagClick}
            />
          </div>
        )
      )}
    </section>
  );
}
