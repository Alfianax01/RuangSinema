
// ⚡ In-Memory High-Speed Cache (5 Minutes TTL) for 0ms Instant Navigation
const apiResponseCache = new Map<string, { data: any; time: number }>();
const CACHE_LIFETIME = 5 * 60 * 1000;

async function cachedFetchJson(endpointUrl: string): Promise<any> {
  const now = Date.now();
  if (apiResponseCache.has(endpointUrl)) {
    const entry = apiResponseCache.get(endpointUrl)!;
    if (now - entry.time < CACHE_LIFETIME) {
      return entry.data;
    }
  }

  try {
    const res = await fetch(endpointUrl);
    if (res.ok) {
      const data = await res.json();
      apiResponseCache.set(endpointUrl, { data, time: now });
      return data;
    }
  } catch (e) {}

  return null;
}


import type { Movie, MovieDetails, StreamSource, GenreItem, EpisodeItem, SeasonItem, ActorProfile } from '../types';

const TMDB_API_KEY = '4e44d9029b1270a757cddc766a1bcb63';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_W500 = 'https://image.tmdb.org/t/p/w500';
const TMDB_IMG_ORIGINAL = 'https://image.tmdb.org/t/p/w1280';

const IDLIX_SLUG_MAP: Record<string, string> = {
  'dune-part-two-2024': '693134',
  'oppenheimer-2023': '872585',
  'interstellar-2014': '157336',
  'the-batman-2022': '414906',
  'deadpool-and-wolverine-2024': '533535',
  'once-we-were-us-2024': '1264805',
  'once-we-were-us': '1264805',
  'us-and-them': '508747',
  'how-to-make-millions-before-grandma-dies-2024': '1226578',
  'exhuma-2024': '1017400',
  'ikiru-1952': '3782',
  'seven-samurai-1954': '346',
  'shogun-2024': '126308',
  'agak-laen-2024': '1214314',
  'pengabdi-setan-2-2022': '784860',
  'the-godfather-1972': '238',
  'pulp-fiction-1994': '680',
  'parasite-2019': '496243',
  'spirited-away-2001': '129',
  'civil-war-2024': '929590',
  'challengers-2024': '937287',
  'furiosa-2024': '786892',
};

const GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10759: 'Action & Adventure',
  10765: 'Sci-Fi & Fantasy',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

const GENRE_TO_ID: Record<string, number> = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  drama: 18,
  fantasy: 14,
  horror: 27,
  mystery: 9648,
  romance: 10749,
  'sci-fi': 878,
  scifi: 878,
  thriller: 53,
  war: 10752,
};

// Strict filter against any NSFW / Hentai / Adult 18+ content (Overflow, Ecchi, Doujin, etc.)
const NSFW_BLACKLIST = [
  'overflow', 'kaifuku', 'redo of healer', 'yosuga no sora', 'boku no pico', 'ishuzoku',
  'kiss x sis', 'highschool dxd', 'shinmai maou', 'valkyrie drive', 'seikon no qwaser',
  'peter grill', 'shoujo ramune', 'euphoria', 'bible black', 'night shift nurses',
  'mankitsu happening', 'otome dori', 'resort boin', 'inyouchuu', 'rance', 'kuroinu',
  'drop out', 'futanari', 'netorare', 'ntr', 'ero', 'erotic', 'hentai', 'ecchi',
  'uncensored', 'adult', 'r18', '18+', 'sensual', 'lust', 'nudity', 'nsfw', 'boin',
  'chikan', 'taimanin', 'kyonyuu', 'chichi', 'oppai', 'onani', 'pantsu', 'ero-anime'
];

function isSafeContent(item: any): boolean {
  if (item.adult) return false;
  const text = ((item.title || '') + ' ' + (item.name || '') + ' ' + (item.original_title || '') + ' ' + (item.original_name || '') + ' ' + (item.overview || '') + ' ' + (item.description || '')).toLowerCase();
  for (const word of NSFW_BLACKLIST) {
    if (text.includes(word)) return false;
  }
  return true;
}

export function normalizeId(id: string): { cleanId: string; isTv: boolean } {
  let isTv = id.startsWith('tv-') || id.includes('tv');
  let clean = id.replace(/^tv-|^movie-|^tmdb-tv-|^tmdb-/, '');

  if (IDLIX_SLUG_MAP[id]) {
    clean = IDLIX_SLUG_MAP[id];
    if (id.includes('shogun') || id.includes('series')) isTv = true;
  }
  
  return { cleanId: clean, isTv };
}

