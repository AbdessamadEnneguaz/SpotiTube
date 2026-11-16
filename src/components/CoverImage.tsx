import React, { useState, useEffect } from 'react';

const FALLBACK_ART_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#14532d"/>
          <stop offset="100%" stop-color="#09090b"/>
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="url(#g)"/>
      <circle cx="100" cy="100" r="44" fill="none" stroke="#1db954" stroke-width="5" opacity="0.8"/>
      <path d="M92 78v36.5a11 11 0 1 1-6-9.8V74l32-8v38.5a11 11 0 1 1-6-9.8V73z" fill="#1db954"/>
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
      onError={handleError}
      onClick={onClick}
      className={className}
    />
  );
});
