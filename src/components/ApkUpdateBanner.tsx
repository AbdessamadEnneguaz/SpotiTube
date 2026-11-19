import React from 'react';
import { Download, Sparkles, X } from 'lucide-react';
import { AppVersionManifest } from '../utils/apkUpdate';

interface ApkUpdateBannerProps {
  manifest: AppVersionManifest;
  installedVersion: string;
  onDismiss: () => void;
}

export const ApkUpdateBanner: React.FC<ApkUpdateBannerProps> = ({
  manifest,
  installedVersion,
  onDismiss
}) => {
  return (
    <div
      role="region"
      aria-label="Android app update notification"
      className="frame-3d-crimson mx-3 sm:mx-5 md:mx-7 mt-2.5 rounded-xl px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0 relative"
    >
      <div className="flex items-start sm:items-center gap-2.5 min-w-0 pr-7 sm:pr-0">
        <div className="w-8 h-8 rounded-lg bg-[#EF4444]/20 border border-[#EF4444]/40 flex items-center justify-center shrink-0 text-[#EF4444] mt-0.5 sm:mt-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[13px] sm:text-sm font-bold text-white leading-snug">
              New Android App Update Available
            </span>
            <span className="text-[11px] font-mono font-semibold text-[#F87171] bg-[#EF4444]/15 border border-[#EF4444]/35 px-1.5 py-0.5 rounded-md tabular-nums whitespace-nowrap">
              v{installedVersion} → v{manifest.latestApkVersion}
            </span>
          </div>
          {manifest.releaseNotes && (
            <p className="text-[11px] text-[#D0CBCC] leading-relaxed line-clamp-2 mt-0.5">
              {manifest.releaseNotes}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href={manifest.apkDownloadUrl}
          download="Kiddwave.apk"
          aria-label={`Update Kiddwave APK to version ${manifest.latestApkVersion}`}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] px-3.5 py-1.5 text-xs font-bold text-white transition-colors border border-[#F87171]/40 shadow-[0_4px_14px_rgba(239,68,68,0.35)] whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Update Now</span>
        </a>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss update banner"
          className="absolute top-2.5 right-2.5 sm:static p-1.5 rounded-lg text-[#A39E9F] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
