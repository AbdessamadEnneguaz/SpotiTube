import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share, X, Smartphone, Monitor, CheckCircle2, Wrench } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  ApkInfoResponse,
  isApkHeadResponseValid,
  resolveApkDownloadConfig
} from '../utils/apkDownload';

export const PWAInstallButton: React.FC = React.memo(() => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [isCheckingApk, setIsCheckingApk] = useState(true);
  const [apkInfo, setApkInfo] = useState<ApkInfoResponse>(() =>
    resolveApkDownloadConfig({
      configuredUrl: import.meta.env.VITE_ANDROID_APK_URL as string | undefined,
      localApkExists: false
    })
  );

  // Check APK availability eagerly on mount (and fallback to HEAD /SpotiTube.apk for static hosts)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/apk-info', { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const data: ApkInfoResponse = await res.json();
          if (!cancelled && data && typeof data.available === 'boolean') {
            setApkInfo(data);
            setIsCheckingApk(false);
            return;
          }
        }
      } catch {
        // Fallback to static file HEAD check
      }

      try {
        const headRes = await fetch('/SpotiTube.apk', { method: 'HEAD' });
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
            downloadUrl: '/SpotiTube.apk',
            filename: 'SpotiTube.apk'
          });
        }
      } catch {
        // Keep current config
      } finally {
        if (!cancelled) {
          setIsCheckingApk(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isRunningInsideAndroidApk =
    typeof window !== 'undefined' &&
    Boolean((window as unknown as { SpotiTubeAndroid?: unknown }).SpotiTubeAndroid);

  if (isInstalled || isRunningInsideAndroidApk) {
    return null;
  }

  const handleOpenInstallModal = () => {
    setShowGuide(true);
  };

  const modal =
    showGuide && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowGuide(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="install-app-modal-title"
              className="w-full max-w-md rounded-2xl bg-[#181818] border border-neutral-700 p-6 shadow-2xl text-white relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install guide"
                className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-[#1db954] mb-1">
                <Smartphone className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Install SpotiTube</span>
              </div>
              <h3 id="install-app-modal-title" className="text-lg font-extrabold text-white">
                Get SpotiTube on Your Phone
              </h3>

              {/* Option 1: Native Android APK with Background Service */}
              <div className="mt-4 rounded-xl bg-neutral-900/90 border border-neutral-700/80 p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white flex items-center gap-2 whitespace-nowrap">
                    <Smartphone className="w-4 h-4 text-[#1db954] shrink-0" />
                    <span>Android App (.apk)</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#1db954]/15 text-[#1db954] whitespace-nowrap">
                    Background Play
                  </span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Native Android package with a Media Foreground Service so music keeps playing even when you leave the app or turn off the screen.
                </p>

                {isCheckingApk && !apkInfo.available ? (
                  <div className="py-2.5 text-center text-xs text-neutral-400">
                    Checking APK package...
                  </div>
                ) : apkInfo.available && apkInfo.downloadUrl ? (
                  <div className="space-y-2 pt-0.5">
                    <a
                      href={apkInfo.downloadUrl}
                      download={apkInfo.filename}
                      className="flex items-center justify-center gap-2 w-full rounded-full bg-[#1db954] hover:bg-[#1ed760] py-2.5 px-4 text-xs font-extrabold text-black transition-colors shadow-lg"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download {apkInfo.filename}</span>
                    </a>
                    <p className="text-[11px] text-neutral-400 leading-relaxed text-center">
                      After downloading, open <strong className="text-neutral-200">{apkInfo.filename}</strong> and tap <strong className="text-neutral-200">Install</strong> (allow &ldquo;Install unknown apps&rdquo; if prompted).
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-neutral-800/80 border border-neutral-700 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-300 text-xs font-semibold">
                      <Wrench className="w-3.5 h-3.5 shrink-0" />
                      <span>Android APK not hosted yet</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Compile the included Android project (via Android Studio, Gradle, or the automated cloud build workflow) and attach the signed APK release to enable 1-click <strong className="text-neutral-200">.apk</strong> download here.
                    </p>
                  </div>
                )}
              </div>

              {/* Option 2: Instant Browser / PWA Install */}
              <div className="mt-3 rounded-xl bg-neutral-900/60 border border-neutral-800 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-neutral-300" />
                    Web App (PWA)
                  </span>
                  {isInstallable && (
                    <span className="text-[10px] font-semibold text-[#1db954] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  )}
                </div>

                {isInstallable ? (
                  <button
                    type="button"
                    onClick={() => {
                      void install();
                      setShowGuide(false);
                    }}
                    className="w-full rounded-full bg-white hover:bg-neutral-200 text-black py-2 px-4 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Install Web App Now
                  </button>
                ) : isIOS ? (
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Tap <Share className="inline w-3.5 h-3.5 text-[#1db954] mx-0.5" /> <strong>Share</strong> in Safari, then choose <strong>Add to Home Screen</strong>.
                  </p>
                ) : (
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    In Chrome, tap <strong>⋮</strong> → <strong>Add to Home screen</strong> or <strong>Install app</strong>. Note: mobile browsers can still pause YouTube embeds in background unless installed via the native <strong>.apk</strong>.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="mt-4 w-full rounded-full bg-neutral-800 hover:bg-neutral-700 py-2 text-xs font-semibold text-neutral-200 cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={handleOpenInstallModal}
        aria-label="Install SpotiTube app"
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold bg-[#1db954] hover:bg-[#1ed760] text-black shadow-sm transition-all cursor-pointer shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Install App</span>
        <span className="md:hidden">Install</span>
      </button>
      {modal}
    </>
  );
});
