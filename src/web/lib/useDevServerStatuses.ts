import { useState, useEffect, useCallback } from 'react';
import type { DevServerStatus } from './types';
import { apiClient } from './api';

export function useDevServerStatuses(
  projectPaths: string[],
  options?: { pollIntervalMs?: number; enabled?: boolean }
) {
  const pollIntervalMs = options?.pollIntervalMs ?? 10000;
  const enabled = options?.enabled ?? true;
  const [statuses, setStatuses] = useState<Record<string, DevServerStatus>>({});

  const pathsKey = projectPaths.join('\0');

  const refresh = useCallback(async () => {
    if (!enabled || projectPaths.length === 0) return;

    try {
      const { statuses: batch } = await apiClient.getBatchDevServerStatus(projectPaths);
      setStatuses(batch);
    } catch {
      // 轮询失败时静默，避免打断列表浏览
    }
  }, [enabled, pathsKey]);

  useEffect(() => {
    void refresh();
    if (!enabled || projectPaths.length === 0) return;

    const timer = setInterval(() => {
      void refresh();
    }, pollIntervalMs);

    return () => clearInterval(timer);
  }, [refresh, pollIntervalMs, enabled, pathsKey]);

  const updateStatus = useCallback((projectPath: string, status: DevServerStatus) => {
    setStatuses((prev) => ({ ...prev, [projectPath]: status }));
  }, []);

  return { statuses, updateStatus, refresh };
}

export function useDevServerStatus(
  projectPath: string,
  options?: { pollIntervalMs?: number; enabled?: boolean }
) {
  const pollIntervalMs = options?.pollIntervalMs ?? 5000;
  const enabled = options?.enabled ?? true;
  const [status, setStatus] = useState<DevServerStatus | null>(null);
  const [devScript, setDevScript] = useState<string | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!enabled || !projectPath) return;

    try {
      const result = await apiClient.getDevServerStatus(projectPath);
      const { devScript: script, ...rest } = result;
      setStatus(rest);
      setDevScript(script);
    } catch {
      // ignore
    }
  }, [enabled, projectPath]);

  useEffect(() => {
    void refresh();
    if (!enabled || !projectPath) return;

    const timer = setInterval(() => {
      void refresh();
    }, pollIntervalMs);

    return () => clearInterval(timer);
  }, [refresh, pollIntervalMs, enabled, projectPath]);

  const updateStatus = useCallback((next: DevServerStatus) => {
    setStatus(next);
  }, []);

  return { status, devScript, updateStatus, refresh };
}
