import React, { useState, useEffect } from 'react';

const FALLBACK_ART_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#241F1A"/>
          <stop offset="100%" stop-color="#12100E"/>
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="url(#g)"/>
      <circle cx="100" cy="100" r="44" fill="none" stroke="#D8C3A5" stroke-width="4" opacity="0.7"/>
      <circle cx="100" cy="100" r="26" fill="none" stroke="#DFCCB0" stroke-width="2" opacity="0.45"/>
      <rect x="88" y="84" width="5" height="32" rx="2.5" fill="#D8C3A5"/>
      <rect x="97.5" y="74" width="5" height="52" rx="2.5" fill="#F5F0E8"/>
      <rect x="107" y="88" width="5" height="24" rx="2.5" fill="#D8C3A5"/>
    </svg>`
  );

interface CoverImageProps {
  src: string;
  alt: string;
  youtubeId?: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  onClick?: () => void;
}

export const CoverImage: React.FC<CoverImageProps> = React.memo(({
  src,
  alt,
  youtubeId,
  className = '',
  loading = 'lazy',
  onClick
}) => {
  const [currentSrc, setCurrentSrc] = useState(src || FALLBACK_ART_SVG);
  const [fallbackStep, setFallbackStep] = useState(0);

  useEffect(() => {
    setCurrentSrc(src || FALLBACK_ART_SVG);
    setFallbackStep(0);
  }, [src, youtubeId]);

  const handleError = () => {
    if (fallbackStep === 0 && youtubeId) {
      const mqUrl = `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;
      const hqUrl = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
      setFallbackStep(1);
      setCurrentSrc(currentSrc === mqUrl ? hqUrl : mqUrl);
    } else if (fallbackStep <= 1) {
      setFallbackStep(2);
      setCurrentSrc(FALLBACK_ART_SVG);
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={handleError}
      onClick={onClick}
      className={className}
    />
  );
});