function mapToMovieDetails(item: any, isTv = false): MovieDetails {
  const isSeries = isTv || item.media_type === 'tv' || Boolean(item.first_air_date) || Boolean(item.number_of_seasons);
  const title = item.title || item.name || item.original_title || item.original_name || 'Movie';
  
  const poster = item.poster_path 
    ? `${TMDB_IMG_W500}${item.poster_path}`
    : item.img || item.poster || (item.backdrop_path ? `${TMDB_IMG_W500}${item.backdrop_path}` : `https://placehold.co/500x750/181818/E50914?text=${encodeURIComponent(title.substring(0, 24))}`);
    
  const backdrop = item.backdrop_path 
    ? `${TMDB_IMG_ORIGINAL}${item.backdrop_path}`
    : poster;

  const rawDate = item.release_date || item.first_air_date || item.date || '2024';
  const releaseYearNum = parseInt(rawDate.split('-')[0] || '2024') || 2024;
  const isComingSoon = Boolean(
    releaseYearNum > 2024 || 
    item.status === 'Post Production' || 
    item.status === 'In Production' || 
    item.status === 'Planned' ||
    (new Date(rawDate).getTime() > Date.now())
  );
  const imdbId = item.external_ids?.imdb_id || item.imdb_id || undefined;
  const year = rawDate.split('-')[0] || rawDate.match(/\b(19\d\d|20\d\d)\b/)?.[0] || '2024';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : (item.rating || '8.2');

  const genres: string[] = Array.isArray(item.genres)
    ? item.genres.map((g: any) => typeof g === 'string' ? g : g.name)
    : Array.isArray(item.tag)
    ? item.tag
    : Array.isArray(item.genre_ids)
    ? item.genre_ids.map((id: number) => GENRE_MAP[id] || 'Film').filter(Boolean)
    : ['Cinema'];

  const durationMin = item.runtime || (item.episode_run_time && item.episode_run_time[0]) || 45;
  const hours = Math.floor(durationMin / 60);
  const mins = durationMin % 60;
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  let directors: string[] = ['Director'];
  let casts: string[] = [];
  let castMembers: any[] = [];
  let trailerKey = '';

  if (item.credits) {
    if (Array.isArray(item.credits.crew)) {
      const dir = item.credits.crew.find((c: any) => c.job === 'Director' || c.job === 'Executive Producer');
      if (dir) directors = [dir.name];
    }
    if (Array.isArray(item.credits.cast)) {
      casts = item.credits.cast.slice(0, 16).map((c: any) => c.name);
      castMembers = item.credits.cast.slice(0, 16).map((c: any) => ({
        id: c.id,
        name: c.name,
        character: c.character || 'Pemeran',
        avatarUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : undefined
      }));
    }
  }

  if (item.videos && Array.isArray(item.videos.results)) {
    const tr = item.videos.results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
    if (tr) trailerKey = tr.key;
  }

  let seasons: SeasonItem[] = [];
  if (Array.isArray(item.seasons)) {
    seasons = item.seasons
      .filter((s: any) => s.season_number > 0)
      .map((s: any) => ({
        id: s.id,
        seasonNumber: s.season_number,
        name: s.name || `Season ${s.season_number}`,
        episodeCount: s.episode_count || 10,
        overview: s.overview,
        posterPath: s.poster_path ? `${TMDB_IMG_W500}${s.poster_path}` : poster,
      }));
  }

  const rawId = String(item.id || item.slug || 'movie');
  const formattedId = isSeries ? (rawId.startsWith('tv-') ? rawId : `tv-${rawId}`) : (rawId.startsWith('movie-') ? rawId : `movie-${rawId}`);

  return {
    _id: formattedId,
    title,
    type: isSeries ? 'series' : 'movie',
    posterImg: poster,
    backdropImg: backdrop,
    rating,
    year,
    ageRating: item.adult ? '18+' : 'PG-13',
    duration: isSeries ? `${item.number_of_seasons || seasons.length || 1} Season • ${durationStr}/eps` : durationStr,
    quality: item.quality || 'HD',
    qualityResolution: '4K ULTRA HD',
    releaseDate: rawDate,
    genres: genres.length > 0 ? genres : [isSeries ? 'Series' : 'Action'],
    synopsis: item.overview || item.description || 'Sinopsis lengkap dengan subtitle Indonesia.',
    trailerUrl: trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : `https://www.youtube.com/watch?v=search_${encodeURIComponent(title)}`,
    directors: directors.length > 0 ? directors : ['Director'],
    countries: item.production_countries ? item.production_countries.map((c: any) => c.name) : (item.country ? [item.country] : ['International']),
    casts: casts.length > 0 ? casts : ['Cast'],
    castMembers: castMembers.length > 0 ? castMembers : undefined,
    seasons: seasons.length > 0 ? seasons : (isSeries ? [{ seasonNumber: 1, name: 'Season 1', episodeCount: 12, posterPath: poster }] : undefined),
    totalEpisodes: item.number_of_episodes,
    imdbId: imdbId,
    releaseStatus: item.status || (isComingSoon ? 'Coming Soon' : 'Released'),
    isComingSoon: isComingSoon,
  };
}

