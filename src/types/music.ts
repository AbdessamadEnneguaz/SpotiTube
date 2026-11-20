export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export type AppView =
  | 'home'
  | 'countries'
  | 'mixes'
  | 'charts'
  | 'recent'
  | 'search'
  | 'library'
  | 'playlist';

export type WorldRegion = 'americas' | 'europe' | 'africa' | 'asia' | 'global';

export interface Track {
  id: string; // unique internal id or youtube video id
  youtubeId: string;
  title: string;
  artist: string;
  album?: string;
  country?: string;
  region?: WorldRegion;
  thumbnail: string;
  durationSeconds: number;
  durationFormatted: string;
  genre: 'global' | 'pop' | 'hiphop' | 'afrobeats' | 'latin' | 'electronic' | 'kpop' | 'chaabi' | 'rai' | 'rap' | 'other';
  views?: string;
  lyrics?: LyricLine[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  regionLabel?: string;
  coverImage: string;
  tracks: Track[];
  isCustom?: boolean;
}

export type RepeatMode = 'off' | 'all' | 'one';

export type EqualizerPreset =
  | 'flat'
  | 'bass_boost'
  | 'pop'
  | 'rock'
  | 'vocal'
  | 'electronic';

export type CrossfadeSeconds = 0 | 2 | 4;

export interface EqualizerSettings {
  preset: EqualizerPreset;
  band60Hz: number; // -12 to +12 dB (Low shelf)
  band230Hz: number; // -12 to +12 dB (Peaking)
  band910Hz: number; // -12 to +12 dB (Peaking)
  band3600Hz: number; // -12 to +12 dB (Peaking)
  band14000Hz: number; // -12 to +12 dB (High shelf)
}

export interface AudioSettings {
  normalizationEnabled: boolean;
  crossfadeSeconds: CrossfadeSeconds;
  equalizer: EqualizerSettings;
}

export interface LyricsData {
  syncedLines: LyricLine[];
  plainText: string | null;
  source: 'lrclib_synced' | 'lrclib_plain' | 'none';
  matchedTitle?: string;
  matchedArtist?: string;
}

export interface OfflineTrackMetadata {
  youtubeId: string;
  track: Track;
  mimeType: string;
  sizeBytes: number;
  coverSizeBytes: number;
  savedAt: number;
}

export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  queue: Track[];
  history: Track[];
  queueIndex: number;
  audioQuality: 'normal' | 'high' | 'very_high_320k';
  crossfadeSeconds: CrossfadeSeconds;
}
