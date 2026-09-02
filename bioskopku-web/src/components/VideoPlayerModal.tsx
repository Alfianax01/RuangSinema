import React, { useState, useEffect } from 'react';
import { 
  X, ChevronLeft, ChevronRight, Tv, ExternalLink, 
  RefreshCw, Film, Maximize2, Minimize2, Zap, Sparkles, AlertCircle
} from 'lucide-react';
import type { MovieDetails, StreamSource, EpisodeItem } from '../types';
import { fetchStreamSources, fetchMovieTrailer } from '../services/api';

interface VideoPlayerModalProps {
  movie: MovieDetails | null;
  mode: 'trailer' | 'stream';
  isOpen: boolean;
  onClose: () => void;
  initialSeason?: number;
  initialEpisode?: number;
  episodeItem?: EpisodeItem | null;
  onSelectEpisode?: (ep: EpisodeItem) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  movie,
  mode,
  isOpen,
  onClose,
  initialSeason = 1,
  initialEpisode = 1,
  episodeItem = null,
  onSelectEpisode,
}) => {
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState(initialSeason);
  const [episode, setEpisode] = useState(initialEpisode);
  const [iframeKey, setIframeKey] = useState(0);
  const [isTheater, setIsTheater] = useState(false);

  useEffect(() => {
    setSeason(initialSeason);
    setEpisode(initialEpisode);
  }, [initialSeason, initialEpisode]);

  useEffect(() => {
    if (!isOpen || !movie) return;

    if (mode === 'trailer') {
      setLoading(true);
      const isSeries = movie.type === 'series' || Boolean(movie.seasons && movie.seasons.length > 0);
      fetchMovieTrailer(movie._id, isSeries, movie.title).then((trailerEmbedUrl) => {
        setSources([
          {
            provider: 'Official Trailer HD',
            url: trailerEmbedUrl,
            resolutions: ['1080p Full HD'],
          }
        ]);
        setActiveSourceIndex(0);
        setLoading(false);
      });
    } else {
      setLoading(true);
      const isSeries = movie.type === 'series' || Boolean(movie.seasons && movie.seasons.length > 0);
      fetchStreamSources(movie, isSeries, season, episode).then((srcList) => {
        setSources(srcList);
        setActiveSourceIndex(0);
        setLoading(false);
      });
    }
  }, [isOpen, movie, mode, season, episode]);

  if (!isOpen || !movie) return null;

  const currentSource = sources[activeSourceIndex] || sources[0];
  const isSeries = movie.type === 'series' || Boolean(movie.seasons && movie.seasons.length > 0);

  const handleNextEpisode = () => {
    const nextEp = episode + 1;
    setEpisode(nextEp);
    if (movie.episodes && onSelectEpisode) {
      const found = movie.episodes.find(e => e.episodeNumber === nextEp);
      if (found) onSelectEpisode(found);
    }
  };

  const handlePrevEpisode = () => {
    if (episode <= 1) return;
    const prevEp = episode - 1;
    setEpisode(prevEp);
    if (movie.episodes && onSelectEpisode) {
      const found = movie.episodes.find(e => e.episodeNumber === prevEp);
      if (found) onSelectEpisode(found);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-200">
      
      {/* Main Player Container */}
      <div 
        className={`relative w-full ${
          isTheater ? 'max-w-[98vw] h-[94vh]' : 'max-w-5xl'
        } bg-[#111111] border border-white/15 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(229,9,20,0.15)] ring-1 ring-white/10 flex flex-col transition-all duration-300`}
      >
        
        {/* Sleek Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gradient-to-r from-[#161616] via-[#1c1c1c] to-[#161616] border-b border-white/10">
          
          {/* Title & Status */}
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#E50914] text-white flex items-center justify-center shadow-md shadow-[#E50914]/30 shrink-0">
              {isSeries ? <Tv className="w-4 h-4" /> : <Film className="w-4 h-4" />}
            </div>
            
            <div className="overflow-hidden space-y-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-black text-white truncate max-w-xs sm:max-w-md">
                  {movie.title}
                </h2>
                {isSeries && (
                  <span className="px-2 py-0.5 rounded bg-[#E50914] text-[10px] font-black text-white uppercase tracking-wider shrink-0">
                    S{String(season).padStart(2, '0')}E{String(episode).padStart(2, '0')}{episodeItem?.title ? ` • ${episodeItem.title}` : ''}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  1080p Full HD
                </span>
                <span>•</span>
                <span className="text-gray-300 font-medium">
                  {mode === 'trailer' ? 'Official Trailer' : 'Subtitle Indonesia Aktif'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIframeKey(k => k + 1)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
              title="Refresh Stream"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsTheater(!isTheater)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
              title={isTheater ? "Tampilan Normal" : "Mode Bioskop"}
            >
              {isTheater ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {currentSource?.url && (
              <a
                href={currentSource.url}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-xs font-bold text-gray-200 hover:text-white border border-white/10 transition-colors"
              >
                <span>Tab Baru</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#E50914] text-white flex items-center justify-center transition-colors ml-1 shadow-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Canvas */}
        <div className="relative w-full aspect-video bg-black flex-1 flex items-center justify-center overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-[#E50914] border-t-transparent animate-spin" />
              <span className="text-xs font-bold text-gray-300">Menyiapkan Pemutar Sub Indo...</span>
            </div>
          ) : currentSource?.url ? (
            <iframe
              key={iframeKey}
              src={currentSource.url}
              title={movie.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="text-center p-6 space-y-3">
              <AlertCircle className="w-8 h-8 text-[#E50914] mx-auto" />
              <p className="text-xs text-gray-300">Gagal memuat server ini. Silakan pilih server lain di bawah.</p>
            </div>
          )}
        </div>

        {/* Sleek Bottom Control & Server Switcher Bar */}
        <div className="px-4 sm:px-6 py-3 bg-[#161616] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Series Episode Navigation (If Series) */}
          {isSeries && mode === 'stream' ? (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handlePrevEpisode}
                disabled={episode <= 1}
                className="px-3 py-1.5 rounded-lg bg-[#222222] hover:bg-[#333333] disabled:opacity-30 text-xs font-bold text-white flex items-center gap-1 border border-white/10 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>

              <span className="px-3 py-1.5 rounded-lg bg-[#E50914] text-white font-black text-xs shadow-md">
                EP {episode}
              </span>

              <button
                onClick={handleNextEpisode}
                className="px-3 py-1.5 rounded-lg bg-[#222222] hover:bg-[#333333] text-xs font-bold text-white flex items-center gap-1 border border-white/10 transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
              <Sparkles className="w-4 h-4 text-[#E50914]" />
              <span>Pilih Server Cepat:</span>
            </div>
          )}

          {/* Minimalist Pill Server Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
            {sources.map((src, idx) => {
              const isSelected = idx === activeSourceIndex;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveSourceIndex(idx);
                    setIframeKey(k => k + 1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#E50914] text-white shadow-lg shadow-[#E50914]/30 scale-105'
                      : 'bg-[#222222] text-gray-300 hover:bg-[#2e2e2e] hover:text-white border border-white/10'
                  }`}
                >
                  <Zap className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-[#E50914]'}`} />
                  <span>{src.provider}</span>
                </button>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
};