export async function fetchPopularMovies(page = 1): Promise<Movie[]> {
  try {
    const data = await cachedFetchJson(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${page}&include_adult=false`);
    if (data) {
      if (Array.isArray(data.results)) {
        return data.results.filter(isSafeContent).map((m: any) => mapToMovieDetails(m, false));
      }
    }
  } catch (e) {}
  return [];
}

export async function fetchPopularSeries(page = 1): Promise<Movie[]> {
  try {
    const data = await cachedFetchJson(`${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&page=${page}&include_adult=false`);
    if (data) {
      if (Array.isArray(data.results)) {
        return data.results.filter(isSafeContent).map((t: any) => mapToMovieDetails(t, true));
      }
    }
  } catch (e) {}
  return [];
}

// 🇰🇷 DRAKOR MASTER ENGINE (TWINKLING WATERMELON + 300+ ICONIC K-DRAMAS)
export const DRAKOR_HEROKU_API_URL = 'https://drakor-api.herokuapp.com/api';

// Priority Top-Tier Masterpiece Korean Dramas
const PRIORITY_KDRAMA_IDS = [
  212204, // Twinkling Watermelon (반짝이는 워터멜론)
  209867, // Queen of Tears (눈물의 여왕)
  226411, // Lovely Runner (선재 업고 튀어)
  225660, // Marry My Husband (내 남편과 결혼해줘)
  217032, // Death's Game (이재, 곧 죽습니다)
  294095, // A Bona Fide Killer / A Shop for Killers
  93405,  // Squid Game (오징어 게임)
  136283, // Moving (무빙)
  98992,  // Hospital Playlist (슬기로운 의사생활)
  94796,  // Crash Landing on You (사랑의 불시착)
  67915,  // Goblin / Guardian: The Lonely and Great God (도깨비)
  65249,  // Descendants of the Sun (태양의 후예)
  117376, // Vincenzo (빈센조)
  96162,  // Itaewon Class (이태원 클라쓰)
  154825, // Business Proposal (사내맞선)
  213026, // King the Land (킹더랜드)
  90447,  // Hotel Del Luna (호텔 델루나)
  135157, // Alchemy of Souls (환혼)
  197067, // Extraordinary Attorney Woo (이상한 변호사 우영우)
  153496, // Twenty-Five Twenty-One (스물다섯 스물하나)
  136262, // Our Beloved Summer (그 해 우리는)
  68349,  // Weightlifting Fairy Kim Bok-joo (역도요정 김복주)
  69629,  // Strong Girl Bong-soon (힘쎈여자 도봉순)
  79240,  // What's Wrong with Secretary Kim (김비서가 왜 그럴까)
  127532, // Hometown Cha-Cha-Cha (갯마을 차차차)
  64254,  // Reply 1988 (응답하라 1988)
  210073, // Weak Hero Class 1 (약한영웅 Class 1)
  224607, // My Demon (마이 데몬)
  218230, // Doctor Slump (닥터슬럼프)
  224884, // Welcome to Samdal-ri (웰컴투 삼달리)
  242876, // Pyramid Game (피라미드 게임)
  208249, // A Killer Paradox (살인자ㅇ난감)
  240361, // Love Next Door (엄마친구아들)
  248567, // No Gain No Love (손해 보기 싫어서)
  242101, // The Judge from Hell (지옥에서 온 판사)
  202250, // Gyeongseong Creature (경성크리처)
  96580,  // Sweet Home (스위트홈)
  137437, // The Glory (더 글로리)
  99966,  // All of Us Are Dead (지금 우리 학교는)
  70593,  // Kingdom (킹덤)
  120998, // Taxi Driver (모범택시)
  105248, // Flower of Evil (악의 꽃)
  65942,  // Signal (시그널)
  67204,  // W: Two Worlds (W)
  66433,  // Moon Lovers: Scarlet Heart Ryeo (달의 연인 - 보보경심 려)
  113988, // Mr. Queen (철인왕후)
  213713, // Bloodhounds (사냥개들)
  128095, // D.P.
  202958, // Celebrity (셀러브리티)
  135010, // Happiness (해피니스)
];

export async function fetchFromDrakorHerokuApi(endpoint = 'recent'): Promise<Movie[]> {
  try {
    const url = `${DRAKOR_HEROKU_API_URL}/${endpoint}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.data || data?.results || []);
      if (Array.isArray(list) && list.length > 0) {
        return list.map((item: any, idx: number) => ({
          _id: `drakor-${item.endpoint || item.slug || item.id || idx}`,
          title: item.title || item.judul || 'Drama Korea',
          type: 'series' as const,
          posterImg: item.poster || item.thumbnail || item.image || 'https://image.tmdb.org/t/p/w500/bwTzW1wTgUxUOQruhT8DvinUYgR.jpg',
          backdropImg: item.poster || item.thumbnail || 'https://image.tmdb.org/t/p/original/efaMS00Fevc3fw2dbeP7rh22O6D.jpg',
          rating: String(item.rating || item.score || '8.8'),
          year: item.year || item.tahun || '2023',
          ageRating: '13+',
          duration: item.episodes ? `${item.episodes} Episode` : '16 Episode',
          quality: 'HD',
          qualityResolution: '1080p FULL HD',
          releaseDate: item.release || '2023',
          genres: ['Drakor', 'Drama Korea', 'Sub Indo', ...(Array.isArray(item.genres) ? item.genres : [])],
          synopsis: item.synopsis || item.sinopsis || 'Nonton drama Korea subtitle Indonesia terlengkap.',
          trailerUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(item.title || 'Drakor')}+trailer`,
          directors: ['Korean Director'],
          countries: ['South Korea'],
          casts: Array.isArray(item.cast) ? item.cast : ['Korean Actor'],
          seasons: [{ seasonNumber: 1, name: 'Season 1', episodeCount: item.total_episodes || 16, posterPath: item.poster }],
          totalEpisodes: item.total_episodes || 16,
          isComingSoon: false,
        }));
      }
    }
  } catch (e) {}
  return [];
}

export async function fetchKdramaSeries(page = 1): Promise<Movie[]> {
  try {
    // 1. Direct fetch for Priority Masterpiece K-Dramas (including Twinkling Watermelon)
    const priorityPromises = PRIORITY_KDRAMA_IDS.slice((page - 1) * 15, page * 15).map(id => 
      cachedFetchJson(`${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos`)
    );

    // 2. Discover multi-page concurrent calls
    const pDiscover1 = cachedFetchJson(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_original_language=ko&without_genres=10764,10767,10763&sort_by=popularity.desc&page=${page}&include_adult=false`);
    const pDiscover2 = cachedFetchJson(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_original_language=ko&without_genres=10764,10767,10763&sort_by=vote_count.desc&page=${page}&include_adult=false`);
    const pDiscover3 = cachedFetchJson(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_original_language=ko&without_genres=10764,10767,10763&sort_by=first_air_date.desc&page=${page}&include_adult=false`);
    const pTrending = cachedFetchJson(`${TMDB_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}&page=${page}`);
    const pHeroku = fetchFromDrakorHerokuApi(`page/${page}`).catch(() => []);

    const [priorityResults, d1, d2, d3, trending, herokuItems] = await Promise.all([
      Promise.all(priorityPromises),
      pDiscover1,
      pDiscover2,
      pDiscover3,
      pTrending,
      pHeroku
    ]);

    const trendingKorean = (trending?.results || []).filter((item: any) => item.original_language === 'ko');

    const rawList = [
      ...priorityResults.filter(Boolean),
      ...trendingKorean,
      ...herokuItems,
      ...(d1?.results || []),
      ...(d2?.results || []),
      ...(d3?.results || [])
    ];

    const seen = new Set();
    const unique: Movie[] = [];
    for (const item of rawList) {
      if (!item) continue;
      if (item._id && !seen.has(item._id)) {
        seen.add(item._id);
        unique.push(item);
        continue;
      }
      if (item.id && !seen.has(item.id) && isSafeContent(item) && (item.poster_path || item.backdrop_path)) {
        seen.add(item.id);
        const mapped = mapToMovieDetails(item, true);
        mapped.genres = ['K-Drama', 'Drama Korea', ...mapped.genres.filter(g => g !== 'Film')];
        unique.push(mapped);
      }
    }
    return unique;
  } catch (e) {}
  return [];
}

// 🇨🇳 CHINESE DRAMA (DRACIN - 40+ TITLES)
export async function fetchDracinSeries(page = 1): Promise<Movie[]> {
  try {
    const p1Promise = fetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_original_language=zh&with_type=4&without_genres=16,10764,10767,10763&sort_by=popularity.desc&page=${page}&include_adult=false`).then(r => r.json());
    const p2Promise = fetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_original_language=zh&with_type=4&without_genres=16,10764,10767,10763&sort_by=vote_count.desc&page=${page}&include_adult=false`).then(r => r.json());

    const [p1, p2] = await Promise.all([p1Promise, p2Promise]);
    const rawList = [...(p1?.results || []), ...(p2?.results || [])];

    const seen = new Set();
    const unique = [];
    for (const item of rawList) {
      if (!seen.has(item.id) && isSafeContent(item)) {
        seen.add(item.id);
        const mapped = mapToMovieDetails(item, true);
        mapped.genres = ['Dracin', 'Drama China', ...mapped.genres.filter(g => g !== 'Film')];
        unique.push(mapped);
      }
    }
    return unique;
  } catch (e) {}
  return [];
}

// 🇯🇵 JAPANESE DRAMA (DORAMA / J-DRAMA)
export async function fetchJdramaSeries(page = 1): Promise<Movie[]> {
  try {
    const p1Promise = fetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_original_language=ja&with_type=4&without_genres=16,10764,10767,10763&sort_by=popularity.desc&page=${page}&include_adult=false`).then(r => r.json());
    const p2Promise = fetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_original_language=ja&with_type=4&without_genres=16,10764,10767,10763&sort_by=vote_count.desc&page=${page}&include_adult=false`).then(r => r.json());

    const [p1, p2] = await Promise.all([p1Promise, p2Promise]);
    const rawList = [...(p1?.results || []), ...(p2?.results || [])];

    const seen = new Set();
    const unique = [];
    for (const item of rawList) {
      if (!seen.has(item.id) && isSafeContent(item)) {
        seen.add(item.id);
        const mapped = mapToMovieDetails(item, true);
        mapped.genres = ['JDrama', 'Drama Jepang', ...mapped.genres.filter(g => g !== 'Film')];
        unique.push(mapped);
      }
    }
    return unique;
  } catch (e) {}
  return [];
}

// ✨ CURATED 100% CLEAN ICONIC ANIME MASTER LIST (ZERO HENTAI / STRICT NSFW FILTER)
export async function fetchAnimeSeries(page = 1): Promise<Movie[]> {
  try {
    const p1Promise = fetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=16&with_original_language=ja&without_genres=10770,10767&sort_by=popularity.desc&page=${page}&include_adult=false`).then(r => r.json());
    const p2Promise = fetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=16&with_original_language=ja&without_genres=10770,10767&sort_by=vote_count.desc&page=${page}&include_adult=false`).then(r => r.json());

    const [p1, p2] = await Promise.all([p1Promise, p2Promise]);
    const rawList = [...(p1?.results || []), ...(p2?.results || [])];

    const seen = new Set();
    const unique = [];
    for (const item of rawList) {
      if (!seen.has(item.id) && isSafeContent(item)) {
        seen.add(item.id);
        const mapped = mapToMovieDetails(item, true);
        mapped.genres = ['Anime', 'Anime Sub Indo', ...mapped.genres.filter(g => g !== 'Film')];
        unique.push(mapped);
      }
    }
    return unique;
  } catch (e) {}
  return [];
}

export async function fetchNewReleases(page = 1): Promise<Movie[]> {
  try {
    const data = await cachedFetchJson(`${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&page=${page}&include_adult=false`);
    if (data) {
      if (Array.isArray(data.results)) {
        return data.results.filter(isSafeContent).map((m: any) => mapToMovieDetails(m, false));
      }
    }
  } catch (e) {}
  return [];
}

export async function fetchTopRated(page = 1): Promise<Movie[]> {
  try {
    const data = await cachedFetchJson(`${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&page=${page}&include_adult=false`);
    if (data) {
      if (Array.isArray(data.results)) {
        return data.results.filter(isSafeContent).map((m: any) => mapToMovieDetails(m, false));
      }
    }
  } catch (e) {}
  return [];
}

export async function fetchSeasonEpisodes(tvId: string | number, seasonNumber = 1): Promise<EpisodeItem[]> {
  const { cleanId } = normalizeId(String(tvId));
  try {
    const res = await fetch(`${TMDB_BASE_URL}/tv/${cleanId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.episodes)) {
        return data.episodes.map((ep: any) => ({
          id: ep.id,
          episodeNumber: ep.episode_number,
          seasonNumber: seasonNumber,
          title: ep.name || `Episode ${ep.episode_number}`,
          overview: ep.overview || 'Sinopsis episode belum tersedia.',
          stillPath: ep.still_path ? `${TMDB_IMG_W500}${ep.still_path}` : undefined,
          duration: ep.runtime ? `${ep.runtime}m` : '24m',
          releaseDate: ep.air_date,
          rating: ep.vote_average ? ep.vote_average.toFixed(1) : undefined,
        }));
      }
    }
  } catch (e) {}

  return Array.from({ length: 12 }, (_, i) => ({
    episodeNumber: i + 1,
    seasonNumber: seasonNumber,
    title: `Episode ${i + 1}`,
    overview: `Episode ${i + 1} dari Season ${seasonNumber}.`,
    duration: '24m',
  }));
}

export async function fetchMovieDetails(id: string): Promise<MovieDetails | null> {
  const { cleanId, isTv } = normalizeId(id);

  try {
    const endpoint = isTv ? `tv/${cleanId}` : `movie/${cleanId}`;
    const res = await fetch(`${TMDB_BASE_URL}/${endpoint}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos,similar,external_ids`);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.title || data.name)) {
        const detail = mapToMovieDetails(data, isTv);
        if (isTv) {
          const firstSeason = detail.seasons && detail.seasons[0] ? detail.seasons[0].seasonNumber : 1;
          detail.episodes = await fetchSeasonEpisodes(cleanId, firstSeason);
        }
        return detail;
      }
    }
  } catch (e) {}

  return null;
}

export async function searchMovies(query: string): Promise<Movie[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1&include_adult=false`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results)) {
        return data.results
          .filter((item: any) => isSafeContent(item) && (item.media_type === 'movie' || item.media_type === 'tv') && Boolean(item.poster_path || item.backdrop_path))
          .map((item: any) => mapToMovieDetails(item, item.media_type === 'tv'));
      }
    }
  } catch (e) {}
  return [];
}

