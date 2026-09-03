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
      className={`${widthClass} group cursor-pointer select-none flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.02]`}
    >
      {/* Poster Box with Uniform 3px Rounded Corners */}
      <div className={`relative ${heightClass} rounded-[3px] overflow-hidden bg-[#121318] shadow-lg border border-white/10 group-hover:border-[#FF2E2E] group-hover:shadow-[0_0_20px_rgba(255,46,46,0.3)] transition-all duration-300`}>
        <img 
          src={movie.posterImg || 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'} 
          alt={movie.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placehold.co/500x750/121318/FF2E2E?text=${encodeURIComponent(movie.title.substring(0, 20))}`;
          }}
        />

        {/* Dynamic Dark Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-[#0A0A0C]/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity pointer-events-none" />

        {/* Top Badges (Strict 3px Radius & Single Accent System) */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {isComingSoon ? (
            <span className="bg-[#FF2E2E] text-white text-[9px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-[3px] shadow-sm">
              SEGERA
            </span>
          ) : isSeries ? (
            <span className="border border-[#FF2E2E]/40 bg-black/60 text-[#FF2E2E] text-[9px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-[3px] backdrop-blur-sm">
              SERIAL
            </span>
          ) : (
            <span className="border border-white/20 bg-black/60 text-zinc-300 text-[9px] font-mono font-semibold tracking-wider uppercase px-2 py-0.5 rounded-[3px] backdrop-blur-sm">
              FILM
            </span>
          )}

          {/* Rating Badge: Matching Accent Family with 1px Outline */}
          {showRating && (
            <div className="flex items-center gap-1 bg-black/75 border border-[#FF2E2E]/35 text-[#FF2E2E] font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-[3px] backdrop-blur-sm">
              <Star className="w-2.5 h-2.5 fill-[#FF2E2E] stroke-none" />
              <span>{movie.rating ? Number(movie.rating).toFixed(1) : '8.5'}</span>
            </div>
          )}
        </div>

        {/* Center Hover Play Action */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="w-11 h-11 rounded-[3px] bg-[#FF2E2E] flex items-center justify-center text-white shadow-xl shadow-[#FF2E2E]/40 transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-4 h-4 fill-white stroke-none ml-0.5" />
          </div>
        </div>

        {/* Bottom Genre Ribbon on Poster */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 pointer-events-none">
          <span className="text-[10px] font-mono tracking-wider text-zinc-300 bg-black/70 px-1.5 py-0.2 rounded-[2px] border border-white/10 uppercase">
            {genreList[0]}
          </span>
          <span className="text-[10px] font-mono tracking-wider text-zinc-300 bg-black/70 px-1.5 py-0.2 rounded-[2px] border border-white/10 uppercase">
            SUB INDO
          </span>
        </div>
      </div>

      {/* Title & Metadata Below Poster */}
      <div className="pt-2 px-0.5 space-y-0.5">
        <h3 className="font-sans font-bold text-xs sm:text-sm text-white group-hover:text-[#FF2E2E] transition-colors truncate tracking-[0.01em]">
          {movie.title}
        </h3>
        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
          <span>{movie.year || '2025'}</span>
          <span>·</span>
          <span>{isSeries ? 'Episode Lengkap' : 'HD 1080p'}</span>
        </div>
      </div>
    </div>
  );
};

export const MovieCard = memo(MovieCardComponent);
