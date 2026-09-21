/**
 * Client-side SWR Cache Utility for METRIX
 * Reduces server load and provides instant 0ms renders for critical entities.
 */

const STORAGE_KEYS = {
  GOALS: 'metrix_cache_goals',
  TASK_STATS: 'metrix_cache_task_stats',
  TIMESTAMP: 'metrix_cache_timestamp',
} as const;

export interface CachedData<T> {
  data: T;
  timestamp: number;
}

export function getCachedItem<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data ?? parsed;
  } catch {
    return null;
  }
}

export function setCachedItem<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachedData<T> = {
      data,
      timestamp: Date.now(),
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn('[Cache] LocalStorage quota exceeded or unavailable', e);
  }
}

export function clearMetrixCache(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.GOALS);
    window.localStorage.removeItem(STORAGE_KEYS.TASK_STATS);
  } catch {}
}

export { STORAGE_KEYS };
