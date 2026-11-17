export interface ApkInfoResponse {
  available: boolean;
  downloadUrl: string | null;
  filename: string;
}

const DEFAULT_APK_FILENAME = 'SpotiTube.apk';

/**
 * Validates that an external APK URL uses HTTPS or a safe local relative path (/SpotiTube.apk).
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
    return /^\/[A-Za-z0-9._/-]+\.apk$/.test(trimmed);
  }

  return false;
}

/**
 * Resolves whether a downloadable .apk binary is currently configured or hosted.
 */
export function resolveApkDownloadConfig(params: {
  configuredUrl?: string | null;
  localApkExists: boolean;
}): ApkInfoResponse {
  const configured = params.configuredUrl?.trim();
  if (configured && isSafeApkDownloadUrl(configured)) {
    return {
      available: true,
      downloadUrl: configured,
      filename: DEFAULT_APK_FILENAME
    };
  }

  if (params.localApkExists) {
    return {
      available: true,
      downloadUrl: '/SpotiTube.apk',
      filename: DEFAULT_APK_FILENAME
    };
  }

  return {
    available: false,
    downloadUrl: null,
    filename: DEFAULT_APK_FILENAME
  };
}
