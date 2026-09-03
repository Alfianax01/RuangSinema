import React, { memo } from 'react';
import { Star, Play } from 'lucide-react';
import type { Movie, MovieDetails } from '../types';

interface MovieCardProps {
  movie: Movie | MovieDetails;
  onClick: (movie: Movie | MovieDetails) => void;
  layout?: 'portrait' | 'compact' | 'grid' | 'featured';
  showRating?: boolean;
}

const MovieCardComponent: React.FC<MovieCardProps> = ({ 
  movie, 
  onClick, 
  layout = 'portrait',
  showRating = true 
}) => {
  const isGrid = layout === 'grid';
  const isFeatured = layout === 'featured';

  const widthClass = isGrid 
    ? 'w-full' 
    : isFeatured 
    ? 'w-56 sm:w-64 lg:w-72 shrink-0' 
    : 'w-36 sm:w-44 lg:w-48 shrink-0';

  const heightClass = isGrid 
    ? 'aspect-[2/3]' 
    : isFeatured 
    ? 'h-64 sm:h-80 lg:h-92' 
    : 'h-52 sm:h-64 lg:h-72';

  const isSeries = movie.type === 'series';
  const isComingSoon = (movie as MovieDetails).isComingSoon;

  const genreList = (movie.genres && movie.genres.length > 0) 
    ? movie.genres.filter(g => g !== 'Film' && g !== 'Cinema').slice(0, 2)
    : ['Action', 'Drama'];

  return (
    <div 
      onClick={() => onClick(movie)}
      className={`${widthClass} movie-card-container group cursor-pointer select-none flex flex-col transition-all duration-300 hover:-translate-y-2 hover:scale-[1.03] hover:rotate-[0.5deg] hover:z-20`}
    >
      {/* Poster Box with Asymmetrical Non-Pill Corners */}
      <div className={`relative ${heightClass} card-cut overflow-hidden bg-[#101015] shadow-lg border border-white/10 group-hover:border-[#FF1E27] group-hover:shadow-[0_0_25px_rgba(255,30,39,0.35)] transition-all duration-300`}>
        <img 
          src={movie.posterImg || 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'} 
          alt={movie.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placehold.co/500x750/101015/FF1E27?text=${encodeURIComponent(movie.title.substring(0, 20))}`;
          }}
        />

        {/* Dynamic Dark Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-[#08080a]/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity pointer-events-none" />

        {/* Top Angled Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {isComingSoon ? (
            <div className="skew-tag bg-[#FF1E27] px-2 py-0.5 shadow-md">
              <span className="skew-tag-content font-mono font-black text-white text-[9px] uppercase tracking-wider">
                SEGERA
              </span>
            </div>
          ) : isSeries ? (
            <div className="skew-tag bg-[#FF1E27] px-2 py-0.5 shadow-md">
              <span className="skew-tag-content font-mono font-black text-white text-[9px] uppercase tracking-wider">
                SERIES
              </span>
            </div>
          ) : (
            <div className="skew-tag bg-black/60 backdrop-blur-sm border border-white/10 px-2 py-0.5">
              <span className="skew-tag-content font-mono font-bold text-zinc-300 text-[9px] tracking-wider">
                FILM
              </span>
            </div>
          )}

          {/* Electric Lime Rating Badge */}
          {showRating && (
            <div className="skew-tag bg-[#D4FF00] px-1.5 py-0.5 shadow-md shadow-[#D4FF00]/20">
              <div className="skew-tag-content flex items-center gap-0.5 text-black font-mono font-black text-[10px]">
                <Star className="w-2.5 h-2.5 fill-black stroke-none" />
                <span>{movie.rating ? Number(movie.rating).toFixed(1) : '8.5'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Center Hover Action: Play Button with Glowing Ring */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="w-12 h-12 rounded-xl bg-[#FF1E27] flex items-center justify-center text-white shadow-xl shadow-[#FF1E27]/50 transform scale-75 group-hover:scale-100 transition-transform duration-300 border border-white/20">
            <Play className="w-5 h-5 fill-white stroke-none ml-0.5" />
          </div>
        </div>

        {/* Bottom Poster Tag: Quality / Year */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono pointer-events-none">
          <span className="text-zinc-400 font-bold">{movie.year || '2024'}</span>
          <span className="text-[#D4FF00] font-black bg-black/60 px-1.5 py-0.5 rounded text-[9px] border border-[#D4FF00]/30">
            60 FPS
          </span>
        </div>
      </div>

      {/* Movie Info Beneath Poster */}
      <div className="pt-2 px-1 space-y-0.5">
        <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#D4FF00] truncate transition-colors leading-snug">
          {movie.title}
        </h3>
        <p className="text-[10px] font-mono text-zinc-400 truncate">
          {genreList.join(' · ')}
        </p>
      </div>
    </div>
  );
};

export const MovieCard = memo(MovieCardComponent);
