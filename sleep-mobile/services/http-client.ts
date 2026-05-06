export type ApiError = {
  message: string;
  status?: number;
  url?: string;
};

export function getBaseUrl(): string | null {
  const raw = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim();
  if (!raw) return null;
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

export function withTimeout(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, dispose: () => clearTimeout(timeout) };
}

export type HttpRequestOptions = RequestInit & {
  timeoutMs?: number;
  /** Number of retry attempts for idempotent failures (network/5xx). Default: 0. */
  retries?: number;
};

const DEFAULT_GET_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function isRetryableError(err: any): boolean {
  // Retry on network errors (no status) and 5xx server errors. Never retry 4xx
  // (client errors won't fix themselves) or timeouts (already waited long enough).
  if (!err) return false;
  if (err.message === 'Request timeout') return false;
  if (typeof err.status === 'number') return err.status >= 500 && err.status < 600;
  return true;
}

/**
 * Base HTTP fetch helper — handles timeout, JSON parsing, and error normalisation.
 * Auth headers must be passed explicitly by the caller (no auto-injection here).
 *
 * Retries: GET requests get 2 retries by default with exponential backoff
 * (300ms, 600ms). Non-GET requests have 0 retries unless `retries` is set
 * explicitly — replays of POST/PUT/DELETE risk duplicate side effects.
 */
export async function httpRequest<T>(
  path: string,
  init?: HttpRequestOptions
): Promise<T> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw { message: 'API base URL is not configured (EXPO_PUBLIC_API_BASE_URL).' } satisfies ApiError;
  }

  const url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  const method = (init?.method ?? 'GET').toUpperCase();
  const isGet = method === 'GET';
  const { timeoutMs = 10000, retries = isGet ? DEFAULT_GET_RETRIES : 0, ...rest } = init ?? {};

  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { signal, dispose } = withTimeout(timeoutMs);
    try {
      const res = await fetch(url, {
        ...rest,
        signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(rest.headers ?? {}),
        },
      });

      const contentType = res.headers.get('content-type') ?? '';
      const isJson = contentType.includes('application/json');

      if (!res.ok) {
        const error: ApiError = { message: `Request failed (${res.status})`, status: res.status };
        try {
          if (isJson) {
            const data = await res.json();
            error.message = data?.message ?? data?.error ?? error.message;
          }
        } catch { /* ignore */ }
        throw error;
      }

      if (res.status === 204) return undefined as T;
      if (isJson) return (await res.json()) as T;
      return (await res.text()) as unknown as T;
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string; status?: number };
      // Normalise the error before considering retry.
      let normalised: ApiError;
      if (err?.name === 'AbortError') normalised = { message: 'Request timeout' };
      else if (err?.message && typeof err?.status === 'number') normalised = err as ApiError;
      else normalised = { message: err?.message || 'Network error' };

      lastError = normalised;
      if (attempt < retries && isRetryableError(normalised)) {
        await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      throw normalised;
    } finally {
      dispose();
    }
  }
  throw lastError;
}
