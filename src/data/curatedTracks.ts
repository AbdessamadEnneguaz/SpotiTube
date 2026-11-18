import { Track, Playlist } from '../types/music';
import coverStudioAmber from '../assets/images/cover_studio_amber_1795013395959.jpg';
import coverGlobalPulse from '../assets/images/cover_global_pulse_1795013397956.jpg';
import coverNightSession from '../assets/images/cover_night_session_1795013399074.jpg';
import coverSavedFavorites from '../assets/images/cover_saved_favorites_1795013396758.jpg';

export interface WorldCountryPreset {
  id: string;
  name: string;
  region: 'americas' | 'europe' | 'africa' | 'asia';
  styleHint: string;
  query: string;
}

export const DEFAULT_FAVORITES_COVER = coverSavedFavorites;

export const STUDIO_PLAYLIST_COVERS = [
  { url: coverStudioAmber, label: 'Amber Vinyl' },
  { url: coverGlobalPulse, label: 'Topographic Pulse' },
  { url: coverNightSession, label: 'Night Booth' },
  { url: coverSavedFavorites, label: 'Indigo Copper' }
];

export const WORLD_COUNTRY_PRESETS: WorldCountryPreset[] = [
  { id: 'us', name: 'United States', region: 'americas', styleHint: 'Pop · Hip-Hop · R&B', query: 'Top USA Hits Official Audio' },
  { id: 'uk', name: 'United Kingdom', region: 'europe', styleHint: 'UK Pop · Indie · Soul', query: 'UK Top Charts Official Audio' },
  { id: 'ng', name: 'Nigeria', region: 'africa', styleHint: 'Afrobeats · Afro-Pop', query: 'Top Afrobeats Nigeria Hits Official' },
  { id: 'kr', name: 'South Korea', region: 'asia', styleHint: 'K-Pop · Dance', query: 'Top K-Pop Hits Official MV' },
  { id: 'es', name: 'Spain & Latin', region: 'americas', styleHint: 'Latin · Reggaeton', query: 'Top Latin Hits Reggaeton Official' },
  { id: 'fr', name: 'France & Belgium', region: 'europe', styleHint: 'French Pop · Electro', query: 'Top French Hits Electro Official' },
  { id: 'jp', name: 'Japan', region: 'asia', styleHint: 'J-Pop · City Pop', query: 'Top J-Pop Hits Official' },
  { id: 'za', name: 'South Africa', region: 'africa', styleHint: 'Amapiano · House', query: 'Top South Africa Amapiano Official' },
  { id: 'br', name: 'Brazil', region: 'americas', styleHint: 'Funk · MPB · Pop', query: 'Top Brazil Music Hits Official' },
  { id: 'in', name: 'India', region: 'asia', styleHint: 'Bollywood · Indie', query: 'Top Indian Music Hits Official' }
];

