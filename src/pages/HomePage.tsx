import React from 'react';
import {
  Play,
  Pause,
  Globe2,
  Compass,
  Disc3,
  BarChart3,
  History,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import heroWorldStudio from '../assets/images/hero_world_studio_1795013397130.jpg';
import { AppView, Track } from '../types/music';
import { TrackCard } from '../components/TrackCard';
import { CoverImage } from '../components/CoverImage';

interface HomePageProps {
  featuredTracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  cachedYoutubeIds: Set<string>;
  isOfflineMode: boolean;
  cachedCount: number;
  mixesCount: number;
  countriesCount: number;
  onPlayRotation: () => void;
  onNavigatePage: (view: AppView) => void;
  onInspectTrack: (track: Track, list: Track[]) => void;
  onPlayToggleTrack: (track: Track, list: Track[]) => void;
}

export const HomePage: React.FC<HomePageProps> = React.memo(({
  featuredTracks,
  currentTrack,
  isPlaying,
  cachedYoutubeIds,
  isOfflineMode,
  cachedCount,
  mixesCount,
  countriesCount,
  onPlayRotation,
  onNavigatePage,
  onInspectTrack,
  onPlayToggleTrack
}) => {
  const spotlightTrack = currentTrack || featuredTracks[0] || null;
  const isSpotlightPlaying =
    Boolean(spotlightTrack && currentTrack && (currentTrack.id === spotlightTrack.id || currentTrack.youtubeId === spotlightTrack.youtubeId) && isPlaying);

  const pageHubs: Array<{
    view: AppView;
    title: string;
    subtitle: string;
    meta: string;
    featured?: boolean;
    icon: React.ReactNode;
  }> = [
    {
      view: 'countries',
      title: 'Countries',
      subtitle: 'US, UK, Nigeria, Korea, Japan, Brazil & more',
      meta: `${countriesCount} scenes`,
      featured: true,
      icon: <Globe2 className="w-5 h-5 text-white" />
    },
    {
      view: 'mixes',
      title: 'World Mixes',
      subtitle: 'Curated collections across every continent',
      meta: `${mixesCount} mixes`,
      icon: <Disc3 className="w-5 h-5 text-[#FF443A]" />
    },
    {
      view: 'charts',
      title: 'Regional Charts',
      subtitle: 'Filter Americas, Europe, Africa & Asia',
      meta: '4 regions',
      icon: <BarChart3 className="w-5 h-5 text-[#FF443A]" />
    },
    {
      view: 'recent',
      title: 'Recent & Cached',
      subtitle: 'Listening history & offline-ready tracks',
      meta: `${cachedCount} saved`,
      icon: <History className="w-5 h-5 text-[#FF443A]" />
    }
  ];

  return (
    <div className="space-y-7">
      {/* Bold Obsidian + Crimson Spotlight Stage */}
      <section className="relative rounded-2xl overflow-hidden border border-white/[0.09] bg-[#0B090A]">
        <img
          src={heroWorldStudio}
          alt="Kiddwave mastering stage and studio console"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-28 grayscale contrast-125"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-[#230607]/92 via-[#0D0A0B]/92 to-[#070607]/96"
        />
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-[#EF2323]/20 blur-3xl pointer-events-none"
        />

        <div className="relative z-10 p-5 sm:p-7 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between gap-4">
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-[#FF443A] flex items-center gap-2">
                <Globe2 className="w-3.5 h-3.5 shrink-0" />
                <span>Kiddwave Soundstage · Curated by Region</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.08] text-balance">
                Global sound, <span className="text-[#EF2323]">unfiltered</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#D0CBCC] leading-relaxed max-w-lg">
                Instant playback with zero lag. Jump into any country scene, regional chart, or offline collection below.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onPlayRotation}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#EF2323] hover:bg-[#FF3830] text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap shadow-[0_8px_22px_rgba(239,35,35,0.35)]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play World Rotation</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigatePage('countries')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-semibold text-xs sm:text-sm border border-white/14 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Compass className="w-4 h-4 text-[#FF443A]" />
                <span>Browse Countries</span>
              </button>
            </div>
          </div>

          {/* Right Spotlight Track Showcase Card */}
          {spotlightTrack && (
            <div className="lg:col-span-5 flex items-center justify-end">
              <div
                onClick={() => onInspectTrack(spotlightTrack, featuredTracks)}
                className="w-full bg-[#110E0F]/92 hover:bg-[#171213] border border-white/[0.1] hover:border-[#EF2323]/55 rounded-2xl p-3.5 flex items-center gap-3.5 transition-colors cursor-pointer group"
              >
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-[#070607] border border-white/10">
                  <CoverImage
                    src={spotlightTrack.thumbnail}
                    alt={spotlightTrack.title}
                    youtubeId={spotlightTrack.youtubeId}
                    loading="eager"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-[11px] font-semibold text-[#FF443A] truncate">
                    {currentTrack ? 'On Air Now' : 'Featured Release'} · {spotlightTrack.country || 'World'}
                  </div>
                  <div className="font-display text-sm sm:text-base font-bold text-white truncate">
                    {spotlightTrack.title}
                  </div>
                  <div className="text-xs text-[#A39E9F] truncate tabular-nums">
                    {spotlightTrack.artist} · {spotlightTrack.durationFormatted}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayToggleTrack(spotlightTrack, featuredTracks);
                  }}
                  aria-label={isSpotlightPlaying ? `Pause ${spotlightTrack.title}` : `Play ${spotlightTrack.title}`}
                  className="w-11 h-11 rounded-xl bg-[#EF2323] hover:bg-[#FF3830] text-white flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-[0_6px_18px_rgba(239,35,35,0.4)]"
                >
                  {isSpotlightPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current translate-x-0.2" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Dedicated Page Hubs (Tap any tile to open its own page) */}
      <section className="space-y-3" aria-label="Browse Pages">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg sm:text-xl font-bold text-white">
            Explore Pages
          </h2>
          <span className="text-xs text-[#A39E9F]">Tap any section to open</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {pageHubs.map((hub) => (
            <button
              type="button"
              key={hub.view}
              onClick={() => onNavigatePage(hub.view)}
              className={`card-interactive group text-left p-4 rounded-2xl border cursor-pointer flex flex-col justify-between gap-3 transition-colors ${
                hub.featured
                  ? 'bg-gradient-to-br from-[#350A0B] via-[#1B090A] to-[#110E0F] border-[#EF2323]/45 hover:border-[#FF443A]'
                  : 'bg-[#110E0F] hover:bg-[#171213] border-white/[0.08] hover:border-[#EF2323]/45'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    hub.featured
                      ? 'bg-[#EF2323] border-[#FF443A] shadow-[0_4px_14px_rgba(239,35,35,0.35)]'
                      : 'bg-[#EF2323]/12 border-[#EF2323]/28'
                  }`}
                >
                  {hub.icon}
                </div>
                <ArrowRight className="w-4 h-4 text-[#A39E9F] group-hover:text-[#FF443A] group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-base font-bold text-white">
                    {hub.title}
                  </h3>
                  <span className="text-[11px] font-mono tabular-nums text-[#FF443A]">
                    {hub.meta}
                  </span>
                </div>
                <p className="text-xs text-[#A39E9F] mt-1 line-clamp-2">
                  {hub.subtitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Lightweight Featured Preview (4 tracks only, links to Charts page) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-white">
              Featured Today
            </h2>
            <p className="text-xs text-[#A39E9F] mt-0.5">
              Tap any track for artist biography &amp; instant audio
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigatePage('charts')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF443A] hover:text-white transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            <span>See all charts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {featuredTracks.slice(0, 4).map((track, idx) => {
            const isCurrent =
              currentTrack?.id === track.id || currentTrack?.youtubeId === track.youtubeId;
            const isCached = cachedYoutubeIds.has(track.youtubeId);
            return (
              <TrackCard
                key={track.id}
                track={track}
                isCurrent={isCurrent}
                isPlaying={isPlaying}
                isCached={isCached}
                isOfflineDisabled={isOfflineMode && !isCached}
                priorityLoad={idx < 2}
                onInspect={(t) => onInspectTrack(t, featuredTracks)}
                onPlayToggle={(t) => onPlayToggleTrack(t, featuredTracks)}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
});
