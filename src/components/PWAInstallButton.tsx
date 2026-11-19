import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import {
  ApkInfoResponse,
  getDirectApkHref,
  isApkHeadResponseValid,
  resolveApkDownloadConfig
} from '../utils/apkDownload';
import { AndroidBridgeLike, detectAndroidApkEnv } from '../utils/apkUpdate';

export const PWAInstallButton: React.FC = React.memo(() => {
  const [apkInfo, setApkInfo] = useState<ApkInfoResponse>(() =>
    resolveApkDownloadConfig({
      configuredUrl: import.meta.env.VITE_ANDROID_APK_URL as string | undefined,
      localApkExists: true
    })
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/apk-info', { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const data: ApkInfoResponse = await res.json();
          if (!cancelled && data && typeof data.available === 'boolean' && data.downloadUrl) {
            setApkInfo(data);
            return;
          }
        }
      } catch {
        // Fallback to static file HEAD check
      }

      try {
        const headRes = await fetch('/Kiddwave.apk', { method: 'HEAD' });
        if (
          !cancelled &&
          isApkHeadResponseValid({
            ok: headRes.ok,
            contentType: headRes.headers.get('content-type'),
            contentLength: headRes.headers.get('content-length')
          })
        ) {
          setApkInfo({
            available: true,
            downloadUrl: '/Kiddwave.apk',
            filename: 'Kiddwave.apk'
          });
        }
      } catch {
        // Keep default /Kiddwave.apk direct download path
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isRunningInsideAndroidApk =
    typeof window !== 'undefined' &&
    detectAndroidApkEnv({
      userAgent: navigator.userAgent,
      kiddwaveBridge: (window as unknown as { KiddwaveAndroid?: AndroidBridgeLike }).KiddwaveAndroid,
      legacyBridge: (window as unknown as { SpotiTubeAndroid?: AndroidBridgeLike }).SpotiTubeAndroid
    }).isAndroidWrapper;

  if (isRunningInsideAndroidApk) {
    return null;
  }

  const directHref = getDirectApkHref(apkInfo);
  const filename = apkInfo.filename || 'Kiddwave.apk';

  return (
    <a
      href={directHref}
      download={filename}
      aria-label="Download Kiddwave APK"
      title={apkInfo.sha256 ? `Download ${filename} (SHA-256 verified)` : `Download ${filename}`}
      className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold bg-[#EF4444] hover:bg-[#DC2626] text-white transition-colors cursor-pointer shrink-0 whitespace-nowrap border border-[#F87171]/40 shadow-[0_4px_14px_rgba(239,68,68,0.34)]"
    >
      <Download className="w-3.5 h-3.5" />
      <span className="hidden md:inline">Install APK</span>
      <span className="md:hidden">APK</span>
    </a>
  );
});