export async function fetchGenres(): Promise<GenreItem[]> {
  return [
    { parameter: 'kdrama', name: 'Drakor (K-Drama)', numberOfContents: 620 },
    { parameter: 'dracin', name: 'Dracin (Drama China)', numberOfContents: 480 },
    { parameter: 'jdrama', name: 'Drama Jepang (Dorama)', numberOfContents: 320 },
    { parameter: 'anime', name: 'Anime', numberOfContents: 410 },
    { parameter: 'action', name: 'Action', numberOfContents: 850 },
    { parameter: 'series', name: 'TV Series Barat', numberOfContents: 750 },
    { parameter: 'drama', name: 'Drama', numberOfContents: 980 },
    { parameter: 'romance', name: 'Romance', numberOfContents: 490 },
    { parameter: 'sci-fi', name: 'Sci-Fi', numberOfContents: 530 },
    { parameter: 'horror', name: 'Horror', numberOfContents: 540 },
    { parameter: 'comedy', name: 'Comedy', numberOfContents: 780 },
  ];
}

export async function fetchMoviesByGenre(genre: string, page = 1): Promise<Movie[]> {
  const raw = (genre || '').toLowerCase();
  const g = raw.replace(/[^a-z0-9]/g, '');

  if (g.includes('bodyswap') || g.includes('body swap') || g.includes('tukartubuh')) {
    return fetchBodySwapMovies(page);
  }
  if (g.includes('genderbender') || g.includes('gender bender') || g.includes('crossdress')) {
    return fetchGenderBenderMovies(page);
  }
  if (g.includes('kdrama') || g.includes('drakor') || g.includes('korea')) {
    return fetchKdramaSeries(page);
  }
  if (g.includes('dracin') || g.includes('china') || g.includes('mandarin')) {
    return fetchDracinSeries(page);
  }
  if (g.includes('jdrama') || g.includes('jepang') || g.includes('dorama')) {
    return fetchJdramaSeries(page);
  }
  if (g.includes('anime')) {
    return fetchAnimeSeries(page);
  }
  if (g.includes('series') || g.includes('tv')) {
    return fetchPopularSeries(page);
  }

  const genreId = GENRE_TO_ID[raw] || GENRE_TO_ID[g];
  if (genreId) {
    try {
      const res = await fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&page=${page}&sort_by=popularity.desc&include_adult=false`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results)) {
          return data.results.filter(isSafeContent).map((m: any) => mapToMovieDetails(m, false));
        }
      }
    } catch (e) {}
  }

  return fetchPopularMovies(page);
}

export async function fetchStreamSources(
  movie: MovieDetails | string, 
  isSeries = false, 
  season = 1, 
  episode = 1
): Promise<StreamSource[]> {
  let rawId = typeof movie === 'string' ? movie : movie._id;

  const { cleanId, isTv } = normalizeId(rawId);
  const isSeriesMode = isSeries || isTv;
  const streamId = cleanId;

  if (isSeriesMode) {
    return [
      {
        provider: '⚡ Server 1 (IDLIX VIP Sub Indo)',
        url: `https://multiembed.mov/?video_id=${streamId}&tmdb=1&s=${season}&e=${episode}&sub=id,indonesia,indonesian`,
        resolutions: ['1080p Full HD', 'Sub Indo Otomatis'],
      },
      {
        provider: '🚀 Server 2 (Embed.su HD)',
        url: `https://embed.su/embed/tv/${streamId}/${season}/${episode}`,
        resolutions: ['1080p HD', 'Sub Indo'],
      },
      {
        provider: '🔥 Server 3 (VidSrc CC 4K)',
        url: `https://vidsrc.cc/v2/embed/tv/${streamId}/${season}/${episode}?sub=indonesian,id&autoPlay=false`,
        resolutions: ['4K Ultra HD', 'Multi-Sub'],
      },
      {
        provider: '🎬 Server 4 (AutoEmbed VIP)',
        url: `https://player.autoembed.cc/embed/tv/${streamId}/${season}/${episode}?sub=id`,
        resolutions: ['1080p', 'Sub Indo'],
      },
      {
        provider: '💎 Server 5 (VidLink Cinema)',
        url: `https://vidlink.pro/tv/${streamId}/${season}/${episode}?sub=id&sub.lang=id`,
        resolutions: ['4K Cinema'],
      },
      {
        provider: '🛡️ Server 6 (2Embed VIP)',
        url: `https://www.2embed.cc/embedtv/${streamId}&s=${season}&e=${episode}`,
        resolutions: ['1080p'],
      },
    ];
  }

  return [
    {
      provider: '⚡ Server 1 (IDLIX VIP Sub Indo)',
      url: `https://multiembed.mov/?video_id=${streamId}&tmdb=1&sub=id,indonesia,indonesian`,
      resolutions: ['1080p Full HD', 'Sub Indo Otomatis'],
    },
    {
      provider: '🚀 Server 2 (Embed.su HD)',
      url: `https://embed.su/embed/movie/${streamId}`,
      resolutions: ['1080p HD', 'Sub Indo'],
    },
    {
      provider: '🔥 Server 3 (VidSrc CC 4K)',
      url: `https://vidsrc.cc/v2/embed/movie/${streamId}?sub=indonesian,id&autoPlay=false`,
      resolutions: ['4K Ultra HD', 'Multi-Sub'],
    },
    {
      provider: '🎬 Server 4 (AutoEmbed VIP)',
      url: `https://player.autoembed.cc/embed/movie/${streamId}?sub=id`,
      resolutions: ['1080p', 'Sub Indo'],
    },
    {
      provider: '💎 Server 5 (VidLink Cinema)',
      url: `https://vidlink.pro/movie/${streamId}?sub=id&sub.lang=id`,
      resolutions: ['4K Cinema'],
    },
    {
      provider: '🛡️ Server 6 (2Embed VIP)',
      url: `https://www.2embed.cc/embed/${streamId}`,
      resolutions: ['1080p'],
    },
  ];
}




