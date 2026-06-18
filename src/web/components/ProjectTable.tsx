import type { Project } from '../lib/types';
import { formatRelativeTime, formatProjectPath } from '../lib/format';

interface ProjectTableProps {
  projects: Project[];
  selectedProjects: Set<string>;
  onSelect: (projectPath: string) => void;
  onClick: (project: Project) => void;
  hidePathColumn?: boolean;
}

export function ProjectTable({ projects, selectedProjects, onSelect, onClick, hidePathColumn = false }: ProjectTableProps) {
  const getStatusIcon = (status: Project['status']) => {
    switch (status) {
      case 'clean': return '✓';
      case 'dirty': return '⚠';
      default: return '?';
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'clean': return 'text-green-600 dark:text-green-400';
      case 'dirty': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'clean': return '干净';
      case 'dirty': return '有更改';
      default: return '未知';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="w-8 px-2 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedProjects.size === projects.length && projects.length > 0}
                onChange={() => {}}
                className="rounded border-gray-300"
              />
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">名称</th>
            {!hidePathColumn && (
              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">路径</th>
            )}
            <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">分支</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">状态</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">包管理</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">修改时间</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {projects.map((project) => (
            <tr
              key={project.path}
              className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${
                selectedProjects.has(project.path) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
              onClick={() => onClick(project)}
            >
              <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedProjects.has(project.path)}
                  onChange={() => onSelect(project.path)}
                  className="rounded border-gray-300"
                />
              </td>
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                {project.name}
              </td>
              {!hidePathColumn && (
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs max-w-[200px] truncate" title={project.path}>
                  {formatProjectPath(project.path)}
                </td>
              )}
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${
                    project.status === 'clean' ? 'bg-green-500' :
                    project.status === 'dirty' ? 'bg-yellow-500' : 'bg-gray-400'
                  }`} />
                  {project.branch || '-'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={getStatusColor(project.status)}>
                  {getStatusIcon(project.status)} {getStatusText(project.status)}
                  {project.uncommittedChanges && project.uncommittedChanges > 0 && (
                    <span className="ml-1 text-xs">({project.uncommittedChanges})</span>
                  )}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                {project.packageManager || '-'}
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-500 text-xs">
                {formatRelativeTime(new Date(project.lastModified))}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick(project);
                  }}
                  className="text-blue-600 hover:text-blue-700 text-xs"
                >
                  打开
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}