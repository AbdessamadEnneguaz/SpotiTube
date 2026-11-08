/**
 * Utility functions for managing persistent recent searches in localStorage
 */

export const RECENT_SEARCHES_STORAGE_KEY = 'spotitube_recent_searches';
export const DEFAULT_RECENT_SEARCHES = ['7elmetado2', 'ElGrandeToto', 'Said Senhaji', 'Cheb Khaled'];

/**
 * Adds a new search term to the recent list.
 * - Trims whitespace
 * - Avoids empty strings
 * - Removes existing duplicates (case-insensitive)
 * - Prepends the new term
 * - Enforces maximum limit (default: 10)
 */
export function addSearchTerm(recent: string[], term: string, maxItems: number = 10): string[] {
  const trimmed = term.trim();
  if (!trimmed) return recent;

  const filtered = recent.filter(t => t.toLowerCase() !== trimmed.toLowerCase());
  return [trimmed, ...filtered].slice(0, maxItems);
}

/**
 * Removes a specific search term from the list (case-insensitive).
 */
export function removeSearchTerm(recent: string[], term: string): string[] {
  const target = term.trim().toLowerCase();
  return recent.filter(t => t.trim().toLowerCase() !== target);
}

/**
 * Clears all search terms.
 */
export function clearSearchTerms(): string[] {
  return [];
}

/**
 * Loads recent searches from localStorage with fallback defaults.
 */
export function loadRecentSearches(
  storageKey: string = RECENT_SEARCHES_STORAGE_KEY,
  defaultItems: string[] = DEFAULT_RECENT_SEARCHES
): string[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultItems;
  }
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultItems;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
      return parsed;
    }
    return defaultItems;
  } catch {
    return defaultItems;
  }
}

/**
 * Persists recent searches array to localStorage.
 */
export function saveRecentSearches(
  items: string[],
  storageKey: string = RECENT_SEARCHES_STORAGE_KEY
): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(items));
  } catch (err) {
    console.warn('Failed to save recent searches to localStorage:', err);
  }
}
