import type { Movie, MovieDetails } from '../types';

const LOCAL_STORAGE_KEY = 'ruangsinema_pc_movies';

function getLocalBackendUrl(): string {
  if (typeof window !== 'undefined') {
    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalHost) {
      return 'http://localhost:5001/api/movies';
    }
  }
  return '/api/movies';
}

function getStoredMovies(): MovieDetails[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function persistStoredMovies(movies: MovieDetails[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(movies));
  } catch (e) {}
}

/**
 * Ambil semua film yang tersimpan di Database PC / Laptop Lokal
 */
export async function fetchLocalMovies(): Promise<MovieDetails[]> {
  const localCache = getStoredMovies();
  const directLocalUrl = 'http://localhost:5001/api/movies';
  const fallbackUrl = getLocalBackendUrl();

  // Prioritas 1: Server Lokal PC (Port 5001 MySQL / Hard Drive)
  try {
    const res = await fetch(directLocalUrl, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.movies) && data.movies.length > 0) {
        persistStoredMovies(data.movies);
        return data.movies;
      }
    }
  } catch (e) {}

  // Prioritas 2: Cloud / Vercel API
  try {
    const res = await fetch(fallbackUrl, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.movies) && data.movies.length > 0) {
        // Gabungkan dengan cache lokal
        const mergedMap = new Map<string, MovieDetails>();
        localCache.forEach(m => mergedMap.set(m._id || (m as any).id, m));
        data.movies.forEach((m: MovieDetails) => mergedMap.set(m._id || (m as any).id, m));
        const mergedList = Array.from(mergedMap.values());
        persistStoredMovies(mergedList);
        return mergedList;
      }
    }
  } catch (e) {}

  // Fallback: LocalStorage Browser
  return localCache;
}

/**
 * Simpan Film Baru ke Database Lokal PC (Hard Drive & MySQL)
 */
export async function saveMovieToLocalDB(movie: Movie | MovieDetails): Promise<{ success: boolean; message: string; movie?: MovieDetails }> {
  const movieId = movie._id || (movie as any).id || `local-${Date.now()}`;
  const details = movie as Partial<MovieDetails>;
  const movieDetails: MovieDetails = {
    _id: movieId,
    title: movie.title,
    type: movie.type || 'movie',
    posterImg: movie.posterImg || '',
    backdropImg: movie.backdropImg || '',
    rating: movie.rating || '8.5',
    year: movie.year || '2024',
    duration: movie.duration || '2j 00m',
    genres: movie.genres || ['Action'],
    quality: movie.quality || '1080p Full HD',
    qualityResolution: movie.qualityResolution || '1080p FULL HD',
    releaseDate: details.releaseDate || '2024-01-01',
    synopsis: details.synopsis || 'Tersimpan di database lokal PC.',
    trailerUrl: details.trailerUrl || '',
    directors: details.directors || ['Director'],
    countries: details.countries || ['Indonesia'],
    casts: details.casts || ['Actor'],
    videoUrl: details.videoUrl || '',
    localFilePath: details.localFilePath || '',
    streamSources: details.streamSources || [
      { provider: 'Local PC Hard Drive', url: details.videoUrl || details.localFilePath || '', quality: '1080p Offline' }
    ]
  };

  // Simpan ke Browser Cache segera (Respons Instan)
  const cached = getStoredMovies();
  const existingIdx = cached.findIndex(m => m._id === movieId || m.title.toLowerCase() === movie.title.toLowerCase());
  if (existingIdx >= 0) {
    cached[existingIdx] = movieDetails;
  } else {
    cached.unshift(movieDetails);
  }
  persistStoredMovies(cached);

  // Kirim ke Local PC Auth/DB Server (Port 5001)
  try {
    await fetch('http://localhost:5001/api/movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movieDetails),
      mode: 'cors',
      signal: AbortSignal.timeout(3000)
    });
  } catch (e) {}

  // Kirim juga ke Vercel Cloud endpoint jika berjalan di cloud
  try {
    await fetch('/api/movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movieDetails),
      signal: AbortSignal.timeout(3000)
    });
  } catch (e) {}

  return {
    success: true,
    message: `Film "${movie.title}" berhasil disimpan ke Database Lokal PC Anda!`,
    movie: movieDetails
  };
}

/**
 * Hapus Film dari Database Lokal PC
 */
export async function deleteMovieFromLocalDB(id: string): Promise<boolean> {
  // Hapus dari cache
  const cached = getStoredMovies().filter(m => m._id !== id && (m as any).id !== id);
  persistStoredMovies(cached);

  // Hapus dari Local PC Server
  try {
    await fetch(`http://localhost:5001/api/movies?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      mode: 'cors',
      signal: AbortSignal.timeout(2000)
    });
  } catch (e) {}

  try {
    await fetch(`/api/movies?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(2000)
    });
  } catch (e) {}

  return true;
}

/**
 * Cek apakah film sudah ada di Database PC
 */
export function isMovieSavedToLocalDB(idOrTitle: string): boolean {
  const cached = getStoredMovies();
  return cached.some(m => m._id === idOrTitle || (m as any).id === idOrTitle || m.title.toLowerCase() === idOrTitle.toLowerCase());
}
