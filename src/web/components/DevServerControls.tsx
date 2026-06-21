import React, { useCallback, useState } from 'react';
import type { DevServerStatus } from '../lib/types';
import { apiClient } from '../lib/api';
import { useToast } from './Toast';
import { Tooltip } from './Tooltip';

interface DevServerControlsProps {
  projectId: string;
  hasPackageJson: boolean;
  devScript?: string | null;
  status?: DevServerStatus | null;
  compact?: boolean;
  onStatusChange?: (status: DevServerStatus) => void;
}

export function DevServerControls({
  projectId,
  hasPackageJson,
  devScript,
  status,
  compact = false,
  onStatusChange,
}: DevServerControlsProps) {
  const [loading, setLoading] = useState<'start' | 'stop' | null>(null);
  const { showToast } = useToast();

  const running = status?.running ?? false;
  const portLabel = status?.ports?.[0];
  const url = status?.url;

  const handleStart = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLoading('start');
    try {
      const result = await apiClient.startDevServer(projectId);
      onStatusChange?.(result);
      showToast(
        result.ports?.[0]
          ? `开发服务器已启动 · :${result.ports[0]}`
          : '开发服务器已启动',
        'success'
      );
    } catch (error) {
      showToast('启动失败: ' + (error as Error).message, 'error');
    } finally {
      setLoading(null);
    }
  }, [projectId, onStatusChange, showToast]);

  const handleStop = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLoading('stop');
    try {
      const result = await apiClient.stopDevServer(projectId);
      onStatusChange?.(result);
      showToast('开发服务器已停止', 'success');
    } catch (error) {
      showToast('停止失败: ' + (error as Error).message, 'error');
    } finally {
      setLoading(null);
    }
  }, [projectId, onStatusChange, showToast]);

  const handleOpenUrl = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [url]);

  if (!hasPackageJson) {
    return null;
  }

  const compactIconBtn =
    'h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border transition-colors disabled:opacity-50';
  const btnClass = compact
    ? compactIconBtn
    : 'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50';

  if (compact) {
    return (
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {running ? (
          <>
            <Tooltip content={url ? `运行中 · ${url}` : portLabel ? `运行中 · :${portLabel}` : '运行中'}>
              <button
                type="button"
                onClick={handleOpenUrl}
                disabled={!url || loading !== null}
                aria-label={portLabel ? `打开 :${portLabel}` : '打开开发服务器'}
                className={`${compactIconBtn} border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50`}
              >
                <span className="relative flex items-center justify-center">
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </span>
              </button>
            </Tooltip>
            <Tooltip content="停止开发服务器">
              <button
                type="button"
                onClick={handleStop}
                disabled={loading !== null}
                aria-label="停止开发服务器"
                className={`${compactIconBtn} border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500 hover:border-red-300 hover:text-red-600`}
              >
                {loading === 'stop' ? (
                  <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                )}
              </button>
            </Tooltip>
          </>
        ) : (
          <Tooltip content={devScript ? `启动 npm run ${devScript}` : '启动开发服务器'}>
            <button
              type="button"
              onClick={handleStart}
              disabled={loading !== null || devScript === null}
              aria-label="启动开发服务器"
              className={`${compactIconBtn} border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400`}
            >
              {loading === 'start' ? (
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {running ? (
        <>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            运行中
            {portLabel ? ` · :${portLabel}` : ''}
            {status?.managedByDevHub ? ' · DevHub' : ''}
          </span>
          {url && (
            <button
              type="button"
              onClick={handleOpenUrl}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              打开 {url}
            </button>
          )}
          <button
            type="button"
            onClick={handleStop}
            disabled={loading !== null}
            className={`${btnClass} border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`}
          >
            {loading === 'stop' ? '停止中...' : '停止'}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={handleStart}
          disabled={loading !== null || devScript === null}
          className={`${btnClass} bg-blue-600 text-white hover:bg-blue-700 border border-blue-600`}
        >
          {loading === 'start'
            ? '启动中...'
            : devScript
              ? `启动 dev (${devScript})`
              : '无 dev 脚本'}
        </button>
      )}
    </div>
  );
}
