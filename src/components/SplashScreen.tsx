import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const WORDMARK_LETTERS = ['K', 'i', 'd', 'd', 'w', 'a', 'v', 'e'] as const;

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Total duration ~1.6s (fade begins at 1.3s, completes at 1.6s)
    const fadeMs = prefersReduced ? 180 : 1300;
    const doneMs = prefersReduced ? 360 : 1600;

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
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#09090b] select-none pointer-events-auto transition-all duration-300 ease-out ${
        isFadingOut ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ambient Crimson Glow */}
      <div
        aria-hidden="true"
        className="w-80 h-80 rounded-full bg-[#EF4444]/16 blur-[84px] absolute splash-glow-in pointer-events-none"
      />

      <div className="relative z-10 flex flex-col items-center justify-center gap-4 px-6">
        {/* Choreographed SVG Wave Emblem (Transparent Background) */}
        <svg
          width="176"
          height="96"
          viewBox="0 0 220 120"
          fill="none"
          aria-hidden="true"
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="sp-bar" x1="0" y1="24" x2="0" y2="96" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF3333" />
              <stop offset="55%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
            <linearGradient id="sp-obs-left" x1="52" y1="18" x2="98" y2="82" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3B485E" />
              <stop offset="50%" stopColor="#161B24" />
              <stop offset="100%" stopColor="#090B10" />
            </linearGradient>
            <linearGradient id="sp-obs-right" x1="134" y1="86" x2="168" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0B0E14" />
              <stop offset="55%" stopColor="#181E29" />
              <stop offset="100%" stopColor="#354257" />
            </linearGradient>
            <linearGradient id="sp-red-fold" x1="114" y1="22" x2="152" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF2E26" />
              <stop offset="32%" stopColor="#DC2626" />
              <stop offset="72%" stopColor="#991B1B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
            <linearGradient id="sp-red-main" x1="56" y1="34" x2="128" y2="94" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF3B30" />
              <stop offset="55%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#B91C1C" />
            </linearGradient>
            <linearGradient id="sp-red-valley" x1="76" y1="88" x2="106" y2="74" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#B91C1C" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>

          {/* Step 1 (0.0s - 0.4s): Side Red Equalizer Bars Drop + Pulse */}
          <rect
            x="8"
            y="42"
            width="15"
            height="36"
            rx="7.5"
            fill="url(#sp-bar)"
            className="splash-bar-drop"
            style={{ animationDelay: '0ms' }}
          />
          <rect
            x="29"
            y="29"
            width="17"
            height="62"
            rx="8.5"
            fill="url(#sp-bar)"
            className="splash-bar-drop"
            style={{ animationDelay: '55ms' }}
          />
          <rect
            x="174"
            y="29"
            width="17"
            height="62"
            rx="8.5"
            fill="url(#sp-bar)"
            className="splash-bar-drop"
            style={{ animationDelay: '55ms' }}
          />
          <rect
            x="197"
            y="42"
            width="15"
            height="36"
            rx="7.5"
            fill="url(#sp-bar)"
            className="splash-bar-drop"
            style={{ animationDelay: '0ms' }}
          />

          {/* Step 2 (0.25s - 0.75s): Central Red & Obsidian "W" Wave Ribbon Reveal with Crimson Glow */}
          <g className="splash-ribbon-reveal drop-shadow-[0_0_18px_rgba(239,68,68,0.52)]">
            <path
              d="M54 26 C52 15 69 14 79 28 L99 68 C100 73 95 81 86 84 C69 68 56 46 54 26 Z"
              fill="url(#sp-obs-left)"
              stroke="rgba(255,255,255,0.24)"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <path
              d="M133 82 C141 62 152 41 167 36 C168 54 160 76 144 90 C138 93 133 89 133 82 Z"
              fill="url(#sp-obs-right)"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <path
              d="M111 33 C117 20 129 20 136 37 L146 66 C150 76 156 75 164 59 C160 77 151 92 138 92 C127 92 120 76 112 52 Z"
              fill="url(#sp-red-fold)"
            />
            <path
              d="M56 36 C68 35 77 52 87 73 C91 81 96 81 100 71 L111 36 C114 25 120 22 125 25 C121 29 118 37 115 47 L103 82 C95 98 79 98 69 80 C61 64 57 49 56 36 Z"
              fill="url(#sp-red-main)"
            />
            <path
              d="M78 88 C86 96 97 94 103 82 L106 74 C98 84 87 88 78 88 Z"
              fill="url(#sp-red-valley)"
              opacity="0.72"
            />
          </g>
        </svg>

        {/* Step 3 (0.6s - 1.25s): Staggered Letter-by-Letter "Kiddwave" Reveal + Red Dot Pop on "i" */}
        <div
          aria-label="Kiddwave"
          className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight text-[#F4F4F5] inline-flex items-baseline leading-none"
        >
          {WORDMARK_LETTERS.map((char, idx) => {
            const delayMs = 600 + idx * 45;
            if (char === 'i') {
              return (
                <span
                  key={`${char}-${idx}`}
                  className="relative inline-block align-baseline w-[0.2em] h-[0.5em] mx-[0.06em]"
                >
                  <span
                    aria-hidden="true"
                    style={{ animationDelay: `${delayMs}ms` }}
                    className="splash-letter-in absolute inset-0 rounded-[0.03em] bg-current"
                  />
                  <span
                    aria-hidden="true"
                    className="splash-dot-pop pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[0.58em] w-[0.23em] h-[0.23em] rounded-full bg-[#EF4444] shadow-[0_0_12px_rgba(239,68,68,0.85)]"
                  />
                  <span className="sr-only">i</span>
                </span>
              );
            }

            return (
              <span
                key={`${char}-${idx}`}
                style={{ animationDelay: `${delayMs}ms` }}
                className="splash-letter-in inline-block"
              >
                {char}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
