import { isSafeApkDownloadUrl } from './apkDownload';

export interface AppVersionManifest {
  latestApkVersion: string;
  apkDownloadUrl: string;
  releaseNotes?: string;
}

export interface AndroidBridgeLike {
  getAppVersion?: () => string;
}

export interface AndroidApkEnv {
  isAndroidWrapper: boolean;
  installedVersion: string | null;
}

export const DISMISSED_APK_UPDATE_KEY = 'kiddwave_dismissed_apk_version_v1';

/**
 * Parses a semantic version string (e.g. "1.2.1" or "v1.2.1-beta") into [major, minor, patch].
 */
export function parseSemver(version: string | null | undefined): [number, number, number] | null {
  if (!version || typeof version !== 'string') return null;
  const cleaned = version.trim().replace(/^v/i, '').split(/[-+]/)[0];
  const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(cleaned);
  if (!match) return null;
  return [
    Number.parseInt(match[1], 10) || 0,
    Number.parseInt(match[2] || '0', 10) || 0,
    Number.parseInt(match[3] || '0', 10) || 0
  ];
}

/**
 * Returns > 0 if `a` is newer than `b`, < 0 if `a` is older than `b`, or 0 if equal/invalid.
 */
export function compareSemver(a: string | null | undefined, b: string | null | undefined): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return 0;
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  }
  return 0;
}

export function isNewerApkVersion(
  installedVersion: string | null | undefined,
  latestApkVersion: string | null | undefined
): boolean {
  return compareSemver(latestApkVersion, installedVersion) > 0;
}

/**
 * Detects whether the web app is running inside the Kiddwave Android WebView wrapper
 * and extracts the installed native APK version via bridge or User-Agent.
 */
export function detectAndroidApkEnv(params: {
  userAgent?: string;
  kiddwaveBridge?: AndroidBridgeLike | null;
  legacyBridge?: AndroidBridgeLike | null;
}): AndroidApkEnv {
  const { userAgent = '', kiddwaveBridge, legacyBridge } = params;

  const uaMatch = /KiddwaveAndroid\/(\d+\.\d+(?:\.\d+)?)/i.exec(userAgent);
  const bridgeVersionRaw =
    safeReadBridgeVersion(kiddwaveBridge) || safeReadBridgeVersion(legacyBridge);

  const hasBridge = Boolean(kiddwaveBridge || legacyBridge);
  const isAndroidWrapper = hasBridge || Boolean(uaMatch);

  if (!isAndroidWrapper) {
    return { isAndroidWrapper: false, installedVersion: null };
  }

  const installedVersion =
    (bridgeVersionRaw && parseSemver(bridgeVersionRaw) ? bridgeVersionRaw.trim() : null) ||
    (uaMatch ? uaMatch[1] : null) ||
    '1.0.0';

  return { isAndroidWrapper: true, installedVersion };
}

function safeReadBridgeVersion(bridge: AndroidBridgeLike | null | undefined): string | null {
  if (!bridge || typeof bridge.getAppVersion !== 'function') return null;
  try {
    const val = bridge.getAppVersion();
    return typeof val === 'string' && val.trim() ? val.trim() : null;
  } catch {
    return null;
  }
}

export function parseApkVersionManifest(raw: unknown): AppVersionManifest | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const latestApkVersion =
    typeof obj.latestApkVersion === 'string' ? obj.latestApkVersion.trim() : '';
  const apkDownloadUrl =
    typeof obj.apkDownloadUrl === 'string' ? obj.apkDownloadUrl.trim() : '';

  if (!parseSemver(latestApkVersion) || !isSafeApkDownloadUrl(apkDownloadUrl)) {
    return null;
  }

  return {
    latestApkVersion,
    apkDownloadUrl,
    releaseNotes:
      typeof obj.releaseNotes === 'string' && obj.releaseNotes.trim()
        ? obj.releaseNotes.trim().slice(0, 200)
        : undefined
  };
}

export function shouldShowApkUpdateBanner(params: {
  isAndroidWrapper: boolean;
  installedVersion: string | null;
  manifest: AppVersionManifest | null;
  dismissedVersion: string | null;
}): boolean {
  if (!params.isAndroidWrapper || !params.installedVersion || !params.manifest) {
    return false;
  }
  if (params.dismissedVersion === params.manifest.latestApkVersion) {
    return false;
  }
  return isNewerApkVersion(params.installedVersion, params.manifest.latestApkVersion);
}

export function loadDismissedApkVersion(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return window.localStorage.getItem(DISMISSED_APK_UPDATE_KEY);
  } catch {
    return null;
  }
}

export function saveDismissedApkVersion(version: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(DISMISSED_APK_UPDATE_KEY, version);
  } catch {
    // ignore storage errors
  }
}
