
export interface Movie {
  _id: string;
  title: string;
  type: 'movie' | 'series';
  posterImg: string;
  rating: string;
  url?: string;
  qualityResolution?: string;
  genres: string[];
  backdropImg?: string;
  year?: string;
  duration?: string;
}

export interface CastMember {
  id?: number;
  name: string;
  character?: string;
  avatarUrl?: string;
}

export interface ActorProfile {
  id: number;
  name: string;
  biography?: string;
  birthday?: string;
  placeOfBirth?: string;
  avatarUrl?: string;
  knownFor?: string;
  filmography: Movie[];
}

export interface EpisodeItem {
  id?: number;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  overview?: string;
  stillPath?: string;
  duration?: string;
  releaseDate?: string;
  rating?: string;
}

export interface SeasonItem {
  id?: number;
  seasonNumber: number;
  name: string;
  episodeCount: number;
  overview?: string;
  posterPath?: string;
}

export interface MovieDetails extends Movie {
  quality: string;
  releaseDate: string;
  synopsis: string;
  duration: string;
  trailerUrl: string;
  directors: string[];
  countries: string[];
  casts: string[];
  castMembers?: CastMember[];
  ageRating?: string;
  seasons?: SeasonItem[];
  episodes?: EpisodeItem[];
  totalEpisodes?: number;
  imdbId?: string;
  releaseStatus?: string;
  isComingSoon?: boolean;
}

export interface StreamSource {
  provider: string;
  url: string;
  resolutions: string[];
}

export interface GenreItem {
  parameter: string;
  name: string;
  numberOfContents: number;
}

export interface SavedMovieItem {
  _id: string;
  title: string;
  type?: 'movie' | 'series';
  posterImg: string;
  backdropImg?: string;
  duration: string;
  progressPercent: number;
  completed: boolean;
  savedAt: number;
  lastWatchedAt?: number;
  rating?: string;
  genres?: string[];
  synopsis?: string;
  currentSeason?: number;
  currentEpisode?: number;
}

export interface CustomPlaylist {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  movieCount: number;
  items: SavedMovieItem[];
}

export interface User {
  id: number | string;
  name: string;
  email: string;
  genres: string[];
  role?: string;
  avatar?: string;
}

export type TabType = 'home' | 'search' | 'library' | 'profile';
export type HubType = 'all' | 'kdrama' | 'dracin' | 'jdrama' | 'anime';
