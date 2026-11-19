import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ChevronDown,
  MapPin,
  Disc3,
  Music2,
  UserRound,
  Search,
  Sparkles
} from 'lucide-react';
import { Track, RepeatMode } from '../types/music';
import { formatDuration } from '../utils/formatters';
import {
  buildArtistProfile,
  extractPrimaryArtistName,
  findRelatedTracks,
  getCuratedArtistProfile
} from '../utils/artistProfile';
import { CoverImage } from './CoverImage';

interface ExpandedCoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  catalog: Track[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  isLiked: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (seconds: number) => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onToggleLike: (track: Track) => void;
  onPlayTrack: (track: Track, contextList?: Track[]) => void;
  onSearchArtist: (artistName: string) => void;
}

interface LiveArtistResponse {
  found?: boolean;
  extract?: string;
  description?: string;
  thumbnail?: string;
}

export const ExpandedCoverModal: React.FC<ExpandedCoverModalProps> = ({
  isOpen,
  onClose,
  track,
  catalog,
  isPlaying,
  currentTime,
  duration,
  repeatMode,
  isShuffle,
  isLiked,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  onToggleRepeat,
  onToggleShuffle,
  onToggleLike,
  onPlayTrack,
  onSearchArtist
}) => {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState(0);
  const [liveArtistData, setLiveArtistData] = useState<LiveArtistResponse | null>(null);
  const [isLoadingArtist, setIsLoadingArtist] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const primaryArtistName = useMemo(
    () => (track ? extractPrimaryArtistName(track.artist) : ''),
    [track?.artist]
  );

  useEffect(() => {
    if (track) {
      const highRes = `https://i.ytimg.com/vi/${track.youtubeId}/hqdefault.jpg`;
      setImgSrc(track.thumbnail || highRes);
    }
  }, [track?.youtubeId, track?.thumbnail]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [liveArtistData?.thumbnail, track?.artist]);

  useEffect(() => {
    if (!isOpen || !track) return;

    const curated = getCuratedArtistProfile(track.artist);
    if (curated) {
      setLiveArtistData(null);
      setIsLoadingArtist(false);
      return;
    }

    let cancelled = false;
    setLiveArtistData(null);
    setIsLoadingArtist(true);

    fetch(`/api/artist?name=${encodeURIComponent(primaryArtistName)}`)
      .then((res) => (res.ok ? res.json() : { found: false }))
      .then((data: LiveArtistResponse) => {
        if (!cancelled) {
          setLiveArtistData(data?.found ? data : null);
        }
      })
      .catch(() => {
        if (!cancelled) setLiveArtistData(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingArtist(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, track?.artist, primaryArtistName]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const artistProfile = useMemo(() => {
    if (!track) return null;
    return buildArtistProfile(track, liveArtistData);
  }, [track, liveArtistData]);

  const relatedTracks = useMemo(() => {
    if (!track) return [];
    return findRelatedTracks(track, catalog, 4);
  }, [track, catalog]);

  if (!isOpen || !track || !artistProfile) return null;

  const effectiveDuration =
    currentTime > 0 && duration > 0 ? duration : (track.durationSeconds || duration);
  const displayTime = isSeeking ? seekVal : currentTime;
  const progressPercent =
    effectiveDuration > 0 ? Math.min(100, Math.max(0, (displayTime / effectiveDuration) * 100)) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Track and artist details for ${track.title}`}
      className="fixed inset-0 z-50 flex flex-col bg-[#070607]/98 text-[#F4F1F1] overflow-hidden"
    >
      {/* Ambient Crimson & Artwork Backdrop */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <img
          src={imgSrc || track.thumbnail}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover blur-3xl scale-125 opacity-20 grayscale contrast-125"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#230607]/80 via-[#070607]/92 to-[#070607]" />
      </div>

      {/* Sticky Top Header */}
      <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-white/[0.08] shrink-0 bg-[#070607]/80 backdrop-blur-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close track view"
          className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#D0CBCC] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center min-w-0 px-3">
          <span className="text-[11px] font-semibold text-[#FF443A] truncate">
            Now Playing{track.country ? ` · ${track.country}` : ''}
          </span>
          <span className="text-xs font-semibold text-white truncate max-w-[220px] sm:max-w-md">
            {track.album && track.album !== 'Studio Single' ? track.album : artistProfile.name}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#D0CBCC] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Studio Two-Column Workspace */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* LEFT: Artwork, Seekbar & Transport Controls */}
          <div className="lg:col-span-5 lg:sticky lg:top-2 flex flex-col items-center">
            <div className="aspect-square w-full max-w-[290px] sm:max-w-[340px] lg:max-w-full rounded-2xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.9)] border border-white/12 mb-5 bg-[#110E0F]">
              <img
                src={imgSrc || track.thumbnail}
                referrerPolicy="no-referrer"
                onError={() => {
                  if (track) {
                    setImgSrc(`https://i.ytimg.com/vi/${track.youtubeId}/mqdefault.jpg`);
                  }
                }}
                alt={track.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="w-full flex items-center justify-between gap-3 mb-4">
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight truncate">
                  {track.title}
                </h1>
                <p className="text-sm text-[#D0CBCC] font-medium truncate mt-0.5">
                  {track.artist}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onToggleLike(track)}
                aria-label={isLiked ? 'Unlike track' : 'Like track'}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                  isLiked
                    ? 'text-[#FF443A] bg-[#EF2323]/15 border border-[#EF2323]/40'
                    : 'text-[#D0CBCC] hover:text-white bg-white/[0.06] border border-white/12'
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Seekbar */}
            <div className="w-full space-y-1.5 mb-5">
              <div className="relative w-full group flex items-center">
                <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#EF2323] rounded-full transition-colors"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={effectiveDuration || 100}
                  step={1}
                  value={displayTime}
                  onChange={(e) => setSeekVal(parseFloat(e.target.value))}
                  onMouseDown={() => {
                    setIsSeeking(true);
                    setSeekVal(currentTime);
                  }}
                  onMouseUp={() => {
                    setIsSeeking(false);
                    onSeek(seekVal);
                  }}
                  onTouchStart={() => {
                    setIsSeeking(true);
                    setSeekVal(currentTime);
                  }}
                  onTouchEnd={() => {
                    setIsSeeking(false);
                    onSeek(seekVal);
                  }}
                  aria-label="Track progress seekbar"
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="flex justify-between text-xs font-mono tabular-nums text-[#A39E9F]">
                <span>{formatDuration(displayTime)}</span>
                <span>{formatDuration(effectiveDuration)}</span>
              </div>
            </div>

            {/* Transport Controls */}
            <div className="w-full flex items-center justify-between px-1.5 py-2 rounded-2xl bg-[#110E0F] border border-white/[0.08]">
              <button
                type="button"
                onClick={onToggleShuffle}
                aria-label="Toggle shuffle"
                className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                  isShuffle ? 'text-[#FF443A] bg-[#EF2323]/14' : 'text-[#A39E9F] hover:text-white'
                }`}
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onPrevious}
                aria-label="Previous track"
                className="text-[#D0CBCC] hover:text-white transition-colors cursor-pointer p-2.5"
              >
                <SkipBack className="w-6 h-6 fill-current" />
              </button>

              <button
                type="button"
                onClick={onPlayPause}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="w-14 h-14 rounded-2xl bg-[#EF2323] hover:bg-[#FF3830] text-white flex items-center justify-center active:scale-95 transition-transform shadow-[0_8px_24px_rgba(239,35,35,0.4)] cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current translate-x-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={onNext}
                aria-label="Next track"
                className="text-[#D0CBCC] hover:text-white transition-colors cursor-pointer p-2.5"
              >
                <SkipForward className="w-6 h-6 fill-current" />
              </button>

              <button
                type="button"
                onClick={onToggleRepeat}
                aria-label={`Toggle repeat (currently ${repeatMode})`}
                className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                  repeatMode !== 'off' ? 'text-[#FF443A] bg-[#EF2323]/14' : 'text-[#A39E9F] hover:text-white'
                }`}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* RIGHT: Editorial Artist & Track Inspector */}
          <div className="lg:col-span-7 space-y-5">
            {/* About the Artist Card */}
            <section className="rounded-2xl bg-[#110E0F] border border-white/[0.08] overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {liveArtistData?.thumbnail && !avatarFailed ? (
                        <img
                          src={liveArtistData.thumbnail}
                          alt={artistProfile.name}
                          referrerPolicy="no-referrer"
                          onError={() => setAvatarFailed(true)}
                          className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl object-cover shrink-0 bg-[#171213] border border-white/12"
                        />
                      ) : (
                        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl bg-[#EF2323]/14 border border-[#EF2323]/30 flex items-center justify-center shrink-0 text-[#FF443A]">
                          <UserRound className="w-6 h-6 sm:w-7 sm:h-7" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#FF443A]">About the Artist</div>
                        <h2 className="font-display text-lg sm:text-2xl font-extrabold text-white truncate">
                          {artistProfile.name}
                        </h2>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSearchArtist(artistProfile.name);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-[#EF2323] hover:text-white text-[#F4F1F1] text-xs font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>All Tracks</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#A39E9F]">
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <MapPin className="w-3.5 h-3.5 text-[#FF443A] shrink-0" />
                      <span>{artistProfile.origin}</span>
                    </span>
                    <span className="hidden sm:inline" aria-hidden="true">·</span>
                    <span className="whitespace-nowrap">{artistProfile.activeYears}</span>
                  </div>
                </div>

                {isLoadingArtist ? (
                  <p className="text-xs sm:text-sm text-[#A39E9F]">
                    Loading artist biography...
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-[#D0CBCC] leading-relaxed">
                    {artistProfile.bio}
                  </p>
                )}

                <div className="pt-3 border-t border-white/[0.08] space-y-2">
                  <div className="text-xs font-semibold text-[#F4F1F1] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF443A]" />
                    <span>Musical Identity &amp; What They Create</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#D0CBCC] leading-relaxed">
                    {artistProfile.craftSummary}
                  </p>
                  <div className="text-xs text-[#A39E9F] pt-1">
                    {artistProfile.roles.join(' · ')} — {artistProfile.genres.join(' · ')}
                  </div>
                </div>
              </div>
            </section>

            {/* Discography / Notable Works & Track Credits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <section className="rounded-2xl bg-[#110E0F] border border-white/[0.08] p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#FF443A]">
                  <Disc3 className="w-4 h-4" />
                  <span>Notable Releases &amp; Albums</span>
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-[#F4F1F1]">
                  {artistProfile.notableWorks.map((work, idx) => (
                    <li
                      key={work}
                      className="flex items-baseline gap-2.5 border-b border-white/[0.06] pb-1.5 last:border-b-0 last:pb-0"
                    >
                      <span className="font-mono tabular-nums text-[11px] text-[#6F6A6B]">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-medium truncate">{work}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl bg-[#110E0F] border border-white/[0.08] p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#FF443A]">
                  <Music2 className="w-4 h-4" />
                  <span>Track Credits</span>
                </div>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between gap-3 border-b border-white/[0.06] pb-1.5">
                    <dt className="text-[#A39E9F]">Performing Artist</dt>
                    <dd className="text-white font-medium text-right truncate">{track.artist}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-white/[0.06] pb-1.5">
                    <dt className="text-[#A39E9F]">Release</dt>
                    <dd className="text-white font-medium text-right truncate">
                      {track.album || 'Studio Single'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-white/[0.06] pb-1.5">
                    <dt className="text-[#A39E9F]">Label / Imprint</dt>
                    <dd className="text-white font-medium text-right truncate">{artistProfile.label}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#A39E9F]">Duration</dt>
                    <dd className="text-white font-mono tabular-nums font-medium">{track.durationFormatted}</dd>
                  </div>
                </dl>
              </section>
            </div>

            {/* Related Tracks & Same Scene */}
            {relatedTracks.length > 0 && (
              <section className="rounded-2xl bg-[#110E0F] border border-white/[0.08] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm sm:text-base font-bold text-white">
                    More in This Sound &amp; Scene
                  </h3>
                  <span className="text-xs text-[#A39E9F]">Tap to play</span>
                </div>
                <div className="divide-y divide-white/[0.06]">
                  {relatedTracks.map((rel) => (
                    <button
                      type="button"
                      key={rel.id}
                      onClick={() => onPlayTrack(rel, [rel, ...relatedTracks])}
                      className="w-full py-2.5 flex items-center gap-3 text-left hover:bg-white/[0.04] px-2 -mx-2 rounded-xl transition-colors cursor-pointer group"
                    >
                      <CoverImage
                        src={rel.thumbnail}
                        alt={rel.title}
                        youtubeId={rel.youtubeId}
                        className="w-10 h-10 rounded-lg object-cover shrink-0 bg-[#171213]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-semibold text-white group-hover:text-[#FF443A] truncate">
                          {rel.title}
                        </div>
                        <div className="text-[11px] text-[#A39E9F] truncate">
                          {rel.artist}
                          {rel.country ? ` · ${rel.country}` : ''}
                        </div>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-[#6F6A6B] shrink-0">
                        {rel.durationFormatted}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
