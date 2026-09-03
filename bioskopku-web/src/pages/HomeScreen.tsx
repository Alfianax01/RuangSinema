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
    <div className="pb-28 space-y-10 animate-in fade-in duration-300 w-full">
      
      {/* Featured Billboard Banner */}
      {featuredMovies.length > 0 && activeHub === 'all' && (
        <HeroBanner
          movies={featuredMovies}
          onSelectMovie={onSelectMovie}
          onWatchTrailer={onWatchTrailer}
          onToggleSave={onToggleSave}
        />
      )}

      <div className="max-w-7xl mx-auto w-full space-y-10">
        
        {/* Hub Filter (Angled Industrial Tabs - Goodbye Pill Shape!) */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {hubs.map((hub) => {
              const isActive = activeHub === hub.id;
              return (
                <button
                  key={hub.id}
                  onClick={() => setActiveHub(hub.id)}
                  className={`skew-tag px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#D4FF00] text-black shadow-lg shadow-[#D4FF00]/30 border border-[#D4FF00]'
                      : 'bg-[#121217] text-zinc-400 hover:text-white hover:bg-[#1a1a24] border border-white/10'
                  }`}
                >
                  <span className="skew-tag-content flex items-center gap-2">
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />}
                    {hub.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* DEFAULT ALL VIEW */}
        {activeHub === 'all' && (
          <>
            {/* Trending Row with Kinetic Reel + Giant Outline Numbers */}
            <section className="space-y-3 px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between border-b border-white/5 pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xl text-[#FF1E27] font-black -skew-x-6">//</span>
                    <h2 className="font-display text-2xl sm:text-4xl tracking-wider uppercase text-white leading-none">
                      TRENDING NOW
                    </h2>
                    <div className="skew-tag bg-[#FF1E27] px-2 py-0.5 shadow-md ml-1">
                      <span className="skew-tag-content font-mono font-black text-white text-[9px] uppercase tracking-wider">
                        TOP 10
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400 pl-5">
                    Paling banyak ditonton minggu ini · Subtitle Indonesia
                  </p>
                </div>

                {/* Monospace Sharp Segment Filter (No Pills!) */}
                <div className="flex items-center bg-[#121217] rounded-lg p-1 border border-white/10 text-xs font-mono">
                  {(['all', 'movies', 'tv'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setTrendingFilter(tab)}
                      className={`px-3 py-1 rounded text-[11px] font-bold uppercase transition-all ${
                        trendingFilter === tab 
                          ? 'bg-[#D4FF00] text-black font-black shadow' 
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {tab === 'all' ? 'ALL' : tab === 'movies' ? 'MOVIES' : 'SERIES'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kinetic Reel with Giant Typographic Outline Numbers */}
              <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto no-scrollbar scroll-smooth pb-4 pt-1 snap-x snap-mandatory">
                {filteredTrending.map((movie, index) => {
                  const rankNum = (index + 1).toString().padStart(2, '0');
                  return (
                    <div key={movie._id} className="flex items-end shrink-0 snap-start group relative">
                      <div className="select-none pointer-events-none -mr-4 sm:-mr-6 z-0 pb-6">
                        <span className="font-display text-7xl sm:text-9xl font-black text-[#15151c] group-hover:text-[#D4FF00]/25 transition-colors drop-shadow-md leading-none">
                          {rankNum}
                        </span>
                      </div>
                      <div className="relative z-10">
                        <MovieCard
                          movie={movie}
                          onClick={onSelectMovie}
                          layout={index === 0 ? 'featured' : 'portrait'}
                          showRating={true}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Popular K-Drama */}
            {kdramaMovies.length > 0 && (
              <MovieCarousel
                title="Drama Korea (K-Drama) Terpopuler"
                subtitle="Episode terlengkap dengan subtitle Indonesia & server cepat"
                movies={kdramaMovies}
                onSelectMovie={onSelectMovie}
                onSeeAll={() => onNavigateDiscover('K-Drama')}
              />
            )}

            {/* Popular Dracin */}
            {dracinMovies.length > 0 && (
              <MovieCarousel
                title="Drama China (Dracin) Pilihan"
                subtitle="Romansa, wuxia, dan fantasi terlaris"
                movies={dracinMovies}
                onSelectMovie={onSelectMovie}
                onSeeAll={() => onNavigateDiscover('Dracin')}
              />
            )}

            {/* Popular Anime */}
            {animeMovies.length > 0 && (
              <MovieCarousel
                title="Anime Series Subtitle Indonesia"
                subtitle="Rilis mingguan terbaru kualitas Full HD"
                movies={animeMovies}
                onSelectMovie={onSelectMovie}
                onSeeAll={() => onNavigateDiscover('Anime')}
              />
            )}

            {/* Film Indonesia */}
            {indonesianMovies.length > 0 && (
              <MovieCarousel
                title="Sinema Bioskop Indonesia"
                subtitle="Karya layar lebar anak bangsa terfavorit"
                movies={indonesianMovies}
                onSelectMovie={onSelectMovie}
                onSeeAll={() => onNavigateDiscover('Indonesian')}
              />
            )}

            {/* New Releases */}
            {newReleases.length > 0 && (
              <MovieCarousel
                title="Rilis Terbaru (New Releases)"
                subtitle="Update film & drama paling segar bulan ini"
                movies={newReleases}
                onSelectMovie={onSelectMovie}
                onSeeAll={() => onNavigateDiscover()}
              />
            )}

            {/* TV Series */}
            {seriesMovies.length > 0 && (
              <MovieCarousel
                title="Serial TV Pilihan Minggu Ini"
                subtitle="Marathon serial terbaik dari berbagai negara"
                movies={seriesMovies}
                onSelectMovie={onSelectMovie}
                onSeeAll={() => onNavigateDiscover('TV Series')}
              />
            )}

            {/* Top Rated */}
            {topRated.length > 0 && (
              <MovieCarousel
                title="Rating Tertinggi Sepanjang Masa"
                subtitle="Koleksi masterpiece dengan skor kritikus 8.5 ke atas"
                movies={topRated}
                onSelectMovie={onSelectMovie}
                onSeeAll={() => onNavigateDiscover()}
              />
            )}
          </>
        )}

        {/* HUB VIEWS FOR SPECIFIC DRAMA / ANIME TABS */}
        {activeHub === 'kdrama' && (
          <section className="space-y-4 px-4 sm:px-6 lg:px-8">
            <div className="border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-display text-xl text-[#D4FF00] font-black -skew-x-6">//</span>
                <h2 className="font-display text-3xl sm:text-4xl tracking-wider uppercase text-white">
                  KOREAN DRAMA ZONE
                </h2>
              </div>
              <p className="text-xs font-mono text-zinc-400 pl-5">
                Koleksi serial drakor terlengkap dari TvN, JTBC, SBS, dan Netflix
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {kdramaMovies.map((m) => (
                <MovieCard key={m._id} movie={m} onClick={onSelectMovie} layout="grid" />
              ))}
            </div>
          </section>
        )}

        {activeHub === 'dracin' && (
          <section className="space-y-4 px-4 sm:px-6 lg:px-8">
            <div className="border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-display text-xl text-[#D4FF00] font-black -skew-x-6">//</span>
                <h2 className="font-display text-3xl sm:text-4xl tracking-wider uppercase text-white">
                  CHINESE DRAMA ZONE
                </h2>
              </div>
              <p className="text-xs font-mono text-zinc-400 pl-5">
                Serial drama China wuxia, xianxia, dan romance modern terlengkap
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {dracinMovies.map((m) => (
                <MovieCard key={m._id} movie={m} onClick={onSelectMovie} layout="grid" />
              ))}
            </div>
          </section>
        )}

        {activeHub === 'jdrama' && (
          <section className="space-y-4 px-4 sm:px-6 lg:px-8">
            <div className="border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-display text-xl text-[#D4FF00] font-black -skew-x-6">//</span>
                <h2 className="font-display text-3xl sm:text-4xl tracking-wider uppercase text-white">
                  JAPANESE DRAMA ZONE
                </h2>
              </div>
              <p className="text-xs font-mono text-zinc-400 pl-5">
                Dorama Jepang menarik, slice of life, misteri & live action
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {jdramaMovies.map((m) => (
                <MovieCard key={m._id} movie={m} onClick={onSelectMovie} layout="grid" />
              ))}
            </div>
          </section>
        )}

        {activeHub === 'anime' && (
          <section className="space-y-4 px-4 sm:px-6 lg:px-8">
            <div className="border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-display text-xl text-[#D4FF00] font-black -skew-x-6">//</span>
                <h2 className="font-display text-3xl sm:text-4xl tracking-wider uppercase text-white">
                  ANIME SERIES HUB
                </h2>
              </div>
              <p className="text-xs font-mono text-zinc-400 pl-5">
                Anime shonen, isekai, romcom & movie anime terpopuler subtitle Indonesia
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {animeMovies.map((m) => (
                <MovieCard key={m._id} movie={m} onClick={onSelectMovie} layout="grid" />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};
