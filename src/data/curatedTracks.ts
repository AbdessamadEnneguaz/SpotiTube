import { Track, Playlist } from '../types/music';

export const CURATED_TRACKS: Track[] = [
  // --- MOROCCAN CHAABI ---
  {
    id: 'chaabi_1',
    youtubeId: '5vwSjx-PQFQ',
    title: 'Aayta Daoudia',
    artist: 'Abdellah Daoudi',
    album: 'Les Perles du Chaabi',
    thumbnail: 'https://i.ytimg.com/vi/5vwSjx-PQFQ/hqdefault.jpg',
    durationSeconds: 311,
    durationFormatted: '5:11',
    genre: 'chaabi',
    views: '8.4M'
  },
  {
    id: 'chaabi_2',
    youtubeId: '-F74ce7Uhuk',
    title: 'Zid Dardeg',
    artist: 'Said Senhaji',
    album: 'Chaabi Marocain 100% Ambiance',
    thumbnail: 'https://i.ytimg.com/vi/-F74ce7Uhuk/hqdefault.jpg',
    durationSeconds: 636,
    durationFormatted: '10:36',
    genre: 'chaabi',
    views: '12M'
  },
  {
    id: 'chaabi_3',
    youtubeId: 'q0AcZkR_LUs',
    title: 'Hedi Kedba Bayna',
    artist: 'Najat Aatabou',
    album: 'Voix de l Atlas',
    thumbnail: 'https://i.ytimg.com/vi/q0AcZkR_LUs/hqdefault.jpg',
    durationSeconds: 344,
    durationFormatted: '5:44',
    genre: 'chaabi',
    views: '15M'
  },
  {
    id: 'chaabi_4',
    youtubeId: 'IQ5XgCtR6EM',
    title: 'Moulay Abdellah',
    artist: 'Abdelaziz Stati',
    album: 'Kamanja Sahraouia',
    thumbnail: 'https://i.ytimg.com/vi/IQ5XgCtR6EM/hqdefault.jpg',
    durationSeconds: 1069,
    durationFormatted: '17:49',
    genre: 'chaabi',
    views: '6.1M'
  },
  {
    id: 'chaabi_5',
    youtubeId: 'mGm5hiuY1oE',
    title: 'Kachkoul Chaabi (Ambiance)',
    artist: 'Tahour',
    album: 'Fetes & Mariages',
    thumbnail: 'https://i.ytimg.com/vi/mGm5hiuY1oE/hqdefault.jpg',
    durationSeconds: 613,
    durationFormatted: '10:13',
    genre: 'chaabi',
    views: '9.3M'
  },

  // --- RAI LEGENDS ---
  {
    id: 'rai_1',
    youtubeId: 'tTcnIYYeZI8',
    title: 'Didi',
    artist: 'Cheb Khaled',
    album: 'Khaled (1992)',
    thumbnail: 'https://i.ytimg.com/vi/tTcnIYYeZI8/hqdefault.jpg',
    durationSeconds: 206,
    durationFormatted: '3:26',
    genre: 'rai',
    views: '54M'
  },
  {
    id: 'rai_2',
    youtubeId: 'gzlHucbD76U',
    title: 'Aicha',
    artist: 'Cheb Khaled',
    album: 'Sahra',
    thumbnail: 'https://i.ytimg.com/vi/gzlHucbD76U/hqdefault.jpg',
    durationSeconds: 259,
    durationFormatted: '4:19',
    genre: 'rai',
    views: '185M'
  },
  {
    id: 'rai_3',
    youtubeId: 'C3lWwBslWqg',
    title: 'Desert Rose',
    artist: 'Sting ft. Cheb Mami',
    album: 'Brand New Day',
    thumbnail: 'https://i.ytimg.com/vi/C3lWwBslWqg/hqdefault.jpg',
    durationSeconds: 284,
    durationFormatted: '4:44',
    genre: 'rai',
    views: '320M'
  },
  {
    id: 'rai_4',
    youtubeId: '5BRa19yp1bE',
    title: 'El Visa',
    artist: 'Cheb Hasni',
    album: 'Rai Sentimentale',
    thumbnail: 'https://i.ytimg.com/vi/5BRa19yp1bE/hqdefault.jpg',
    durationSeconds: 323,
    durationFormatted: '5:23',
    genre: 'rai',
    views: '22M'
  },
  {
    id: 'rai_5',
    youtubeId: '9M9Zragxw_A',
    title: 'Abdel Kader (1, 2, 3 Soleils)',
    artist: 'Rachid Taha, Khaled & Faudel',
    album: '1, 2, 3 Soleils',
    thumbnail: 'https://i.ytimg.com/vi/9M9Zragxw_A/hqdefault.jpg',
    durationSeconds: 290,
    durationFormatted: '4:50',
    genre: 'rai',
    views: '95M'
  },

  // --- MOROCCAN & FRENCH RAP ---
  {
    id: 'rap_0',
    youtubeId: 'SCF-3QtpvkU',
    title: '7elmetAdo 2',
    artist: 'ElGrandeToto (Prod. by XCEP)',
    album: 'BNJ City Block',
    thumbnail: 'https://i.ytimg.com/vi/SCF-3QtpvkU/hqdefault.jpg',
    durationSeconds: 237,
    durationFormatted: '3:57',
    genre: 'rap',
    views: '84M'
  },
  {
    id: 'rap_1',
    youtubeId: '-CYvKScPlk0',
    title: 'Silhouette',
    artist: 'ElGrandeToto',
    album: 'Cameleon',
    thumbnail: 'https://i.ytimg.com/vi/-CYvKScPlk0/hqdefault.jpg',
    durationSeconds: 319,
    durationFormatted: '5:19',
    genre: 'rap',
    views: '78M'
  },
  {
    id: 'rap_2',
    youtubeId: 'eBNWq-bYxWg',
    title: 'Mghayer',
    artist: 'ElGrandeToto',
    album: 'Cameleon',
    thumbnail: 'https://i.ytimg.com/vi/eBNWq-bYxWg/hqdefault.jpg',
    durationSeconds: 221,
    durationFormatted: '3:41',
    genre: 'rap',
    views: '110M'
  },
  {
    id: 'rap_3',
    youtubeId: 'YCYj4vbCr40',
    title: 'Cazafonia (Mcha)',
    artist: 'Dizzy Dros',
    album: '3azzy 3ando Stilo',
    thumbnail: 'https://i.ytimg.com/vi/YCYj4vbCr40/hqdefault.jpg',
    durationSeconds: 238,
    durationFormatted: '3:58',
    genre: 'rap',
    views: '65M'
  },
  {
    id: 'rap_4',
    youtubeId: 'pKx9-9pDQDw',
    title: 'Pelele',
    artist: 'Morad',
    album: 'M.D.L.R 2.0',
    thumbnail: 'https://i.ytimg.com/vi/pKx9-9pDQDw/hqdefault.jpg',
    durationSeconds: 229,
    durationFormatted: '3:49',
    genre: 'rap',
    views: '142M'
  },
  {
    id: 'rap_5',
    youtubeId: 'fiys5d-Hfd4',
    title: 'Guérilla',
    artist: 'Soolking',
    album: 'Fruit du démon',
    thumbnail: 'https://i.ytimg.com/vi/fiys5d-Hfd4/hqdefault.jpg',
    durationSeconds: 229,
    durationFormatted: '3:49',
    genre: 'rap',
    views: '350M'
  },

  // --- GLOBAL HITS ---
  {
    id: 'global_1',
    youtubeId: '4NRXx6U8ABQ',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    thumbnail: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg',
    durationSeconds: 263,
    durationFormatted: '4:23',
    genre: 'global',
    views: '800M'
  },
  {
    id: 'global_2',
    youtubeId: 'TUVcZfQe-Kw',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    thumbnail: 'https://i.ytimg.com/vi/TUVcZfQe-Kw/hqdefault.jpg',
    durationSeconds: 231,
    durationFormatted: '3:51',
    genre: 'global',
    views: '920M'
  },
  {
    id: 'global_3',
    youtubeId: 'tvTRZJ-4EyI',
    title: 'HUMBLE.',
    artist: 'Kendrick Lamar',
    album: 'DAMN.',
    thumbnail: 'https://i.ytimg.com/vi/tvTRZJ-4EyI/hqdefault.jpg',
    durationSeconds: 184,
    durationFormatted: '3:04',
    genre: 'global',
    views: '980M'
  },
  {
    id: 'global_4',
    youtubeId: '5NV6Rdv1a3I',
    title: 'Get Lucky',
    artist: 'Daft Punk ft. Pharrell Williams',
    album: 'Random Access Memories',
    thumbnail: 'https://i.ytimg.com/vi/5NV6Rdv1a3I/hqdefault.jpg',
    durationSeconds: 249,
    durationFormatted: '4:09',
    genre: 'global',
    views: '710M'
  }
];

