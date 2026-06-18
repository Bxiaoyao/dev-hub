import type { MouseEvent } from 'react';
import { getRepoWebInfo } from '../lib/remote-url';
import { Tooltip } from './Tooltip';

interface RepoLinksProps {
  remote?: string;
  branch?: string;
  /** compact: 仅图标；inline: 带文字标签 */
  variant?: 'compact' | 'inline';
  className?: string;
  onClick?: (e: MouseEvent) => void;
}

export function RepoLinks({
  remote,
  branch,
  variant = 'compact',
  className = '',
  onClick,
}: RepoLinksProps) {
  const info = getRepoWebInfo(remote, branch);
  if (!info) return null;

  const stop = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClick?.(e);
  };

  const open = (url: string) => (e: MouseEvent) => {
    stop(e);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const btnClass =
    variant === 'compact'
      ? 'h-9 w-9 shrink-0 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm'
      : 'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Tooltip content={`打开 ${info.platformLabel} 仓库`}>
        <button type="button" onClick={open(info.repoUrl)} className={btnClass} aria-label="打开远程仓库">
          {variant === 'compact' ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.5 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              {info.platformLabel}
            </>
          )}
        </button>
      </Tooltip>
      {info.mergeRequestUrl && (
        <Tooltip content={`发起 ${info.platform === 'github' ? 'Pull Request' : 'Merge Request'}`}>
          <button
            type="button"
            onClick={open(info.mergeRequestUrl)}
            className={btnClass}
            aria-label="发起合并请求"
          >
            {variant === 'compact' ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                <path d="M11 18H8a2 2 0 0 1-2-2V9" />
              </svg>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="18" r="3" />
                  <circle cx="6" cy="6" r="3" />
                  <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                  <path d="M11 18H8a2 2 0 0 1-2-2V9" />
                </svg>
                {info.platform === 'github' ? 'PR' : 'MR'}
              </>
            )}
          </button>
        </Tooltip>
      )}
    </div>
  );
}