export interface FilterOptions {
  type?: string;     // 'all' | 'movie' | 'series' | 'kdrama' | 'dracin' | 'jdrama' | 'anime'
  genre?: string;    // 'all' | 'action' | 'romance' | 'horror' | 'comedy' | 'sci-fi' | 'drama' | 'thriller' | 'fantasy' | 'animation' | 'adventure' | 'crime' | 'mystery'
  sortBy?: string;   // 'popularity' | 'rating' | 'latest'
  year?: string;     // 'all' | '2026' | '2025' | '2024' | '2023' | '2022' | '2021' | '2020' | '2010s' | 'classic'
  page?: number;
}

export async function fetchFilteredCatalog(options: FilterOptions): Promise<Movie[]> {
  const { type = 'all', genre = 'all', sortBy = 'popularity', year = 'all', page = 1 } = options;

  let isTv = type === 'series' || type === 'kdrama' || type === 'dracin' || type === 'jdrama' || type === 'anime';
  let endpoint = isTv ? 'discover/tv' : 'discover/movie';

  let params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    page: String(page),
    include_adult: 'false',
  });

  // Sort
  if (sortBy === 'rating') {
    params.set('sort_by', 'vote_average.desc');
    params.set('vote_count.gte', isTv ? '30' : '100');
  } else if (sortBy === 'latest') {
    params.set('sort_by', isTv ? 'first_air_date.desc' : 'primary_release_date.desc');
  } else {
    params.set('sort_by', 'popularity.desc');
  }

  // Type & Origin
  if (type === 'indo') {
    endpoint = 'discover/movie';
    isTv = false;
    params.set('with_original_language', 'id');
  } else if (type === 'kdrama') {
    endpoint = 'discover/tv';
    isTv = true;
    params.set('with_original_language', 'ko');
    params.set('without_genres', '10764,10767,10763');
  } else if (type === 'dracin') {
    endpoint = 'discover/tv';
    isTv = true;
    params.set('with_original_language', 'zh');
    params.set('without_genres', '16,10764,10767,10763');
  } else if (type === 'jdrama') {
    endpoint = 'discover/tv';
    isTv = true;
    params.set('with_original_language', 'ja');
    params.set('without_genres', '16,10764,10767,10763');
  } else if (type === 'anime') {
    endpoint = 'discover/tv';
    isTv = true;
    params.set('with_original_language', 'ja');
    params.set('with_genres', '16');
    params.set('without_genres', '10770,10767');
  } else if (type === 'movie') {
    endpoint = 'discover/movie';
    isTv = false;
  } else if (type === 'series') {
    endpoint = 'discover/tv';
    isTv = true;
  }

  // Special themes: Body Swap & Gender Bender
  if (genre === 'bodyswap' || genre === 'body swap') {
    return fetchBodySwapMovies(page);
  }
  if (genre === 'genderbender' || genre === 'gender bender') {
    return fetchGenderBenderMovies(page);
  }

  // Genre
  if (genre && genre !== 'all') {
    const gKey = genre.toLowerCase().replace(/[^a-z0-9]/g, '');
    const gId = GENRE_TO_ID[gKey] || GENRE_TO_ID[genre.toLowerCase()];
    if (gId) {
      if (type === 'anime') {
        params.set('with_genres', `16,${gId}`);
      } else {
        params.set('with_genres', String(gId));
      }
    }
  }

  // Year
  if (year && year !== 'all') {
    if (year === '2010s') {
      if (isTv) {
        params.set('first_air_date.gte', '2010-01-01');
        params.set('first_air_date.lte', '2019-12-31');
      } else {
        params.set('primary_release_date.gte', '2010-01-01');
        params.set('primary_release_date.lte', '2019-12-31');
      }
    } else if (year === 'classic') {
      if (isTv) {
        params.set('first_air_date.lte', '2009-12-31');
      } else {
        params.set('primary_release_date.lte', '2009-12-31');
      }
    } else {
      if (isTv) {
        params.set('first_air_date_year', year);
      } else {
        params.set('primary_release_year', year);
      }
    }
  }

  try {
    const res = await fetch(`${TMDB_BASE_URL}/${endpoint}?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results)) {
        return data.results
          .filter(isSafeContent)
          .map((item: any) => mapToMovieDetails(item, isTv));
      }
    }
  } catch (e) {}

  return [];
}


export async function fetchMovieTrailer(id: string | number, isTv = false, title = ''): Promise<string> {
  const { cleanId, isTv: normalizedIsTv } = normalizeId(String(id));
  const isSeries = isTv || normalizedIsTv;

  try {
    const endpoint = isSeries ? `tv/${cleanId}/videos` : `movie/${cleanId}/videos`;
    const res = await fetch(`${TMDB_BASE_URL}/${endpoint}?api_key=${TMDB_API_KEY}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        // Priority 1: Official Trailer on YouTube
        const trailer = data.results.find((v: any) => 
          v.site === 'YouTube' && v.type === 'Trailer' && (v.official || v.name?.toLowerCase().includes('official') || v.name?.toLowerCase().includes('trailer'))
        );
        if (trailer && trailer.key) {
          return `https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`;
        }

        // Priority 2: Any YouTube video
        const yt = data.results.find((v: any) => v.site === 'YouTube' && v.key);
        if (yt && yt.key) {
          return `https://www.youtube.com/embed/${yt.key}?autoplay=1&rel=0`;
        }
      }
    }
  } catch (e) {}

  // Priority 3: Dynamic YouTube Search Embed for the exact movie title
  const query = encodeURIComponent(`${title || 'Movie'} Official Trailer HD`);
  return `https://www.youtube.com/embed?listType=search&list=${query}&autoplay=1&rel=0`;
}


