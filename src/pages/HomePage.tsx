import React from 'react';
import {
  Play,
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
  const pageHubs: Array<{
    view: AppView;
    title: string;
    subtitle: string;
    meta: string;
    icon: React.ReactNode;
  }> = [
    {
      view: 'countries',
      title: 'Countries',
      subtitle: 'US, UK, Nigeria, Korea, Japan, Brazil & more',
      meta: `${countriesCount} scenes`,
      icon: <Globe2 className="w-5 h-5 text-[#DFCCB0]" />
    },
    {
      view: 'mixes',
      title: 'World Mixes',
      subtitle: 'Curated collections across every continent',
      meta: `${mixesCount} mixes`,
      icon: <Disc3 className="w-5 h-5 text-[#DFCCB0]" />
    },
    {
      view: 'charts',
      title: 'Regional Charts',
      subtitle: 'Filter Americas, Europe, Africa & Asia',
      meta: '4 regions',
      icon: <BarChart3 className="w-5 h-5 text-[#DFCCB0]" />
    },
    {
      view: 'recent',
      title: 'Recent & Cached',
      subtitle: 'Listening history & offline-ready tracks',
      meta: `${cachedCount} saved`,
      icon: <History className="w-5 h-5 text-[#DFCCB0]" />
    }
  ];

  return (
    <div className="space-y-7">
      {/* Compact Editorial Hero */}
      <section className="relative rounded-2xl overflow-hidden border border-[#EAE0D0]/[0.08] bg-[#1B1815]">
        <div className="relative min-h-[195px] sm:min-h-[220px] flex flex-col justify-end p-5 sm:p-7">
          <img
            src={heroWorldStudio}
            alt="Analog mastering turntable and brushed studio console"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-50 sepia-[.15]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#12100E] via-[#12100E]/88 to-[#12100E]/35" />
          <div className="relative z-10 max-w-2xl space-y-2.5">
            <div className="text-xs font-medium text-[#DFCCB0] flex items-center gap-2">
              <Globe2 className="w-3.5 h-3.5" />
              <span>Global Soundstage · Curated by Region</span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#F5F0E8] tracking-tight text-balance">
              Global sounds, one clean space
            </h1>
            <p className="text-xs sm:text-sm text-[#C8BEB0] leading-relaxed max-w-lg">
              Pick a section below to open its dedicated page — fast, uncluttered, and ready offline.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onPlayRotation}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D8C3A5] hover:bg-[#E4D3BA] text-[#12100E] font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play World Rotation</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigatePage('countries')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EAE0D0]/[0.08] hover:bg-[#EAE0D0]/[0.14] text-[#F5F0E8] font-semibold text-xs sm:text-sm border border-[#EAE0D0]/12 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Compass className="w-4 h-4 text-[#DFCCB0]" />
                <span>Browse Countries</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Dedicated Page Hubs (Tap any tile to open its own page) */}
      <section className="space-y-3" aria-label="Browse Pages">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg sm:text-xl font-bold text-[#F5F0E8]">
            Explore Pages
          </h2>
          <span className="text-xs text-[#9E9384]">Tap any section to open</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {pageHubs.map((hub) => (
            <button
              type="button"
              key={hub.view}
              onClick={() => onNavigatePage(hub.view)}
              className="card-interactive group text-left p-4 rounded-2xl bg-[#1B1815] hover:bg-[#24201B] border border-[#EAE0D0]/[0.08] hover:border-[#D8C3A5]/45 cursor-pointer flex flex-col justify-between gap-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#D8C3A5]/12 border border-[#D8C3A5]/20 flex items-center justify-center">
                  {hub.icon}
                </div>
                <ArrowRight className="w-4 h-4 text-[#9E9384] group-hover:text-[#DFCCB0] group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-base font-bold text-[#F5F0E8]">
                    {hub.title}
                  </h3>
                  <span className="text-[11px] font-mono tabular-nums text-[#DFCCB0]">
                    {hub.meta}
                  </span>
                </div>
                <p className="text-xs text-[#9E9384] mt-1 line-clamp-2">
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
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#F5F0E8]">
              Featured Today
            </h2>
            <p className="text-xs text-[#9E9384] mt-0.5">
              Tap a track for artist biography &amp; credits
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigatePage('charts')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#DFCCB0] hover:text-[#EDE0CC] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
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
