export type KeyboardShortcutAction =
  | { type: 'toggle-play' }
  | { type: 'seek-delta'; deltaSeconds: number };

export interface ShortcutKeyInput {
  key: string;
  code?: string;
  repeat?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

export interface EditableTargetLike {
  tagName?: string;
  isContentEditable?: boolean;
  getAttribute?: (name: string) => string | null;
}

const EDITABLE_TAG_NAMES = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Returns true if keyboard focus is currently inside a text input, textarea, select, or contentEditable field.
 */
export function isEditableElement(target: EditableTargetLike | null | undefined): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = (target.tagName || '').toUpperCase();
  if (EDITABLE_TAG_NAMES.has(tag)) return true;
  const role = target.getAttribute?.('role')?.toLowerCase();
  return role === 'textbox' || role === 'searchbox';
}

/**
 * Resolves global desktop media keyboard shortcuts.
 * Disabled when typing inside inputs or holding system modifier keys.
 */
export function resolveGlobalMediaShortcut(
  event: ShortcutKeyInput,
  target: EditableTargetLike | null | undefined
): KeyboardShortcutAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (isEditableElement(target)) return null;

  if (event.key === ' ' || event.code === 'Space') {
    if (event.repeat) return null;
    return { type: 'toggle-play' };
  }

  if (event.key === 'ArrowRight' || event.code === 'ArrowRight') {
    return { type: 'seek-delta', deltaSeconds: 5 };
  }

  if (event.key === 'ArrowLeft' || event.code === 'ArrowLeft') {
    return { type: 'seek-delta', deltaSeconds: -5 };
  }

  return null;
}

/**
 * Clamps a relative seek operation cleanly inside [0, duration].
 */
export function clampSeekTime(
  currentTime: number,
  deltaSeconds: number,
  duration: number
): number {
  const safeCurrent = Number.isFinite(currentTime) ? currentTime : 0;
  const next = safeCurrent + deltaSeconds;
  if (Number.isFinite(duration) && duration > 0) {
    return Math.min(duration, Math.max(0, next));
  }
  return Math.max(0, next);
}
