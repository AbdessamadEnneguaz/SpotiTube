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
              className="w-full max-w-md rounded-2xl bg-[#1B1815] border border-[#EAE0D0]/12 p-6 shadow-2xl text-[#F5F0E8] relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install guide"
                className="absolute top-4 right-4 text-[#9E9384] hover:text-[#F5F0E8] p-1.5 rounded-lg hover:bg-[#EAE0D0]/[0.06] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-[#DFCCB0] mb-1">
                <Smartphone className="w-4 h-4" />
                <span className="text-xs font-semibold">Install SpotiTube</span>
              </div>
              <h3 id="install-app-modal-title" className="font-display text-lg font-bold text-[#F5F0E8]">
                Get SpotiTube on Your Device
              </h3>

              {/* Option 1: Native Android APK with Background Service */}
              <div className="mt-4 rounded-xl bg-[#12100E]/75 border border-[#EAE0D0]/10 p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#F5F0E8] flex items-center gap-2 whitespace-nowrap">
                    <Smartphone className="w-4 h-4 text-[#DFCCB0] shrink-0" />
                    <span>Android App (.apk)</span>
                  </span>
                  <span className="text-xs font-medium text-[#DFCCB0]">
                    Background Play
                  </span>
                </div>
                <p className="text-xs text-[#C8BEB0] leading-relaxed">
                  Native Android package with a Media Foreground Service so music keeps playing when leaving the app or turning off the screen.
                </p>

                {isCheckingApk && !apkInfo.available ? (
                  <div className="py-2.5 text-center text-xs text-[#9E9384]">
                    Checking APK package...
                  </div>
                ) : apkInfo.available && apkInfo.downloadUrl ? (
                  <div className="space-y-2 pt-0.5">
                    <a
                      href={apkInfo.downloadUrl}
                      download={apkInfo.filename}
                      className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#D8C3A5] hover:bg-[#E4D3BA] py-2.5 px-4 text-xs font-bold text-[#12100E] transition-colors shadow-lg"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download {apkInfo.filename}</span>
                    </a>
                    <p className="text-[11px] text-[#9E9384] leading-relaxed text-center">
                      Open <strong className="text-[#E4DDD2]">{apkInfo.filename}</strong> after download and tap <strong className="text-[#E4DDD2]">Install</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-[#24201B] border border-[#EAE0D0]/10 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#DFCCB0] text-xs font-semibold">
                      <Wrench className="w-3.5 h-3.5 shrink-0" />
                      <span>Android APK not hosted yet</span>
                    </div>
                    <p className="text-[11px] text-[#9E9384] leading-relaxed">
                      Compile the included Android project to enable 1-click <strong className="text-[#E4DDD2]">.apk</strong> downloads.
                    </p>
                  </div>
                )}
              </div>

              {/* Option 2: Web App */}
              <div className="mt-3 rounded-xl bg-[#12100E]/55 border border-[#EAE0D0]/[0.07] p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#F5F0E8] flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-[#C8BEB0]" />
                    Web App (PWA)
                  </span>
                  {isInstallable && (
                    <span className="text-xs font-semibold text-[#DFCCB0] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready
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
                    className="w-full rounded-xl bg-[#F5F0E8] hover:bg-white text-[#12100E] py-2 px-4 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Install Web App Now
                  </button>
                ) : isIOS ? (
                  <p className="text-xs text-[#C8BEB0] leading-relaxed">
                    Tap <Share className="inline w-3.5 h-3.5 text-[#DFCCB0] mx-0.5" /> <strong>Share</strong> in Safari, then choose <strong>Add to Home Screen</strong>.
                  </p>
                ) : (
                  <p className="text-xs text-[#C8BEB0] leading-relaxed">
                    In Chrome, tap <strong>⋮</strong> → <strong>Add to Home screen</strong> or <strong>Install app</strong>.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="mt-4 w-full rounded-xl bg-[#EAE0D0]/[0.07] hover:bg-[#EAE0D0]/[0.12] py-2 text-xs font-semibold text-[#E4DDD2] cursor-pointer transition-colors"
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
        onClick={() => setShowGuide(true)}
        aria-label="Install SpotiTube app"
        className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold bg-[#D8C3A5] hover:bg-[#E4D3BA] text-[#12100E] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Install App</span>
        <span className="md:hidden">Install</span>
      </button>
      {modal}
    </>
  );
});
