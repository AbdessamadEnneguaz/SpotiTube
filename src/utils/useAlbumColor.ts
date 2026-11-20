import { useEffect, useState } from 'react';
import {
  AlbumColorPalette,
  DEFAULT_ALBUM_PALETTE,
  extractAlbumColor,
} from './albumColor';

export function useAlbumColor(
  thumbnailUrl?: string | null,
  youtubeId?: string | null
): AlbumColorPalette {
  const [palette, setPalette] = useState<AlbumColorPalette>(DEFAULT_ALBUM_PALETTE);

  useEffect(() => {
    if (!thumbnailUrl && !youtubeId) {
      setPalette(DEFAULT_ALBUM_PALETTE);
      return;
    }

    let cancelled = false;
    extractAlbumColor(thumbnailUrl, youtubeId)
      .then((next) => {
        if (!cancelled) {
          setPalette(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPalette(DEFAULT_ALBUM_PALETTE);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [thumbnailUrl, youtubeId]);

  return palette;
}