export async function fetchSimilarMovies(id: string | number, isTv = false, genres: string[] = []): Promise<Movie[]> {
  const { cleanId, isTv: normalizedIsTv } = normalizeId(String(id));
  const isSeries = isTv || normalizedIsTv;
  const endpoint = isSeries ? 'tv' : 'movie';

  try {
    // 1. Try recommendations endpoint first
    const recRes = await fetch(`${TMDB_BASE_URL}/${endpoint}/${cleanId}/recommendations?api_key=${TMDB_API_KEY}&page=1&include_adult=false`);
    if (recRes.ok) {
      const recData = await recRes.json();
      if (Array.isArray(recData.results) && recData.results.length >= 4) {
        return recData.results
          .filter(isSafeContent)
          .filter((m: any) => Boolean(m.poster_path || m.backdrop_path))
          .map((m: any) => mapToMovieDetails(m, isSeries));
      }
    }

    // 2. Try similar endpoint
    const simRes = await fetch(`${TMDB_BASE_URL}/${endpoint}/${cleanId}/similar?api_key=${TMDB_API_KEY}&page=1&include_adult=false`);
    if (simRes.ok) {
      const simData = await simRes.json();
      if (Array.isArray(simData.results) && simData.results.length >= 4) {
        return simData.results
          .filter(isSafeContent)
          .filter((m: any) => Boolean(m.poster_path || m.backdrop_path))
          .map((m: any) => mapToMovieDetails(m, isSeries));
      }
    }
  } catch (e) {}

  // 3. Fallback to movies in the exact primary genre
  if (genres && genres.length > 0) {
    const primaryGenre = genres[0];
    try {
      const fallbackList = await fetchMoviesByGenre(primaryGenre, 1);
      return fallbackList.filter(m => m._id !== String(id));
    } catch (e) {}
  }

  return [];
}


