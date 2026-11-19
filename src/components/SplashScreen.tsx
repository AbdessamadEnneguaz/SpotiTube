import React, { useEffect, useState } from 'react';
import { KiddwaveLogo } from './KiddwaveLogo';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const fadeMs = prefersReduced ? 220 : 1380;
    const doneMs = prefersReduced ? 400 : 1780;

    const fadeTimer = window.setTimeout(() => setIsFadingOut(true), fadeMs);
    const doneTimer = window.setTimeout(() => onComplete(), doneMs);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      role="status"
      aria-label="Loading Kiddwave"
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#070607] select-none pointer-events-auto transition-all duration-400 ease-out ${
        isFadingOut ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Subtle crimson ambient glow behind centered emblem */}
      <div
        aria-hidden="true"
        className="w-72 h-72 rounded-full bg-[#EF4444]/18 blur-[72px] absolute splash-glow-in pointer-events-none"
      />

      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-5 px-6">
        <div className="splash-logo-in relative rounded-3xl p-1 shadow-[0_18px_50px_rgba(239,68,68,0.32)]">
          <KiddwaveLogo size={76} className="drop-shadow-[0_6px_22px_rgba(239,68,68,0.45)]" />
        </div>

        <div className="splash-title-in text-center sm:text-left">
          <div className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-none">
            Kidd<span className="text-[#EF4444]">wave</span>
          </div>
          <p className="text-xs sm:text-sm text-[#A39E9F] mt-1.5 font-medium tracking-wide">
            High-Speed Music Streaming
          </p>
        </div>
      </div>
    </div>
  );
};
