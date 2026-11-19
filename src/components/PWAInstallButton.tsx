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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
            onClick={() => setShowGuide(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="install-app-modal-title"
              className="w-full max-w-md rounded-2xl bg-[#110E0F] border border-white/14 p-6 shadow-2xl text-[#F4F1F1] relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install guide"
                className="absolute top-4 right-4 text-[#A39E9F] hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-[#FF443A] mb-1">
                <Smartphone className="w-4 h-4" />
                <span className="text-xs font-semibold">Install Kiddwave</span>
              </div>
              <h3 id="install-app-modal-title" className="font-display text-lg font-bold text-white">
                Get Kiddwave on Your Device
              </h3>

              {/* Option 1: Native Android APK with Background Service */}
              <div className="mt-4 rounded-xl bg-[#070607]/85 border border-white/10 p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white flex items-center gap-2 whitespace-nowrap">
                    <Smartphone className="w-4 h-4 text-[#FF443A] shrink-0" />
                    <span>Android App (.apk)</span>
                  </span>
                  <span className="text-xs font-medium text-[#FF443A]">
                    Background Play
                  </span>
                </div>
                <p className="text-xs text-[#D0CBCC] leading-relaxed">
                  Native Android package with a Media Foreground Service so music keeps playing when leaving the app or turning off the screen.
                </p>

                {isCheckingApk && !apkInfo.available ? (
                  <div className="py-2.5 text-center text-xs text-[#A39E9F]">
                    Checking APK package...
                  </div>
                ) : apkInfo.available && apkInfo.downloadUrl ? (
                  <div className="space-y-2 pt-0.5">
                    <a
                      href={apkInfo.downloadUrl}
                      download={apkInfo.filename}
                      className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#EF2323] hover:bg-[#FF3830] py-2.5 px-4 text-xs font-bold text-white transition-colors shadow-[0_6px_18px_rgba(239,35,35,0.35)]"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download {apkInfo.filename}</span>
                    </a>
                    <p className="text-[11px] text-[#A39E9F] leading-relaxed text-center">
                      Open <strong className="text-[#F4F1F1]">{apkInfo.filename}</strong> after download and tap <strong className="text-[#F4F1F1]">Install</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-[#171213] border border-white/10 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#FF443A] text-xs font-semibold">
                      <Wrench className="w-3.5 h-3.5 shrink-0" />
                      <span>Android APK not hosted yet</span>
                    </div>
                    <p className="text-[11px] text-[#A39E9F] leading-relaxed">
                      Compile the included Android project to enable 1-click <strong className="text-[#F4F1F1]">.apk</strong> downloads.
                    </p>
                  </div>
                )}
              </div>

              {/* Option 2: Web App */}
              <div className="mt-3 rounded-xl bg-[#070607]/65 border border-white/[0.08] p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-[#D0CBCC]" />
                    Web App (PWA)
                  </span>
                  {isInstallable && (
                    <span className="text-xs font-semibold text-[#FF443A] flex items-center gap-1">
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
                    className="w-full rounded-xl bg-white hover:bg-[#F4F1F1] text-[#070607] py-2 px-4 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Install Web App Now
                  </button>
                ) : isIOS ? (
                  <p className="text-xs text-[#D0CBCC] leading-relaxed">
                    Tap <Share className="inline w-3.5 h-3.5 text-[#FF443A] mx-0.5" /> <strong>Share</strong> in Safari, then choose <strong>Add to Home Screen</strong>.
                  </p>
                ) : (
                  <p className="text-xs text-[#D0CBCC] leading-relaxed">
                    In Chrome, tap <strong>⋮</strong> → <strong>Add to Home screen</strong> or <strong>Install app</strong>.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="mt-4 w-full rounded-xl bg-white/[0.07] hover:bg-white/[0.12] py-2 text-xs font-semibold text-[#F4F1F1] cursor-pointer transition-colors"
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
        aria-label="Install Kiddwave app"
        className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold bg-[#EF2323] hover:bg-[#FF3830] text-white transition-colors cursor-pointer shrink-0 whitespace-nowrap shadow-[0_4px_14px_rgba(239,35,35,0.3)]"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Install App</span>
        <span className="md:hidden">Install</span>
      </button>
      {modal}
    </>
  );
});