// 🔄 BODY SWAP (TUKAR TUBUH / JIWA) MASTER CATALOG
const BODY_SWAP_ITEMS = [
  { id: '372058', isTv: false }, // Your Name. (Kimi no Na wa)
  { id: '108261', isTv: true },  // Mr. Queen (Cheorinwanghu)
  { id: '551804', isTv: false }, // Freaky
  { id: '10330', isTv: false },  // Freaky Friday
  { id: '49520', isTv: false },  // The Change-Up
  { id: '16996', isTv: false },  // 17 Again
  { id: '45807', isTv: true },   // Kokoro Connect
  { id: '62568', isTv: true },   // Yamada-kun and the Seven Witches
  { id: '798021', isTv: false }, // Family Switch
];

export async function fetchBodySwapMovies(_page = 1): Promise<Movie[]> {
  try {
    const promises = BODY_SWAP_ITEMS.map(async (item) => {
      const endpoint = item.isTv ? `tv/${item.id}` : `movie/${item.id}`;
      const res = await fetch(`${TMDB_BASE_URL}/${endpoint}?api_key=${TMDB_API_KEY}&append_to_response=credits,external_ids`);
      if (res.ok) {
        const d = await res.json();
        const mapped = mapToMovieDetails(d, item.isTv);
        mapped.genres = ['Body Swap', 'Tukar Tubuh', ...mapped.genres.filter(g => g !== 'Film')];
        return mapped;
      }
      return null;
    });

    const list = (await Promise.all(promises)).filter(Boolean) as Movie[];
    return list.filter(isSafeContent);
  } catch (e) {}
  return [];
}

