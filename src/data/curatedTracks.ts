import { Track, Playlist } from '../types/music';

export const CURATED_TRACKS: Track[] = [
  // --- MOROCCAN CHAABI ---
  {
    id: 'chaabi_1',
    youtubeId: 'KzQz2rC8U2o',
    title: 'Aayta Daoudia',
    artist: 'Abdellah Daoudi',
    album: 'Les Perles du Chaabi',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 310,
    durationFormatted: '5:10',
    genre: 'chaabi',
    views: '8.4M'
  },
  {
    id: 'chaabi_2',
    youtubeId: 'j8e5Fw2Y1aI',
    title: 'Zid Dardeg',
    artist: 'Said Senhaji',
    album: 'Chaabi Marocain 100% Ambiance',
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 265,
    durationFormatted: '4:25',
    genre: 'chaabi',
    views: '12M'
  },
  {
    id: 'chaabi_3',
    youtubeId: 'e-ORhEE9VVg',
    title: 'Hedi Kedba Bayna',
    artist: 'Najat Aatabou',
    album: 'Voix de l Atlas',
    thumbnail: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 278,
    durationFormatted: '4:38',
    genre: 'chaabi',
    views: '15M'
  },
  {
    id: 'chaabi_4',
    youtubeId: 'YQHsXMglC9A',
    title: 'Moulay Abdellah',
    artist: 'Abdelaziz Stati',
    album: 'Kamanja Sahraouia',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 345,
    durationFormatted: '5:45',
    genre: 'chaabi',
    views: '6.1M'
  },
  {
    id: 'chaabi_5',
    youtubeId: '7X_Wj0K36n0',
    title: 'Farha Zina (Tahour Ambiance)',
    artist: 'Tahour',
    album: 'Fetes & Mariages',
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 240,
    durationFormatted: '4:00',
    genre: 'chaabi',
    views: '9.3M'
  },

  // --- RAI LEGENDS ---
  {
    id: 'rai_1',
    youtubeId: 'G14n-w2W7Jg',
    title: 'Didi',
    artist: 'Cheb Khaled',
    album: 'Khaled (1992)',
    thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 200,
    durationFormatted: '3:20',
    genre: 'rai',
    views: '54M'
  },
  {
    id: 'rai_2',
    youtubeId: '0L8U_m-R_w4',
    title: 'Aicha',
    artist: 'Cheb Khaled',
    album: 'Sahra',
    thumbnail: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 258,
    durationFormatted: '4:18',
    genre: 'rai',
    views: '185M'
  },
  {
    id: 'rai_3',
    youtubeId: 'N0Tvy5qg29c',
    title: 'Desert Rose',
    artist: 'Sting ft. Cheb Mami',
    album: 'Brand New Day',
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 285,
    durationFormatted: '4:45',
    genre: 'rai',
    views: '320M'
  },
  {
    id: 'rai_4',
    youtubeId: 'gIskWn8Bf_o',
    title: 'El Visa',
    artist: 'Cheb Hasni',
    album: 'Rai Sentimentale',
    thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 270,
    durationFormatted: '4:30',
    genre: 'rai',
    views: '22M'
  },
  {
    id: 'rai_5',
    youtubeId: 'o6gYV3x-Xqg',
    title: 'Abdel Kader (1, 2, 3 Soleils)',
    artist: 'Rachid Taha, Khaled & Faudel',
    album: '1, 2, 3 Soleils',
    thumbnail: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 312,
    durationFormatted: '5:12',
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
    youtubeId: '3dKlJmFpXhE',
    title: 'Silhouette',
    artist: 'ElGrandeToto',
    album: 'Cameleon',
    thumbnail: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 195,
    durationFormatted: '3:15',
    genre: 'rap',
    views: '78M'
  },
  {
    id: 'rap_2',
    youtubeId: 'P_3Vj26o23U',
    title: 'Mghayer',
    artist: 'ElGrandeToto',
    album: 'Cameleon',
    thumbnail: 'https://images.unsplash.com/photo-1517230878791-4d28214057c2?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 215,
    durationFormatted: '3:35',
    genre: 'rap',
    views: '110M'
  },
  {
    id: 'rap_3',
    youtubeId: 'L-N7K8K_3-w',
    title: 'Cazafonia (Mcha)',
    artist: 'Dizzy Dros',
    album: '3azzy 3ando Stilo',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 228,
    durationFormatted: '3:48',
    genre: 'rap',
    views: '65M'
  },
  {
    id: 'rap_4',
    youtubeId: 'JgZlX_Y7-gE',
    title: 'Pelele',
    artist: 'Morad',
    album: 'M.D.L.R 2.0',
    thumbnail: 'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 168,
    durationFormatted: '2:48',
    genre: 'rap',
    views: '142M'
  },
  {
    id: 'rap_5',
    youtubeId: 'O9YgYh8s4iM',
    title: 'Guérilla',
    artist: 'Soolking',
    album: 'Fruit du démon',
    thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 230,
    durationFormatted: '3:50',
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
    thumbnail: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 200,
    durationFormatted: '3:20',
    genre: 'global',
    views: '800M'
  },
  {
    id: 'global_2',
    youtubeId: 'TUVcZfQe-Kw',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    thumbnail: 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 203,
    durationFormatted: '3:23',
    genre: 'global',
    views: '920M'
  },
  {
    id: 'global_3',
    youtubeId: 'tvTRZJ-4EyI',
    title: 'HUMBLE.',
    artist: 'Kendrick Lamar',
    album: 'DAMN.',
    thumbnail: 'https://images.unsplash.com/photo-1520523839898-50712825e317?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 177,
    durationFormatted: '2:57',
    genre: 'global',
    views: '980M'
  },
  {
    id: 'global_4',
    youtubeId: '5qap5aO4i9A',
    title: 'Get Lucky',
    artist: 'Daft Punk ft. Pharrell Williams',
    album: 'Random Access Memories',
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    durationSeconds: 248,
    durationFormatted: '4:08',
    genre: 'global',
    views: '710M'
  }
];

export const PLAYLISTS: Playlist[] = [
  {
    id: 'playlist_chaabi',
    name: 'Moroccan Chaabi Classics',
    description: 'The pulse of Moroccan celebration: Daoudi, Senhaji, Najat Aatabou, Stati & Tahour.',
    coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    tracks: CURATED_TRACKS.filter(t => t.genre === 'chaabi')
  },
  {
    id: 'playlist_rai',
    name: 'Rai Legends Anthology',
    description: 'Timeless Rai anthems by Cheb Khaled, Cheb Mami, Cheb Hasni and Rachid Taha.',
    coverImage: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80',
    tracks: CURATED_TRACKS.filter(t => t.genre === 'rai')
  },
  {
    id: 'playlist_rap',
    name: 'Maghreb Rap & Drill',
    description: 'The heavyweight modern sounds of ElGrandeToto, Dizzy Dros, Morad and Soolking.',
    coverImage: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80',
    tracks: CURATED_TRACKS.filter(t => t.genre === 'rap')
  },
  {
    id: 'playlist_global',
    name: 'Today’s Top Hits (Worldwide)',
    description: 'Chart-toppers and global anthems taking over stadiums and airwaves.',
    coverImage: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=500&auto=format&fit=crop&q=80',
    tracks: CURATED_TRACKS.filter(t => t.genre === 'global')
  }
];
