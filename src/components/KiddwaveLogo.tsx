import React from 'react';

interface KiddwaveLogoProps {
  size?: number;
  className?: string;
}

export const KiddwaveLogo: React.FC<KiddwaveLogoProps> = ({ size = 36, className = '' }) => {
  const gradId = React.useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={`${gradId}-bg`} x1="16" y1="8" x2="112" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1A1214" />
          <stop offset="55%" stopColor="#0B0809" />
          <stop offset="100%" stopColor="#050405" />
        </linearGradient>
        <radialGradient id={`${gradId}-glow`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#EF4444" stopOpacity="0.34" />
          <stop offset="70%" stopColor="#DC2626" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#070607" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${gradId}-red`} x1="30" y1="24" x2="98" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF5A52" />
          <stop offset="48%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
        <linearGradient id={`${gradId}-border`} x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EF4444" stopOpacity="0.72" />
          <stop offset="50%" stopColor="#DC2626" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      <rect width="128" height="128" rx="30" fill={`url(#${gradId}-bg)`} />
      <rect width="128" height="128" rx="30" fill={`url(#${gradId}-glow)`} />
      <rect
        x="2.5"
        y="2.5"
        width="123"
        height="123"
        rx="28"
        stroke={`url(#${gradId}-border)`}
        strokeWidth="2.5"
      />

      <circle cx="64" cy="64" r="41" stroke="#EF4444" strokeOpacity="0.24" strokeWidth="2" />
      <circle cx="64" cy="64" r="34" stroke={`url(#${gradId}-red)`} strokeWidth="3.2" />

      <rect x="44" y="54" width="6.5" height="20" rx="3.25" fill={`url(#${gradId}-red)`} />
      <rect x="54.5" y="42" width="6.5" height="44" rx="3.25" fill="#FFFFFF" />
      <rect x="65" y="48" width="6.5" height="32" rx="3.25" fill={`url(#${gradId}-red)`} />
      <rect x="75.5" y="56" width="6.5" height="16" rx="3.25" fill="#F87171" />

      <circle cx="57.75" cy="34.5" r="2.6" fill="#EF4444" />
    </svg>
  );
};
