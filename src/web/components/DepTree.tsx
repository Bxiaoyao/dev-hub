import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

interface DepTreeNode {
  name: string;
  version: string;
  dependencies?: DepTreeNode[];
}

interface DepTreeProps {
  projectId: string;
  onClose: () => void;
}

export function DepTree({ projectId, onClose }: DepTreeProps) {
  const [tree, setTree] = useState<DepTreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTree();
  }, [projectId]);

  const loadTree = async () => {
    setLoading(true);
    try {
      // Get project detail which includes dependencies
      const project = await apiClient.getProject(projectId);

      // Build a simple tree from dependencies
      const depTree: DepTreeNode = {
        name: project.name || projectId,
        version: project.version || 'unknown',
        dependencies: Object.entries(project.dependencies?.dependencies || {}).map(
          ([name, version]) => ({
            name,
            version: version as string,
          })
        ),
      };

      setTree(depTree);
    } catch (error) {
      console.error('Failed to load dependency tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderNode = (node: DepTreeNode, path: string, depth: number = 0) => {
    const hasChildren = node.dependencies && node.dependencies.length > 0;
    const isExpanded = expanded.has(path);

    return (
      <div key={path}>
        <div
          className={`flex items-center gap-2 py-1 px-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer`}
          style={{ paddingLeft: depth * 20 }}
          onClick={() => hasChildren && toggleExpand(path)}
        >
          {hasChildren && (
            <span className="text-gray-400 w-4">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          {!hasChildren && <span className="w-4" />}
          <span className="font-medium text-gray-900 dark:text-white">
            {node.name}
          </span>
          <span className="text-gray-500 dark:text-gray-400 text-sm">
            @{node.version}
          </span>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {node.dependencies!.map((child) =>
              renderNode(child, `${path}/${child.name}`, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            依赖树
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 60px)' }}>
          {tree && renderNode(tree, tree.name)}
        </div>
      </div>
    </div>
  );
}