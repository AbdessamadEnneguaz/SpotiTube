import React from 'react';

interface KiddwaveLogoProps {
  size?: number;
  className?: string;
}

/**
 * Transparent-background Kiddwave Wave Emblem SVG:
 * Side rounded red equalizer bars + 3D folded crimson & obsidian-metallic "W" wave ribbon.
 * Designed to render sharply on dark obsidian (#09090b / #070607) backgrounds with zero box.
 */
export const KiddwaveLogo: React.FC<KiddwaveLogoProps> = ({
  size = 34,
  className = '',
}) => {
  const uid = React.useId().replace(/:/g, '');
  const width = Math.round(size * 1.72);

  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 220 120"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={`${uid}-bar`} x1="0" y1="24" x2="0" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF3333" />
          <stop offset="55%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>

        <linearGradient id={`${uid}-obs-left`} x1="52" y1="18" x2="98" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B485E" />
          <stop offset="50%" stopColor="#161B24" />
          <stop offset="100%" stopColor="#090B10" />
        </linearGradient>

        <linearGradient id={`${uid}-obs-right`} x1="134" y1="86" x2="168" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0B0E14" />
          <stop offset="55%" stopColor="#181E29" />
          <stop offset="100%" stopColor="#354257" />
        </linearGradient>

        <linearGradient id={`${uid}-red-fold`} x1="114" y1="22" x2="152" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF2E26" />
          <stop offset="32%" stopColor="#DC2626" />
          <stop offset="72%" stopColor="#991B1B" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>

        <linearGradient id={`${uid}-red-main`} x1="56" y1="34" x2="128" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF3B30" />
          <stop offset="55%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>

        <linearGradient id={`${uid}-red-valley`} x1="76" y1="88" x2="106" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B91C1C" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
      </defs>

      {/* Left Equalizer Bars */}
      <rect x="8" y="42" width="15" height="36" rx="7.5" fill={`url(#${uid}-bar)`} />
      <rect x="29" y="29" width="17" height="62" rx="8.5" fill={`url(#${uid}-bar)`} />

      {/* Right Equalizer Bars */}
      <rect x="174" y="29" width="17" height="62" rx="8.5" fill={`url(#${uid}-bar)`} />
      <rect x="197" y="42" width="15" height="36" rx="7.5" fill={`url(#${uid}-bar)`} />

      {/* Back-Left Obsidian Wing */}
      <path
        d="M54 26 C52 15 69 14 79 28 L99 68 C100 73 95 81 86 84 C69 68 56 46 54 26 Z"
        fill={`url(#${uid}-obs-left)`}
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Back-Right Obsidian Wing */}
      <path
        d="M133 82 C141 62 152 41 167 36 C168 54 160 76 144 90 C138 93 133 89 133 82 Z"
        fill={`url(#${uid}-obs-right)`}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Continuous Smooth Peak-to-Right-Valley Shaded Crimson Fold */}
      <path
        d="M111 33 C117 20 129 20 136 37 L146 66 C150 76 156 75 164 59 C160 77 151 92 138 92 C127 92 120 76 112 52 Z"
        fill={`url(#${uid}-red-fold)`}
      />

      {/* Front Glossy Red Sweeping Left-to-Center Arch */}
      <path
        d="M56 36 C68 35 77 52 87 73 C91 81 96 81 100 71 L111 36 C114 25 120 22 125 25 C121 29 118 37 115 47 L103 82 C95 98 79 98 69 80 C61 64 57 49 56 36 Z"
        fill={`url(#${uid}-red-main)`}
      />

      {/* Left Valley Shaded Twist Accent */}
      <path
        d="M78 88 C86 96 97 94 103 82 L106 74 C98 84 87 88 78 88 Z"
        fill={`url(#${uid}-red-valley)`}
        opacity="0.72"
      />
    </svg>
  );
};

interface KiddwaveWordmarkProps {
  className?: string;
}

/**
 * Bold Kiddwave wordmark designed for dark obsidian backgrounds:
 * crisp light-silver/white lettering with the signature red dot on the "i".
 */
export const KiddwaveWordmark: React.FC<KiddwaveWordmarkProps> = ({
  className = '',
}) => {
  return (
    <span
      className={`font-display font-extrabold tracking-tight text-[#F4F4F5] inline-flex items-baseline whitespace-nowrap select-none ${className}`}
    >
      <span>K</span>
      <span className="relative inline-block align-baseline w-[0.2em] h-[0.5em] mx-[0.06em]">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-[0.03em] bg-current"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[0.58em] w-[0.23em] h-[0.23em] rounded-full bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.7)]"
        />
        <span className="sr-only">i</span>
      </span>
      <span>ddwave</span>
    </span>
  );
};
