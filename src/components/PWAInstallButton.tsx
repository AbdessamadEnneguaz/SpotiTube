import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share, X, Smartphone, Monitor } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = React.memo(() => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = () => {
    if (isInstallable) {
      void install();
      return;
    }
    setShowGuide(true);
  };

  const modal = showGuide && typeof document !== 'undefined' ? createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={() => setShowGuide(false)}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[#181818] border border-neutral-700 p-6 shadow-2xl text-white relative"
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

        {isIOS ? (
          <>
            <div className="flex items-center gap-2 text-[#1db954] mb-1">
              <Smartphone className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">iOS Safari</span>
            </div>
            <h3 className="text-base font-bold text-white">Install on iPhone / iPad</h3>
            <p className="mt-2.5 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              1. Tap the <Share className="inline w-3.5 h-3.5 text-[#1db954] mx-0.5" /> <strong>Share</strong> button in Safari&apos;s toolbar.<br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-[#1db954] mb-1">
              <Monitor className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Quick Access</span>
            </div>
            <h3 className="text-base font-bold text-white">Install SpotiTube App</h3>
            <p className="mt-2.5 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              <strong className="text-white">Android (Chrome):</strong> Tap the <strong>⋮</strong> menu and choose <strong>Add to Home screen</strong> or <strong>Install app</strong>.<br /><br />
              <strong className="text-white">Desktop (Chrome / Edge):</strong> Click the install icon in the address bar or open browser menu → <strong>Install SpotiTube</strong>.
            </p>
          </>
        )}

        <button
          type="button"
          onClick={() => setShowGuide(false)}
          className="mt-5 w-full rounded-full bg-[#1db954] hover:bg-[#1ed760] py-2 text-xs font-bold text-black cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
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

