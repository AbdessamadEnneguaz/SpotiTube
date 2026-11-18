import { Track } from '../types/music';

export interface ArtistProfile {
  name: string;
  origin: string;
  activeYears: string;
  roles: string[];
  genres: string[];
  bio: string;
  craftSummary: string;
  notableWorks: string[];
  label: string;
  isLiveFetched?: boolean;
}

const CURATED_ARTIST_PROFILES: Record<string, ArtistProfile> = {
  'the weeknd': {
    name: 'The Weeknd',
    origin: 'Toronto, Canada',
    activeYears: '2009–present',
    roles: ['Singer', 'Songwriter', 'Record Producer'],
    genres: ['Synth-Pop', 'Alternative R&B', 'New Wave'],
    bio: 'Abel Tesfaye, known professionally as The Weeknd, reshaped contemporary pop and R&B by blending nocturnal 1980s synthesizer textures with cinematic falsetto storytelling.',
    craftSummary: 'Writes, composes, and executive-produces concept-driven albums built around analog synth basslines, dark atmospheric hooks, and stadium-scale visual eras.',
    notableWorks: ['After Hours (2020)', 'Dawn FM (2022)', 'Starboy (2016)', 'House of Balloons (2011)'],
    label: 'XO / Republic Records'
  },
  'kendrick lamar': {
    name: 'Kendrick Lamar',
    origin: 'Compton, United States',
    activeYears: '2004–present',
    roles: ['Rapper', 'Songwriter', 'Creative Director'],
    genres: ['West Coast Hip-Hop', 'Conscious Rap', 'Jazz Rap'],
    bio: 'Pulitzer Prize-winning lyricist and songwriter celebrated for intricate storytelling, shifting vocal cadences, and landmark concept records rooted in West Coast hip-hop and jazz.',
    craftSummary: 'Crafts layered narrative albums combining live jazz instrumentation, sharp social commentary, and multi-character vocal performances.',
    notableWorks: ['DAMN. (2017)', 'To Pimp a Butterfly (2015)', 'good kid, m.A.A.d city (2012)', 'GNX (2024)'],
    label: 'pgLang / Interscope'
  },
  'drake': {
    name: 'Drake',
    origin: 'Toronto, Canada',
    activeYears: '2006–present',
    roles: ['Rapper', 'Singer', 'Executive Producer'],
    genres: ['Hip-Hop', 'Melodic Rap', 'Contemporary R&B'],
    bio: 'Toronto recording artist who bridged melodic R&B singing and confessional hip-hop verses, influencing modern global streaming soundscapes.',
    craftSummary: 'Combines introspective hooks, sparse nocturnal 40-style percussion, and cross-continental collaborations spanning UK grime, dancehall, and Afrobeats.',
    notableWorks: ['Take Care (2011)', 'Nothing Was the Same (2013)', 'Scorpion (2018)', 'Her Loss (2022)'],
    label: 'OVO Sound / Republic'
  },
  'bad bunny': {
    name: 'Bad Bunny',
    origin: 'Vega Baja, Puerto Rico',
    activeYears: '2016–present',
    roles: ['Singer', 'Rapper', 'Songwriter'],
    genres: ['Reggaeton', 'Latin Trap', 'Urbano'],
    bio: 'Puerto Rican vocalist who elevated Spanish-language urbano, reggaeton, and Latin trap to global headlining stages while championing Caribbean rhythm traditions.',
    craftSummary: 'Blends deep-voiced dembow flows with salsa brass, merengue grooves, indie guitars, and genre-fluid production rooted in Puerto Rican street culture.',
    notableWorks: ['Un Verano Sin Ti (2022)', 'YHLQMDLG (2020)', 'Nadie Sabe Lo Que Va a Pasar Mañana (2023)'],
    label: 'Rimas Entertainment'
  },
  'shakira': {
    name: 'Shakira',
    origin: 'Barranquilla, Colombia',
    activeYears: '1990–present',
    roles: ['Singer', 'Songwriter', 'Multi-Instrumentalist', 'Producer'],
    genres: ['Latin Pop', 'Pop Rock', 'Electropop'],
    bio: 'Colombian singer-songwriter and producer recognized globally for merging Andean folk, Middle Eastern percussion, Latin pop, and rock guitars with distinctive vibrato.',
    craftSummary: 'Co-writes and produces bilingual pop anthems weaving acoustic folk instrumentation, dance choreography, and high-energy synth-pop sessions.',
    notableWorks: ['Laundry Service (2001)', 'Fijación Oral, Vol. 1 (2005)', 'Las Mujeres Ya No Lloran (2024)'],
    label: 'Sony Music Latin'
  },
  'bizarrap': {
    name: 'Bizarrap',
    origin: 'Ramos Mejía, Argentina',
    activeYears: '2017–present',
    roles: ['Record Producer', 'DJ', 'Sound Designer'],
    genres: ['Electronic', 'Latin Trap', 'EDM'],
    bio: 'Argentine producer famous for his home-studio Music Sessions series pairing minimalist synth drops and hard-hitting bass with major Latin and global vocalists.',
    craftSummary: 'Produces bespoke instrumental sessions from custom synth arpeggios, trap 808s, and festival-ready electronic drops tailored to each guest vocalist.',
    notableWorks: ['BZRP Music Sessions #53', 'BZRP Music Sessions #52', 'BZRP Music Sessions #55'],
    label: 'Dale Play Records'
  },
  'anitta': {
    name: 'Anitta',
    origin: 'Rio de Janeiro, Brazil',
    activeYears: '2010–present',
    roles: ['Singer', 'Songwriter', 'Dancer'],
    genres: ['Funk Carioca', 'Latin Pop', 'Reggaeton'],
    bio: 'Brazilian pop star who brought Rio de Janeiro baile funk rhythms onto international charts in Portuguese, Spanish, and English.',
    craftSummary: 'Fuses Brazilian funk tamborzão beats with reggaeton percussion and sleek multilingual pop choreography.',
    notableWorks: ['Versions of Me (2022)', 'Kisses (2019)', 'Funk Generation (2024)'],
    label: 'Floresta / Republic Records'
  },
  'dua lipa': {
    name: 'Dua Lipa',
    origin: 'London, United Kingdom',
    activeYears: '2014–present',
    roles: ['Singer', 'Songwriter'],
    genres: ['Disco-Pop', 'Dance-Pop', 'Synth-Pop'],
    bio: 'British-Albanian pop vocalist acclaimed for revivalist disco basslines, crisp contralto vocals, and tightly structured dancefloor songwriting.',
    craftSummary: 'Crafts bass-driven nu-disco and modern dance-pop hooks alongside live horn sections, funky guitar riffs, and analog percussion.',
    notableWorks: ['Future Nostalgia (2020)', 'Radical Optimism (2024)', 'Dua Lipa (2017)'],
    label: 'Warner Records'
  },
  'adele': {
    name: 'Adele',
    origin: 'London, United Kingdom',
    activeYears: '2006–present',
    roles: ['Singer', 'Songwriter'],
    genres: ['Soul', 'Pop Ballad', 'Blue-Eyed Soul'],
    bio: 'London-born vocalist celebrated for powerhouse soul ballads, classical piano arrangements, and autobiographical songwriting across landmark numbered albums.',
    craftSummary: 'Writes and records intimate piano-and-orchestra soul songs built around resonant acoustic dynamics and classic vocal phrasing.',
    notableWorks: ['21 (2011)', '25 (2015)', '30 (2021)'],
    label: 'Melted Stone / Columbia'
  },
  'coldplay': {
    name: 'Coldplay',
    origin: 'London, United Kingdom',
    activeYears: '1997–present',
    roles: ['Alternative Rock Band', 'Songwriters', 'Live Performers'],
    genres: ['Alternative Rock', 'Pop Rock', 'Arena Pop'],
    bio: 'British band formed in London known for anthemic piano melodies, chiming electric guitars, and large-scale conceptual stadium productions.',
    craftSummary: 'Composes uplifting orchestral rock and melodic synth-pop arrangements designed for communal sing-alongs and rich harmonic textures.',
    notableWorks: ['Viva la Vida or Death and All His Friends (2008)', 'A Rush of Blood to the Head (2002)', 'Parachutes (2000)'],
    label: 'Parlophone / Atlantic'
  },
  'daft punk': {
    name: 'Daft Punk',
    origin: 'Paris, France',
    activeYears: '1993–2021',
    roles: ['Electronic Duo', 'Producers', 'Composers'],
    genres: ['French House', 'Electronic', 'Disco-Funk'],
    bio: 'Pioneering Parisian electronic duo Thomas Bangalter and Guy-Manuel de Homem-Christo, renowned for vocoder hooks, French touch house grooves, and live studio musicianship.',
    craftSummary: 'Blends analog drum machines and talkbox synths with live disco rhythm sections, Nile Rodgers funk guitars, and analog tape mastering.',
    notableWorks: ['Random Access Memories (2013)', 'Discovery (2001)', 'Homework (1997)'],
    label: 'Daft Life / Columbia'
  },
  'stromae': {
    name: 'Stromae',
    origin: 'Brussels, Belgium',
    activeYears: '2000–present',
    roles: ['Singer', 'Songwriter', 'Electronic Producer'],
    genres: ['French Pop', 'Electro-House', 'Chanson'],
    bio: 'Belgian artist Paul Van Haver known for pairing poignant French-language social lyrics with infectious Eurodance synth lines and rhythmic chanson delivery.',
    craftSummary: 'Writes, produces, and visually directs theatrical electronic pop songs contrasting upbeat house beats with candid human stories.',
    notableWorks: ['Racine carrée (2013)', 'Cheese (2010)', 'Multitude (2022)'],
    label: 'Mosaert / Universal'
  },
  'rosalia': {
    name: 'ROSALÍA',
    origin: 'Barcelona, Spain',
    activeYears: '2013–present',
    roles: ['Singer', 'Songwriter', 'Producer'],
    genres: ['Flamenco Pop', 'Latin Urban', 'Avant-Pop'],
    bio: 'Catalan vocalist and classically trained flamenco musician famous for reimagining traditional Spanish palmas and vocal melisma with experimental electronic production.',
    craftSummary: 'Produces genre-bending compositions combining flamenco guitar, mambo horns, dembow drums, and layered vocal harmonies.',
    notableWorks: ['MOTOMAMI (2022)', 'El Mal Querer (2018)', 'Los Ángeles (2017)'],
    label: 'Columbia Records'
  },
  'burna boy': {
    name: 'Burna Boy',
    origin: 'Port Harcourt, Nigeria',
    activeYears: '2010–present',
    roles: ['Singer', 'Songwriter', 'Performer'],
    genres: ['Afro-Fusion', 'Afrobeats', 'Dancehall'],
    bio: 'Grammy-winning Nigerian artist Damini Ogulu who popularized Afro-fusion globally by uniting West African percussion, highlife horns, R&B, and Jamaican dancehall.',
    craftSummary: 'Delivers gravelly baritone melodies over polyrhythmic Afrobeats drums, soulful samples, and live horn arrangements.',
    notableWorks: ['Love, Damini (2022)', 'African Giant (2019)', 'Twice as Tall (2020)'],
    label: 'Spaceship / Atlantic'
  },
  'rema': {
    name: 'Rema',
    origin: 'Benin City, Nigeria',
    activeYears: '2019–present',
    roles: ['Singer', 'Songwriter', 'Rapper'],
    genres: ['Afrobeats', 'Afrorave', 'Afro-Pop'],
    bio: 'Nigerian singer Divine Ikubor whose signature "Afrorave" style merges Afrobeats bounce with Indian-inspired melodies, trap textures, and hypnotic vocal runs.',
    craftSummary: 'Creates cross-cultural Afrobeats hits mixing mellow plucked guitars, log-drum grooves, and infectious falsetto choruses.',
    notableWorks: ['Rave & Roses (2022)', 'HEIS (2024)'],
    label: 'Mavin Records / Jonzing World'
  },
  'tyla': {
    name: 'Tyla',
    origin: 'Johannesburg, South Africa',
    activeYears: '2019–present',
    roles: ['Singer', 'Songwriter', 'Dancer'],
    genres: ['Amapiano', 'Popiano', 'R&B'],
    bio: 'South African Grammy winner who introduced Johannesburg Amapiano log drums to mainstream global pop through breezy R&B vocal harmonies.',
    craftSummary: 'Combines South African Amapiano percussion and deep basslines with silky R&B pop melodies ("Popiano").',
    notableWorks: ['Tyla (2024)', 'Water (2023)'],
    label: 'Fax / Epic Records'
  },
  'sting': {
    name: 'Sting',
    origin: 'Wallsend, United Kingdom',
    activeYears: '1971–present',
    roles: ['Singer', 'Bassist', 'Songwriter'],
    genres: ['Pop Rock', 'World Fusion', 'Jazz Rock'],
    bio: 'British musician and former Police frontman known for literary songwriting, fretless bass grooves, and cross-cultural collaborations including North African Raï.',
    craftSummary: 'Arranges sophisticated pop and world-fusion tracks blending acoustic guitars, jazz harmonies, and international guest vocalists.',
    notableWorks: ['Brand New Day (1999)', 'Ten Summoner\'s Tales (1993)', 'Synchronicity (1983)'],
    label: 'A&M / Interscope'
  },
  'bts': {
    name: 'BTS',
    origin: 'Seoul, South Korea',
    activeYears: '2013–present',
    roles: ['7-Member Vocal & Rap Group', 'Songwriters', 'Performers'],
    genres: ['K-Pop', 'Disco-Pop', 'Hip-Hop'],
    bio: 'Seven-member South Korean group combining synchronized stage choreography, self-penned lyrics, and stadium-scale pop, hip-hop, and disco productions.',
    craftSummary: 'Blends tight multi-part vocal harmonies and rap verses across nu-disco, pop, and hip-hop concept eras.',
    notableWorks: ['BE (2020)', 'Map of the Soul: 7 (2020)', 'Love Yourself: Tear (2018)'],
    label: 'BIGHIT MUSIC'
  },
  'blackpink': {
    name: 'BLACKPINK',
    origin: 'Seoul, South Korea',
    activeYears: '2016–present',
    roles: ['4-Member Vocal & Rap Group', 'Performers'],
    genres: ['K-Pop', 'Hip-Hop', 'Electronic Pop'],
    bio: 'Global South Korean quartet recognized for high-impact hip-hop beats, traditional Korean instruments blended into trap drops, and festival headlining shows.',
    craftSummary: 'Fuses crisp rap verses, soaring pre-choruses, and hard-hitting electronic drops anchored by signature brass and traditional string accents.',
    notableWorks: ['BORN PINK (2022)', 'THE ALBUM (2020)', 'SQUARE UP (2018)'],
    label: 'YG Entertainment'
  },
  'peggy gou': {
    name: 'Peggy Gou',
    origin: 'Incheon, South Korea / Berlin',
    activeYears: '2014–present',
    roles: ['DJ', 'Electronic Producer', 'Singer'],
    genres: ['House', 'Balearic House', 'Electronic'],
    bio: 'South Korean DJ and producer based in Berlin whose warm 1990s-inspired house pianos and bilingual vocal hooks bridged underground club culture and global charts.',
    craftSummary: 'Produces analog-warm house tracks built on nostalgic Euro-house synths, crisp 909 hi-hats, and hypnotic vocal melodies.',
    notableWorks: ['I Hear You (2024)', '(It Goes Like) Nanana (2023)', 'Moment EP (2019)'],
    label: 'XL Recordings / Gudu'
  },
  'yoasobi': {
    name: 'YOASOBI',
    origin: 'Tokyo, Japan',
    activeYears: '2019–present',
    roles: ['Music Duo (Ayase & Ikura)', 'Producer & Vocalist'],
    genres: ['J-Pop', 'Electro-Pop', 'Anime Pop'],
    bio: 'Tokyo duo made of producer Ayase and vocalist Ikura who turn short novels and original stories into fast-paced, piano-laced electronic J-Pop hits.',
    craftSummary: 'Crafts rapid-fire melodic J-Pop driven by shimmering synthesizers, intricate key changes, and clear narrative vocal delivery.',
    notableWorks: ['THE BOOK (2021)', 'THE BOOK 3 (2023)', 'Idol (2023)'],
    label: 'Sony Music Japan'
  },
  'arijit singh': {
    name: 'Arijit Singh',
    origin: 'Jiaganj, India',
    activeYears: '2007–present',
    roles: ['Playback Singer', 'Composer', 'Music Producer'],
    genres: ['Indian Pop', 'Bollywood', 'Acoustic Soul'],
    bio: 'Renowned Indian vocalist celebrated across South Asia and worldwide for expressive romantic ballads, classical Hindustani phrasing, and contemporary cinema soundtracks.',
    craftSummary: 'Brings Hindustani classical nuance and emotive acoustic phrasing to orchestral Bollywood scores and intimate indie arrangements.',
    notableWorks: ['Kesariya (2022)', 'Tum Hi Ho (2013)', 'Channa Mereya (2016)'],
    label: 'T-Series / Sony Music India'
  }
};

function normalizeArtistKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function extractPrimaryArtistName(rawArtist: string): string {
  const cleaned = (rawArtist || 'Global Artist').trim();
  if (!cleaned) return 'Global Artist';
  const split = cleaned.split(/\s+(?:ft\.|feat\.|featuring|x|with)\s+|\s*[,&]\s+/i);
  return (split[0] || cleaned).trim();
}

export function getCuratedArtistProfile(artistName: string): ArtistProfile | null {
  const primary = extractPrimaryArtistName(artistName);
  const key = normalizeArtistKey(primary);
  if (CURATED_ARTIST_PROFILES[key]) {
    return CURATED_ARTIST_PROFILES[key];
  }
  const fullKey = normalizeArtistKey(artistName);
  if (CURATED_ARTIST_PROFILES[fullKey]) {
    return CURATED_ARTIST_PROFILES[fullKey];
  }
  return null;
}

const GENRE_DISPLAY_MAP: Record<string, { label: string; craft: string }> = {
  pop: {
    label: 'Contemporary Pop',
    craft: 'Writes hook-driven melodic arrangements built around crisp vocal production and modern rhythm sections.'
  },
  hiphop: {
    label: 'Hip-Hop & Rap',
    craft: 'Creates rhythmic vocal flows paired with heavy low-end drums, sampled textures, and narrative lyricism.'
  },
  afrobeats: {
    label: 'Afrobeats & Amapiano',
    craft: 'Blends West and South African polyrhythmic percussion, melodic guitar riffs, and soulful global grooves.'
  },
  latin: {
    label: 'Latin & Urbano',
    craft: 'Fuses dembow and Caribbean rhythmic patterns with modern electronic basslines and bilingual vocal hooks.'
  },
  electronic: {
    label: 'Electronic & Dance',
    craft: 'Designs synthesizer textures, drum-machine grooves, and club-ready harmonic builds for live and studio sets.'
  },
  kpop: {
    label: 'K-Pop & Asian Pop',
    craft: 'Combines high-precision vocal production, multi-section arrangements, and visual choreography.'
  },
  global: {
    label: 'World Soundstage',
    craft: 'Unites regional acoustic instrumentation with contemporary studio production for international audiences.'
  }
};

