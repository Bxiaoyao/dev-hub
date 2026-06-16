interface SearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  totalCount: number;
  selectedCount: number;
  onSelectAll: () => void;
  viewMode: 'card' | 'table';
  onViewModeChange: (mode: 'card' | 'table') => void;
}

export function SearchBar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  totalCount,
  selectedCount,
  onSelectAll,
  viewMode,
  onViewModeChange,
}: SearchBarProps) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center gap-4">
        {/* 搜索 */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="🔍 搜索项目..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 视图切换 */}
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange('card')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'card'
                ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            ▤ 卡片
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'table'
                ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            ≡ 表格
          </button>
        </div>

        {/* 导出按钮 */}
        <button
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          + 导出
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* 过滤器 */}
        <div className="flex gap-2">
          {[
            { value: 'all', label: '全部' },
            { value: 'git', label: 'Git' },
            { value: 'recent', label: '最近' },
            { value: 'dirty', label: '有更改' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={`px-3 py-1 rounded-lg text-sm ${
                filter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 排序 */}
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="recent">最近活跃</option>
          <option value="name">名称</option>
          <option value="branch">分支</option>
        </select>

        {/* 全选 */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalCount} 个项目
          </span>
          <button
            onClick={onSelectAll}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {selectedCount === totalCount && totalCount > 0 ? '☑ 取消全选' : '☐ 全选'}
          </button>
          {selectedCount > 0 && (
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">
              已选 {selectedCount} 个
            </span>
          )}
        </div>
      </div>
    </div>
  );
}