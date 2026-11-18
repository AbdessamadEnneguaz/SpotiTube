export interface LyricLine {
  time: number; // in seconds
  text: string;
}

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

export interface EqualizerSettings {
  preset: 'flat' | 'bass_boost' | 'acoustic' | 'hip_hop' | 'vocal' | 'electronic';
  bass: number; // -10 to +10 dB
  midLow: number;
  mid: number;
  midHigh: number;
  treble: number;
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
  crossfadeSeconds: number;
}