export const CURATED_TRACKS: Track[] = [
  // --- AMERICAS (USA, Canada, Puerto Rico, Colombia, Brazil) ---
  {
    id: 'global_1',
    youtubeId: '4NRXx6U8ABQ',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    country: 'Canada',
    region: 'americas',
    thumbnail: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/mqdefault.jpg',
    durationSeconds: 263,
    durationFormatted: '4:23',
    genre: 'pop',
    views: '800M'
  },
  {
    id: 'global_3',
    youtubeId: 'tvTRZJ-4EyI',
    title: 'HUMBLE.',
    artist: 'Kendrick Lamar',
    album: 'DAMN.',
    country: 'United States',
    region: 'americas',
    thumbnail: 'https://i.ytimg.com/vi/tvTRZJ-4EyI/mqdefault.jpg',
    durationSeconds: 184,
    durationFormatted: '3:04',
    genre: 'hiphop',
    views: '980M'
  },
  {
    id: 'americas_drake',
    youtubeId: 'xpVfcZ0ZcFM',
    title: "God's Plan",
    artist: 'Drake',
    album: 'Scorpion',
    country: 'Canada',
    region: 'americas',
    thumbnail: 'https://i.ytimg.com/vi/xpVfcZ0ZcFM/mqdefault.jpg',
    durationSeconds: 357,
    durationFormatted: '5:57',
    genre: 'hiphop',
    views: '1.6B'
  },
  {
    id: 'latin_1',
    youtubeId: 'Cr8K88UcO0s',
    title: 'Tití Me Preguntó',
    artist: 'Bad Bunny',
    album: 'Un Verano Sin Ti',
    country: 'Puerto Rico',
    region: 'americas',
    thumbnail: 'https://i.ytimg.com/vi/Cr8K88UcO0s/mqdefault.jpg',
    durationSeconds: 291,
    durationFormatted: '4:51',
    genre: 'latin',
    views: '910M'
  },
  {
    id: 'latin_2',
    youtubeId: 'CocEMWdc7Ck',
    title: 'BZRP Music Sessions #53',
    artist: 'Shakira & Bizarrap',
    album: 'World Session',
    country: 'Colombia / Argentina',
    region: 'americas',
    thumbnail: 'https://i.ytimg.com/vi/CocEMWdc7Ck/mqdefault.jpg',
    durationSeconds: 218,
    durationFormatted: '3:38',
    genre: 'latin',
    views: '780M'
  },
  {
    id: 'latin_3',
    youtubeId: 'hFCjGiawJi4',
    title: 'Envolver',
    artist: 'Anitta',
    album: 'Versions of Me',
    country: 'Brazil',
    region: 'americas',
    thumbnail: 'https://i.ytimg.com/vi/hFCjGiawJi4/mqdefault.jpg',
    durationSeconds: 195,
    durationFormatted: '3:15',
    genre: 'latin',
    views: '690M'
  },

  // --- EUROPE (UK, France, Belgium, Spain) ---
  {
    id: 'global_2',
    youtubeId: 'TUVcZfQe-Kw',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    country: 'United Kingdom',
    region: 'europe',
    thumbnail: 'https://i.ytimg.com/vi/TUVcZfQe-Kw/mqdefault.jpg',
    durationSeconds: 231,
    durationFormatted: '3:51',
    genre: 'pop',
    views: '920M'
  },
  {
    id: 'europe_adele',
    youtubeId: 'U3ASj1L6_sY',
    title: 'Easy On Me',
    artist: 'Adele',
    album: '30',
    country: 'United Kingdom',
    region: 'europe',
    thumbnail: 'https://i.ytimg.com/vi/U3ASj1L6_sY/mqdefault.jpg',
    durationSeconds: 332,
    durationFormatted: '5:32',
    genre: 'pop',
    views: '410M'
  },
  {
    id: 'europe_coldplay',
    youtubeId: 'dvgZkm1xWPE',
    title: 'Viva La Vida',
    artist: 'Coldplay',
    album: 'Viva la Vida',
    country: 'United Kingdom',
    region: 'europe',
    thumbnail: 'https://i.ytimg.com/vi/dvgZkm1xWPE/mqdefault.jpg',
    durationSeconds: 243,
    durationFormatted: '4:03',
    genre: 'global',
    views: '940M'
  },
  {
    id: 'global_4',
    youtubeId: '5NV6Rdv1a3I',
    title: 'Get Lucky',
    artist: 'Daft Punk ft. Pharrell Williams',
    album: 'Random Access Memories',
    country: 'France',
    region: 'europe',
    thumbnail: 'https://i.ytimg.com/vi/5NV6Rdv1a3I/mqdefault.jpg',
    durationSeconds: 249,
    durationFormatted: '4:09',
    genre: 'electronic',
    views: '710M'
  },
  {
    id: 'europe_stromae',
    youtubeId: 'VHoT4N43jK8',
    title: 'Alors on danse',
    artist: 'Stromae',
    album: 'Cheese',
    country: 'Belgium',
    region: 'europe',
    thumbnail: 'https://i.ytimg.com/vi/VHoT4N43jK8/mqdefault.jpg',
    durationSeconds: 235,
    durationFormatted: '3:55',
    genre: 'electronic',
    views: '620M'
  },
  {
    id: 'europe_rosalia',
    youtubeId: '5g2hT4GmAGU',
    title: 'DESPECHÁ',
    artist: 'ROSALÍA',
    album: 'MOTOMAMI +',
    country: 'Spain',
    region: 'europe',
    thumbnail: 'https://i.ytimg.com/vi/5g2hT4GmAGU/mqdefault.jpg',
    durationSeconds: 159,
    durationFormatted: '2:39',
    genre: 'latin',
    views: '490M'
  },

  // --- AFRICA (Nigeria, South Africa, North Africa Fusion) ---
  {
    id: 'africa_burna',
    youtubeId: '421w1j87fEM',
    title: 'Last Last',
    artist: 'Burna Boy',
    album: 'Love, Damini',
    country: 'Nigeria',
    region: 'africa',
    thumbnail: 'https://i.ytimg.com/vi/421w1j87fEM/mqdefault.jpg',
    durationSeconds: 174,
    durationFormatted: '2:54',
    genre: 'afrobeats',
    views: '340M'
  },
  {
    id: 'africa_rema',
    youtubeId: 'CQLsdm1ZYAw',
    title: 'Calm Down',
    artist: 'Rema',
    album: 'Rave & Roses',
    country: 'Nigeria',
    region: 'africa',
    thumbnail: 'https://i.ytimg.com/vi/CQLsdm1ZYAw/mqdefault.jpg',
    durationSeconds: 220,
    durationFormatted: '3:40',
    genre: 'afrobeats',
    views: '1.0B'
  },
  {
    id: 'africa_tyla',
    youtubeId: 'XoiOOiuH8iI',
    title: 'Water',
    artist: 'Tyla',
    album: 'Tyla',
    country: 'South Africa',
    region: 'africa',
    thumbnail: 'https://i.ytimg.com/vi/XoiOOiuH8iI/mqdefault.jpg',
    durationSeconds: 220,
    durationFormatted: '3:40',
    genre: 'afrobeats',
    views: '290M'
  },
  {
    id: 'rai_3',
    youtubeId: 'C3lWwBslWqg',
    title: 'Desert Rose',
    artist: 'Sting ft. Cheb Mami',
    album: 'Brand New Day',
    country: 'UK / Algeria',
    region: 'africa',
    thumbnail: 'https://i.ytimg.com/vi/C3lWwBslWqg/mqdefault.jpg',
    durationSeconds: 284,
    durationFormatted: '4:44',
    genre: 'global',
    views: '320M'
  },

  // --- ASIA (South Korea, Japan, India) ---
  {
    id: 'asia_bts',
    youtubeId: 'gdZLi9oWNZg',
    title: 'Dynamite',
    artist: 'BTS',
    album: 'BE',
    country: 'South Korea',
    region: 'asia',
    thumbnail: 'https://i.ytimg.com/vi/gdZLi9oWNZg/mqdefault.jpg',
    durationSeconds: 224,
    durationFormatted: '3:44',
    genre: 'kpop',
    views: '1.9B'
  },
  {
    id: 'asia_blackpink',
    youtubeId: 'gQlMMD8auMs',
    title: 'Pink Venom',
    artist: 'BLACKPINK',
    album: 'BORN PINK',
    country: 'South Korea',
    region: 'asia',
    thumbnail: 'https://i.ytimg.com/vi/gQlMMD8auMs/mqdefault.jpg',
    durationSeconds: 194,
    durationFormatted: '3:14',
    genre: 'kpop',
    views: '920M'
  },
  {
    id: 'asia_peggy',
    youtubeId: 'sCz5y84dwuA',
    title: '(It Goes Like) Nanana',
    artist: 'Peggy Gou',
    album: 'I Hear You',
    country: 'South Korea',
    region: 'asia',
    thumbnail: 'https://i.ytimg.com/vi/sCz5y84dwuA/mqdefault.jpg',
    durationSeconds: 165,
    durationFormatted: '2:45',
    genre: 'electronic',
    views: '110M'
  },
  {
    id: 'asia_yoasobi',
    youtubeId: 'ZRtdQ81jPUQ',
    title: 'Idol',
    artist: 'YOASOBI',
    album: 'THE BOOK 3',
    country: 'Japan',
    region: 'asia',
    thumbnail: 'https://i.ytimg.com/vi/ZRtdQ81jPUQ/mqdefault.jpg',
    durationSeconds: 226,
    durationFormatted: '3:46',
    genre: 'global',
    views: '550M'
  },
  {
    id: 'asia_india',
    youtubeId: 'BddP6PYo2gs',
    title: 'Kesariya',
    artist: 'Arijit Singh & Pritam',
    album: 'Brahmāstra',
    country: 'India',
    region: 'asia',
    thumbnail: 'https://i.ytimg.com/vi/BddP6PYo2gs/mqdefault.jpg',
    durationSeconds: 173,
    durationFormatted: '2:53',
    genre: 'global',
    views: '590M'
  }
];

