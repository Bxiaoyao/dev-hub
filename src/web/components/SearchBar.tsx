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
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center gap-1">
        {/* 全选按钮 */}
        <button
          onClick={onSelectAll}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            {selectedCount === totalCount && totalCount > 0 && (
              <polyline points="9 11 12 14 22 4" />
            )}
          </svg>
          {selectedCount === totalCount && totalCount > 0 ? '取消全选' : '全选'}
        </button>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-2"></div>

        {/* 过滤器按钮 */}
        {[
          { value: 'all', label: '全部' },
          { value: 'dirty', label: '有更改' },
          { value: 'git', label: 'Git' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === f.value
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* 排序选择 */}
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="text-sm bg-transparent border-none text-slate-600 dark:text-slate-300 outline-none cursor-pointer hover:text-slate-900 dark:hover:text-white"
        >
          <option value="recent">按最近修改排序</option>
          <option value="name">按字母排序</option>
        </select>

        {/* 视图切换 */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-md border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => onViewModeChange('card')}
            className={`p-1 rounded transition-all ${
              viewMode === 'card'
                ? 'bg-white dark:bg-slate-800 shadow-sm text-brand-600 dark:text-brand-400'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="卡片视图"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={`p-1 rounded transition-all ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-800 shadow-sm text-brand-600 dark:text-brand-400'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="列表视图"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}