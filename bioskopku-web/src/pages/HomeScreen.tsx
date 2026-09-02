
import React, { useState } from 'react';
import type { Movie, MovieDetails, HubType } from '../types';
import { HeroBanner } from '../components/HeroBanner';
import { MovieCarousel } from '../components/MovieCarousel';
import { MovieCard } from '../components/MovieCard';

interface HomeScreenProps {
  featuredMovies: MovieDetails[];
  trendingMovies: (Movie | MovieDetails)[];
  seriesMovies: (Movie | MovieDetails)[];
  kdramaMovies: (Movie | MovieDetails)[];
  dracinMovies: (Movie | MovieDetails)[];
  jdramaMovies: (Movie | MovieDetails)[];
  animeMovies: (Movie | MovieDetails)[];
  newReleases: (Movie | MovieDetails)[];
  topRated: (Movie | MovieDetails)[];
  indonesianMovies?: (Movie | MovieDetails)[];
  onSelectMovie: (movie: Movie | MovieDetails) => void;
  onWatchTrailer?: (movie: MovieDetails) => void;
  onToggleSave?: (movie: MovieDetails) => void;
  onNavigateDiscover: (genre?: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  featuredMovies,
  trendingMovies,
  seriesMovies,
  kdramaMovies,
  dracinMovies,
  jdramaMovies,
  animeMovies,
  newReleases,
  topRated,
  indonesianMovies = [],
  onSelectMovie,
  onWatchTrailer,
  onToggleSave,
  onNavigateDiscover,
}) => {
  const [activeHub, setActiveHub] = useState<HubType>('all');
  const [trendingFilter, setTrendingFilter] = useState<'all' | 'movies' | 'tv'>('all');

  const hubs: { id: HubType; label: string }[] = [
    { id: 'all', label: 'Semua Sinema' },
    { id: 'kdrama', label: 'Drama Korea' },
    { id: 'dracin', label: 'Drama China' },
    { id: 'jdrama', label: 'Dorama Jepang' },
    { id: 'anime', label: 'Anime' },
  ];

  // Filter trending row dynamically
  const filteredTrending = trendingMovies.filter((m) => {
    if (trendingFilter === 'movies') return m.type !== 'series';
    if (trendingFilter === 'tv') return m.type === 'series';
    return true;
  });

  return (
    <div className="pb-28 space-y-8 animate-in fade-in duration-300 w-full">
      
      {/* Featured Billboard Banner */}
      {featuredMovies.length > 0 && activeHub === 'all' && (
        <HeroBanner
          movies={featuredMovies}
          onSelectMovie={onSelectMovie}
          onWatchTrailer={onWatchTrailer}
          onToggleSave={onToggleSave}
        />
      )}

      <div className="max-w-7xl mx-auto w-full space-y-8">
        
        {/* Hub Filter Pills */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {hubs.map((hub) => {
              const isActive = activeHub === hub.id;
              return (
                <button
                  key={hub.id}
                  onClick={() => setActiveHub(hub.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#E50914] text-white shadow-lg shadow-[#E50914]/30'
                      : 'bg-[#222222] text-gray-300 hover:text-white hover:bg-[#333333] border border-white/5'
                  }`}
                >
                  {hub.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* DEFAULT ALL VIEW */}
        {activeHub === 'all' && (
          <>
            {/* Trending Row with IDLIX [All | Movies | TV Series] Pill Switcher */}
            <section className="space-y-3 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4.5 bg-[#E50914] rounded-full" />
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    Trending Now
                  </h2>
                </div>

                {/* IDLIX Filter Pills */}
                <div className="flex items-center bg-[#1c1c1c] rounded-full p-1 border border-white/10 text-xs">
                  <button
                    onClick={() => setTrendingFilter('all')}
                    className={`px-3 py-1 rounded-full font-bold transition-colors ${
                      trendingFilter === 'all' ? 'bg-[#E50914] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setTrendingFilter('movies')}
                    className={`px-3 py-1 rounded-full font-bold transition-colors ${
                      trendingFilter === 'movies' ? 'bg-[#E50914] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Movies
                  </button>
                  <button
                    onClick={() => setTrendingFilter('tv')}
                    className={`px-3 py-1 rounded-full font-bold transition-colors ${
                      trendingFilter === 'tv' ? 'bg-[#E50914] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    TV Series
                  </button>
                </div>
              </div>

              {/* Carousel */}
              <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar scroll-smooth pb-3 pt-1">
                {filteredTrending.map((movie) => (
                  <MovieCard
                    key={movie._id}
                    movie={movie}
                    onClick={onSelectMovie}
                    layout="portrait"
                    showRating={true}
                  />
                ))}
              </div>
            </section>

            {/* Popular K-Drama */}
            {kdramaMovies.length > 0 && (
              <MovieCarousel
                title="Drama Korea (K-Drama) Terpopuler"
                movies={kdramaMovies}
                onSelectMovie={onSelectMovie}
                onSeeAll={() => onNavigateDiscover('K-Drama')}
              />
            )}

            {/* Popular Dracin */}
            {dracinMovies.length > 0 && (
              <MovieCarousel
                title="Drama China (Dracin) Terpopuler"
                movies={dracinMovies}
                onSelectMovie={onSelectMovie}
                onSeeAll={() => onNavigateDiscover('Dracin')}
              />
            )}

            {/* Popular Anime */}
            {animeMovies.length > 0 && (
              <MovieCarousel
                title="Anime Series Subtitle Indonesia"
                movies={animeMovies}
                onSelectMovie={onSelectMovie}
                onSeeAll={() => onNavigateDiscover('Anime')}
              />
            )}

            {/* Popular J-Drama */}
            {jdramaMovies.length > 0 && (
              <MovieCarousel
                title="Dorama Jepang & Live Action"
                movies={jdramaMovies}
                onSelectMovie={onSelectMovie}
                onSeeAll={() => onNavigateDiscover('JDrama')}
              />
            )}

            {/* Popular TV Series Barat */}
            {seriesMovies.length > 0 && (
              <MovieCarousel
                title="Serial TV Barat & Originals"
                movies={seriesMovies}
                onSelectMovie={onSelectMovie}
                onSeeAll={() => onNavigateDiscover('Series')}
              />
            )}

            {/* New Releases */}
            {newReleases.length > 0 && (
              <MovieCarousel
                title="Rilis Terbaru & Sedang Tayang"
                movies={newReleases}
                onSelectMovie={onSelectMovie}
                onSeeAll={() => onNavigateDiscover('all')}
              />
            )}

            {/* 🇮🇩 Indonesian Movies (Janji Joni, Pengabdi Setan, Agak Laen, etc.) */}
            {indonesianMovies.length > 0 && (
              <MovieCarousel
                title="🇮🇩 Bioskop Indonesia (Film Indo Terpopuler)"
                movies={indonesianMovies}
                onSelectMovie={onSelectMovie}
                onSeeAll={() => onNavigateDiscover('indo')}
              />
            )}

            {/* Top Rated Masterpieces */}
            {topRated.length > 0 && (
              <MovieCarousel
                title="Mahakarya Rating Tertinggi"
                movies={topRated}
                onSelectMovie={onSelectMovie}
                onSeeAll={() => onNavigateDiscover('Action')}
              />
            )}
          </>
        )}

        {/* KDRAMA HUB */}
        {activeHub === 'kdrama' && (
          <div className="space-y-8">
            <MovieCarousel
              title="Drama Korea Terpopuler"
              movies={kdramaMovies}
              onSelectMovie={onSelectMovie}
              onSeeAll={() => onNavigateDiscover('K-Drama')}
            />
          </div>
        )}

        {/* DRACIN HUB */}
        {activeHub === 'dracin' && (
          <div className="space-y-8">
            <MovieCarousel
              title="Drama China (Dracin) Terpopuler"
              movies={dracinMovies}
              onSelectMovie={onSelectMovie}
              onSeeAll={() => onNavigateDiscover('Dracin')}
            />
          </div>
        )}

        {/* JDRAMA HUB */}
        {activeHub === 'jdrama' && (
          <div className="space-y-8">
            <MovieCarousel
              title="Dorama Jepang & Live Action"
              movies={jdramaMovies}
              onSelectMovie={onSelectMovie}
              onSeeAll={() => onNavigateDiscover('JDrama')}
            />
          </div>
        )}

        {/* ANIME HUB */}
        {activeHub === 'anime' && (
          <div className="space-y-8">
            <MovieCarousel
              title="Anime Series Subtitle Indonesia"
              movies={animeMovies}
              onSelectMovie={onSelectMovie}
              onSeeAll={() => onNavigateDiscover('Anime')}
            />
          </div>
        )}

      </div>
    </div>
  );
};