export const PLAYLISTS: Playlist[] = [
  {
    id: 'playlist_world_charts',
    name: 'Global Top Rotation',
    description: 'Essential worldwide hits spanning Canada, the US, Europe, Latin America, Africa, and Asia.',
    regionLabel: 'All Countries',
    coverImage: coverGlobalPulse,
    tracks: CURATED_TRACKS.slice(0, 10)
  },
  {
    id: 'playlist_americas_latin',
    name: 'Americas & Latin Wave',
    description: 'From North American pop and hip-hop to Puerto Rican, Colombian, and Brazilian chart-toppers.',
    regionLabel: 'Americas',
    coverImage: coverStudioAmber,
    tracks: CURATED_TRACKS.filter(t => t.region === 'americas')
  },
  {
    id: 'playlist_africa_pulse',
    name: 'Afrobeats & Amapiano Pulse',
    description: 'High-energy rhythms from Lagos, Johannesburg, and Mediterranean world collaborations.',
    regionLabel: 'Africa',
    coverImage: coverSavedFavorites,
    tracks: CURATED_TRACKS.filter(t => t.region === 'africa')
  },
  {
    id: 'playlist_asia_soundwave',
    name: 'Asia Soundwave',
    description: 'Seoul K-Pop anthems, Tokyo electronic pop, and Mumbai cinematic melodies.',
    regionLabel: 'Asia',
    coverImage: coverNightSession,
    tracks: CURATED_TRACKS.filter(t => t.region === 'asia')
  },
  {
    id: 'playlist_europe_nights',
    name: 'Europe Electronic & Pop',
    description: 'London arena anthems, French touch classics, Brussels club grooves, and Madrid hits.',
    regionLabel: 'Europe',
    coverImage: coverGlobalPulse,
    tracks: CURATED_TRACKS.filter(t => t.region === 'europe')
  }
];
