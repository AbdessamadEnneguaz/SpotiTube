export interface ApkInfoResponse {
  available: boolean;
  downloadUrl: string | null;
  filename: string;
  sha256?: string;
}

const DEFAULT_APK_FILENAME = 'Kiddwave.apk';
export const DEFAULT_APK_PATH = '/Kiddwave.apk';

/**
 * Validates that an external APK URL uses HTTPS or a safe local relative path (/Kiddwave.apk).
 */
export function isSafeApkDownloadUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'https:' && Boolean(parsed.hostname);
    } catch {
      return false;
    }
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && trimmed.endsWith('.apk')) {
    return /^\/[A-Za-z0-9._/-]+\.apk$/.test(trimmed) && !trimmed.includes('..');
  }

  return false;
}

/**
 * Resolves whether a downloadable .apk binary is currently configured or hosted.
 */
export function resolveApkDownloadConfig(params: {
  configuredUrl?: string | null;
  localApkExists: boolean;
  sha256?: string;
}): ApkInfoResponse {
  const configured = params.configuredUrl?.trim();
  if (configured && isSafeApkDownloadUrl(configured)) {
    return {
      available: true,
      downloadUrl: configured,
      filename: DEFAULT_APK_FILENAME,
      ...(params.sha256 ? { sha256: params.sha256 } : {})
    };
  }

  if (params.localApkExists) {
    return {
      available: true,
      downloadUrl: DEFAULT_APK_PATH,
      filename: DEFAULT_APK_FILENAME,
      ...(params.sha256 ? { sha256: params.sha256 } : {})
    };
  }

  return {
    available: false,
    downloadUrl: null,
    filename: DEFAULT_APK_FILENAME
  };
}

/**
 * Resolves the direct 1-click download href for the Install button, always rejecting unsafe schemes or traversal.
 */
export function getDirectApkHref(info: Pick<ApkInfoResponse, 'downloadUrl'> | null | undefined): string {
  if (info?.downloadUrl && isSafeApkDownloadUrl(info.downloadUrl)) {
    return info.downloadUrl;
  }
  return DEFAULT_APK_PATH;
}

/**
 * Verifies a HEAD /Kiddwave.apk response returned a real binary package rather than HTML SPA fallback.
 */
export function isApkHeadResponseValid(params: {
  ok: boolean;
  contentType: string | null;
  contentLength: string | null;
}): boolean {
  if (!params.ok) return false;
  const ct = (params.contentType || '').toLowerCase();
  if (ct.includes('text/html')) return false;
  const len = params.contentLength ? Number.parseInt(params.contentLength, 10) : 0;
  if (Number.isFinite(len) && len > 0 && len <= 1024) return false;
  return ct.includes('android.package-archive') || ct.includes('octet-stream') || len > 1024;
}