export const PLAYLISTS: Playlist[] = [
  {
    id: 'playlist_chaabi',
    name: 'Moroccan Chaabi Classics',
    description: 'The pulse of Moroccan celebration: Daoudi, Senhaji, Najat Aatabou, Stati & Tahour.',
    coverImage: 'https://i.ytimg.com/vi/5vwSjx-PQFQ/hqdefault.jpg',
    tracks: CURATED_TRACKS.filter(t => t.genre === 'chaabi')
  },
  {
    id: 'playlist_rai',
    name: 'Rai Legends Anthology',
    description: 'Timeless Rai anthems by Cheb Khaled, Cheb Mami, Cheb Hasni and Rachid Taha.',
    coverImage: 'https://i.ytimg.com/vi/tTcnIYYeZI8/hqdefault.jpg',
    tracks: CURATED_TRACKS.filter(t => t.genre === 'rai')
  },
  {
    id: 'playlist_rap',
    name: 'Maghreb Rap & Drill',
    description: 'The heavyweight modern sounds of ElGrandeToto, Dizzy Dros, Morad and Soolking.',
    coverImage: 'https://i.ytimg.com/vi/SCF-3QtpvkU/hqdefault.jpg',
    tracks: CURATED_TRACKS.filter(t => t.genre === 'rap')
  },
  {
    id: 'playlist_global',
    name: 'Today’s Top Hits (Worldwide)',
    description: 'Chart-toppers and global anthems taking over stadiums and airwaves.',
    coverImage: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg',
    tracks: CURATED_TRACKS.filter(t => t.genre === 'global')
  }
];
