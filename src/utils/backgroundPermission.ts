import { Track } from '../types/music';
import { unlockAudioKeepAlive } from './backgroundAudio';

export const BG_PERMISSION_STORAGE_KEY = 'spotitube_bg_permission_v1';
export const PERMISSIONS_PROMPTED_KEY = 'spotitube_permissions_prompted_v1';

export type NotificationPermStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export interface BackgroundPermissionResult {
  notification: NotificationPermStatus;
  audioUnlocked: boolean;
  persistentStorage: boolean;
}

export function getNotificationPermissionState(): NotificationPermStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermStatus;
}

export function loadBackgroundPermissionSaved(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    return localStorage.getItem(BG_PERMISSION_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveBackgroundPermissionSaved(enabled: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(BG_PERMISSION_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function loadPermissionsPrompted(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    return localStorage.getItem(PERMISSIONS_PROMPTED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markAppPermissionsPrompted(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(PERMISSIONS_PROMPTED_KEY, 'true');
  } catch {
    // ignore
  }
}

export function shouldAutoPromptPermissionsOnEntry(params: {
  alreadyPrompted: boolean;
  notificationPermission: NotificationPermStatus;
  isNativeAndroid?: boolean;
}): boolean {
  if (params.isNativeAndroid) return false;
  if (params.alreadyPrompted) return false;
  return params.notificationPermission !== 'granted';
}

export function shouldTriggerBackgroundNotification(params: {
  isPlaying: boolean;
  isDocumentHidden: boolean;
  permission: NotificationPermStatus;
}): boolean {
  return params.isPlaying && params.isDocumentHidden && params.permission === 'granted';
}

/**
 * Unlocks Web Audio & HTML5 audio keep-alive synchronously inside user tap,
 * requests persistent cache storage for offline tracks, and requests browser
 * Notification permission for background playback on mobile.
 */
export async function requestBackgroundPlayPermissions(): Promise<BackgroundPermissionResult> {
  unlockAudioKeepAlive();

  let audioUnlocked = true;
  try {
    const AudioCtx =
      typeof window !== 'undefined'
        ? (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
        : undefined;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      await ctx.close().catch(() => {});
    }
  } catch {
    audioUnlocked = false;
  }

  let notification: NotificationPermStatus = getNotificationPermissionState();
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const result = await Notification.requestPermission();
      notification = result as NotificationPermStatus;
    } catch {
      notification = getNotificationPermissionState();
    }
  }

  let persistentStorage = false;
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
    try {
      persistentStorage = await navigator.storage.persist();
    } catch {
      persistentStorage = false;
    }
  }

  markAppPermissionsPrompted();
  saveBackgroundPermissionSaved(notification === 'granted' || audioUnlocked);
  return { notification, audioUnlocked, persistentStorage };
}

const BG_NOTIFICATION_TAG = 'spotitube-now-playing';

export async function showBackgroundNowPlayingNotification(
  track: Track | null,
  isPlaying: boolean
): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (
    !track ||
    !shouldTriggerBackgroundNotification({
      isPlaying,
      isDocumentHidden: typeof document !== 'undefined' ? document.hidden : false,
      permission: getNotificationPermissionState()
    })
  ) {
    return;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg && typeof reg.showNotification === 'function') {
      await reg.showNotification(track.title, {
        body: `${track.artist} • Playing in background`,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: BG_NOTIFICATION_TAG,
        silent: true
      });
    }
  } catch {
    // ignore notification display failure on restricted browsers
  }
}

export async function clearBackgroundNowPlayingNotification(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg && typeof reg.getNotifications === 'function') {
      const notifications = await reg.getNotifications({ tag: BG_NOTIFICATION_TAG });
      for (const n of notifications) {
        n.close();
      }
    }
  } catch {
    // ignore
  }
}