export function sanitizeWikiSummary(rawText: string, maxLen = 420): string {
  const cleaned = (rawText || '')
    .replace(/[\u0000-\u001F\u007F<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  if (cleaned.length <= maxLen) return cleaned;
  const sliced = cleaned.slice(0, maxLen);
  const lastPeriod = sliced.lastIndexOf('.');
  if (lastPeriod > 120) {
    return sliced.slice(0, lastPeriod + 1);
  }
  return `${sliced.trim()}...`;
}

export function buildArtistProfile(
  track: Track,
  wikiOverride?: { extract?: string; description?: string } | null
): ArtistProfile {
  const curated = getCuratedArtistProfile(track.artist);
  if (curated) {
    return curated;
  }

  const primaryName = extractPrimaryArtistName(track.artist);
  const genreInfo = GENRE_DISPLAY_MAP[track.genre] || GENRE_DISPLAY_MAP.global;
  const safeExtract = wikiOverride?.extract ? sanitizeWikiSummary(wikiOverride.extract) : '';
  const safeDesc = wikiOverride?.description ? sanitizeWikiSummary(wikiOverride.description, 120) : '';

  return {
    name: primaryName,
    origin: track.country || 'International Scene',
    activeYears: 'Active Recording Artist',
    roles: safeDesc ? [safeDesc] : ['Recording Artist', 'Performer'],
    genres: [genreInfo.label],
    bio:
      safeExtract ||
      `${primaryName} is an international recording artist featured on "${track.title}". Explore their catalog and related global releases below.`,
    craftSummary: genreInfo.craft,
    notableWorks: [
      track.album && track.album !== 'Studio Single' ? track.album : track.title
    ],
    label: track.album && track.album !== 'Studio Single' ? track.album : 'Independent / Global Release',
    isLiveFetched: Boolean(safeExtract)
  };
}

export function findRelatedTracks(track: Track, catalog: Track[], limit = 4): Track[] {
  const primary = normalizeArtistKey(extractPrimaryArtistName(track.artist));
  const sameArtist = catalog.filter(
    (item) =>
      item.youtubeId !== track.youtubeId &&
      normalizeArtistKey(item.artist).includes(primary)
  );
  const sameRegionOrGenre = catalog.filter(
    (item) =>
      item.youtubeId !== track.youtubeId &&
      !sameArtist.some((a) => a.youtubeId === item.youtubeId) &&
      ((track.region && item.region === track.region) || item.genre === track.genre)
  );

  return [...sameArtist, ...sameRegionOrGenre].slice(0, limit);
}
