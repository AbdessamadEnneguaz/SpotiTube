export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface Track {
  id: string; // unique internal id or youtube video id
  youtubeId: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail: string;
  durationSeconds: number;
  durationFormatted: string;
  genre: 'chaabi' | 'rai' | 'rap' | 'global' | 'pop' | 'other';
  views?: string;
  lyrics?: LyricLine[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
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
