import * as React from 'react';

import { api } from '@/services/api';

export type BackendStatus = {
  isConfigured: boolean;
  isOnline: boolean;
  isChecking: boolean;
  lastCheckedAt: string | null;
  lastError: string | null;
};

export function useBackendStatus() {
  const [status, setStatus] = React.useState<BackendStatus>({
    isConfigured: Boolean(api.getBaseUrl()),
    isOnline: false,
    isChecking: false,
    lastCheckedAt: null,
    lastError: null,
  });

  const refresh = React.useCallback(async () => {
    const baseUrl = api.getBaseUrl();
    if (!baseUrl) {
      setStatus((s) => ({
        ...s,
        isConfigured: false,
        isOnline: false,
        isChecking: false,
        lastCheckedAt: new Date().toISOString(),
        lastError: 'EXPO_PUBLIC_API_BASE_URL is not set',
      }));
      return;
    }

    setStatus((s) => ({ ...s, isConfigured: true, isChecking: true, lastError: null }));
    try {
      const res = await api.health();
      setStatus((s) => ({
        ...s,
        isConfigured: true,
        isOnline: res.ok,
        isChecking: false,
        lastCheckedAt: new Date().toISOString(),
        lastError: res.ok ? null : 'Healthcheck failed',
      }));
    } catch (e: any) {
      setStatus((s) => ({
        ...s,
        isConfigured: true,
        isOnline: false,
        isChecking: false,
        lastCheckedAt: new Date().toISOString(),
        lastError: e?.message ?? 'Healthcheck failed',
      }));
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, refresh };
}
