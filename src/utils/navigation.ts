import { AppView } from '../types/music';

export interface RouteEntry {
  view: AppView;
  playlistId: string | null;
}

export const INITIAL_ROUTE: RouteEntry = {
  view: 'home',
  playlistId: null
};

export function isSameRoute(a: RouteEntry, b: RouteEntry): boolean {
  return a.view === b.view && (a.playlistId ?? null) === (b.playlistId ?? null);
}

/**
 * Push a new route transition onto the history stack cleanly:
 * - No-ops if target equals current route
 * - Caps stack length to prevent unbounded memory growth
 */
export function pushRoute(
  history: RouteEntry[],
  current: RouteEntry,
  next: RouteEntry,
  maxDepth = 30
): { history: RouteEntry[]; current: RouteEntry } {
  if (isSameRoute(current, next)) {
    return { history, current };
  }
  const updated = [...history, current];
  const trimmed = updated.length > maxDepth ? updated.slice(updated.length - maxDepth) : updated;
  return {
    history: trimmed,
    current: {
      view: next.view,
      playlistId: next.view === 'playlist' ? next.playlistId : null
    }
  };
}

/**
 * Pop the previous route from history, or fall back to home when already on a sub-page.
 */
export function popRoute(
  history: RouteEntry[],
  current: RouteEntry
): { history: RouteEntry[]; current: RouteEntry } {
  if (history.length > 0) {
    const nextHistory = history.slice(0, -1);
    const prev = history[history.length - 1];
    return {
      history: nextHistory,
      current: prev
    };
  }
  if (!isSameRoute(current, INITIAL_ROUTE)) {
    return {
      history: [],
      current: INITIAL_ROUTE
    };
  }
  return { history, current };
}

export function canGoBackFromRoute(history: RouteEntry[], current: RouteEntry): boolean {
  return history.length > 0 || !isSameRoute(current, INITIAL_ROUTE);
}