// 🎭 GENDER BENDER (PENYAMARAN / PERUBAHAN GENDER) MASTER CATALOG
const GENDER_BENDER_ITEMS = [
  { id: '3215', isTv: true },    // Coffee Prince
  { id: '129478', isTv: true },  // The King's Affection (Yeonmo)
  { id: '66256', isTv: true },   // Love in the Moonlight
  { id: '9655', isTv: false },   // She's the Man
  { id: '10674', isTv: false },  // Mulan
  { id: '1043', isTv: true },    // Ouran High School Host Club
  { id: '47007', isTv: true },   // To the Beautiful You (Hana Kimi)
  { id: '93541', isTv: true },   // The Tale of Nokdu
  { id: '31417', isTv: true },   // You're Beautiful
  { id: '34510', isTv: true },   // Sungkyunkwan Scandal
  { id: '57706', isTv: true },   // Ranma ½
];

export async function fetchGenderBenderMovies(_page = 1): Promise<Movie[]> {
  try {
    const promises = GENDER_BENDER_ITEMS.map(async (item) => {
      const endpoint = item.isTv ? `tv/${item.id}` : `movie/${item.id}`;
      const res = await fetch(`${TMDB_BASE_URL}/${endpoint}?api_key=${TMDB_API_KEY}&append_to_response=credits,external_ids`);
      if (res.ok) {
        const d = await res.json();
        const mapped = mapToMovieDetails(d, item.isTv);
        mapped.genres = ['Gender Bender', 'Penyamaran', ...mapped.genres.filter(g => g !== 'Film')];
        return mapped;
      }
      return null;
    });

    const list = (await Promise.all(promises)).filter(Boolean) as Movie[];
    return list.filter(isSafeContent);
  } catch (e) {}
  return [];
}


// 🎭 ACTOR FILMOGRAPHY & PROFILE FETCHER
export async function fetchActorDetailsAndCredits(personId: number | string): Promise<ActorProfile | null> {
  try {
    const res = await fetch(`${TMDB_BASE_URL}/person/${personId}?api_key=${TMDB_API_KEY}&append_to_response=combined_credits`);
    if (res.ok) {
      const data = await res.json();
      const rawCredits = data.combined_credits?.cast || [];
      
      const filmography: Movie[] = rawCredits
        .filter((c: any) => isSafeContent(c) && (c.poster_path || c.backdrop_path))
        .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 30)
        .map((c: any) => mapToMovieDetails(c, c.media_type === 'tv'));

      return {
        id: data.id,
        name: data.name,
        biography: data.biography || 'Informasi biografi belum tersedia dalam database.',
        birthday: data.birthday,
        placeOfBirth: data.place_of_birth,
        avatarUrl: data.profile_path ? `https://image.tmdb.org/t/p/w300${data.profile_path}` : undefined,
        knownFor: data.known_for_department || 'Acting',
        filmography,
      };
    }
  } catch (e) {}
  return null;
}


// 🇮🇩 INDONESIAN MOVIES (JANJI JONI, THE RAID, PENGABDI SETAN, AGAK LAEN, ETC.)
export async function fetchIndonesianMovies(page = 1): Promise<Movie[]> {
  try {
    const p1 = fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=id&sort_by=popularity.desc&page=${page}&include_adult=false`).then(r => r.json());
    const p2 = fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=id&sort_by=vote_count.desc&page=${page}&include_adult=false`).then(r => r.json());
    const p3 = fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=Janji+Joni`).then(r => r.json());
    const p4 = fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=id&sort_by=popularity.desc&page=${page + 1}&include_adult=false`).then(r => r.json());
    const p5 = fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=Pengabdi+Setan`).then(r => r.json());

    const [d1, d2, d3, d4, d5] = await Promise.all([p1, p2, p3, p4, p5]);
    const rawList = [
      ...(d3?.results || []),
      ...(d5?.results || []),
      ...(d1?.results || []),
      ...(d2?.results || []),
      ...(d4?.results || [])
    ];

    const seen = new Set();
    const unique: Movie[] = [];
    for (const item of rawList) {
      if (!seen.has(item.id) && isSafeContent(item) && (item.poster_path || item.backdrop_path)) {
        seen.add(item.id);
        const mapped = mapToMovieDetails(item, false);
        mapped.genres = ['Film Indonesia', 'Bioskop Indo', ...mapped.genres.filter(g => g !== 'Film')];
        unique.push(mapped);
      }
    }
    return unique;
  } catch (e) {}
  return [];
}
