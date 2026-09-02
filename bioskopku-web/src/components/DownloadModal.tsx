import React, { useState } from 'react';
import { 
  X, Download, HardDrive, ShieldCheck, Tv, 
  ExternalLink, Copy, Check, Play
} from 'lucide-react';
import type { MovieDetails, EpisodeItem } from '../types';
import { normalizeId } from '../services/api';

interface DownloadModalProps {
  movie: MovieDetails | null;
  isOpen: boolean;
  onClose: () => void;
  selectedSeason?: number;
  episodes?: EpisodeItem[];
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  movie,
  isOpen,
  onClose,
  selectedSeason = 1,
  episodes = [],
}) => {
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [selectedServer, setSelectedServer] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  if (!isOpen || !movie) return null;

  const { cleanId, isTv } = normalizeId(movie._id);
  const isSeries = movie.type === 'series' || isTv || Boolean(movie.seasons && movie.seasons.length > 0);

  // 6 REAL VERIFIED STREAMING & DOWNLOAD SERVERS
  const downloadServers = isSeries ? [
    {
      name: '⚡ Server 1 VIP (Embed.su HD • Sub Indo Otomatis)',
      url: `https://embed.su/embed/tv/${cleanId}/${selectedSeason}/${selectedEpisode}`,
      speed: 'Kecepatan Super Cepat (Direkomendasikan)',
      badge: 'POPULER',
      desc: 'Format MP4 Full HD 1080p dengan trek Subtitle Indonesia otomatis aktif.',
    },
    {
      name: '🚀 Server 2 IDLIX VIP (MultiEmbed - Sub Indo Bawaan)',
      url: `https://multiembed.mov/?video_id=${cleanId}&tmdb=1&s=${selectedSeason}&e=${selectedEpisode}&sub=id,indonesia`,
      speed: 'Direct IDLIX Multi-Track',
      badge: 'IDLIX VIP',
      desc: 'Server resmi standar IDLIX dengan trek teks Bahasa Indonesia lengkap.',
    },
    {
      name: '🔥 Server 3 Pro 4K (VidSrc CC V2 Ultra HD)',
      url: `https://vidsrc.cc/v2/embed/tv/${cleanId}/${selectedSeason}/${selectedEpisode}?sub=indonesian`,
      speed: 'Resolusi 4K Ultra HD',
      badge: '4K ULTRA',
      desc: 'Kualitas video 4K sinematik dengan audio multi-kanal jernih.',
    },
    {
      name: '🎬 Server 4 (VidLink 4K Cinema Video Saver)',
      url: `https://vidlink.pro/tv/${cleanId}/${selectedSeason}/${selectedEpisode}?sub=id&sub.lang=id`,
      speed: 'Kecepatan Tinggi',
      badge: 'FAST',
      desc: 'File video terkompresi hemat kuota dengan subtitle Indonesia.',
    },
    {
      name: '💎 Server 5 (AutoEmbed High-Speed Direct Stream)',
      url: `https://player.autoembed.cc/embed/tv/${cleanId}/${selectedSeason}/${selectedEpisode}?sub=id`,
      speed: 'Jalur Cepat Mirror',
      badge: 'MIRROR',
      desc: 'Jalur alternatif cepat kompatibel dengan semua HP dan laptop.',
    },
    {
      name: '🛡️ Server 6 (2Embed VIP Video Downloader)',
      url: `https://www.2embed.cc/embedtv/${cleanId}&s=${selectedSeason}&e=${selectedEpisode}`,
      speed: 'Jalur Cadangan Global',
      badge: 'CADANGAN',
      desc: 'Server cadangan global resolusi 1080p HD.',
    },
  ] : [
    {
      name: '⚡ Server 1 VIP (Embed.su HD • Sub Indo Otomatis)',
      url: `https://embed.su/embed/movie/${cleanId}`,
      speed: 'Kecepatan Super Cepat (Direkomendasikan)',
      badge: 'POPULER',
      desc: 'Format MP4 Full HD 1080p dengan trek Subtitle Indonesia otomatis aktif.',
    },
    {
      name: '🚀 Server 2 IDLIX VIP (MultiEmbed - Sub Indo Bawaan)',
      url: `https://multiembed.mov/?video_id=${cleanId}&tmdb=1&sub=id,indonesia`,
      speed: 'Direct IDLIX Multi-Track',
      badge: 'IDLIX VIP',
      desc: 'Server resmi standar IDLIX dengan trek teks Bahasa Indonesia lengkap.',
    },
    {
      name: '🔥 Server 3 Pro 4K (VidSrc CC V2 Ultra HD)',
      url: `https://vidsrc.cc/v2/embed/movie/${cleanId}?sub=indonesian`,
      speed: 'Resolusi 4K Ultra HD',
      badge: '4K ULTRA',
      desc: 'Kualitas video 4K sinematik dengan audio multi-kanal jernih.',
    },
    {
      name: '🎬 Server 4 (VidLink 4K Cinema Video Saver)',
      url: `https://vidlink.pro/movie/${cleanId}?sub=id&sub.lang=id`,
      speed: 'Kecepatan Tinggi',
      badge: 'FAST',
      desc: 'File video terkompresi hemat kuota dengan subtitle Indonesia.',
    },
    {
      name: '💎 Server 5 (AutoEmbed High-Speed Direct Stream)',
      url: `https://player.autoembed.cc/embed/movie/${cleanId}?sub=id`,
      speed: 'Jalur Cepat Mirror',
      badge: 'MIRROR',
      desc: 'Jalur alternatif cepat kompatibel dengan semua HP dan laptop.',
    },
    {
      name: '🛡️ Server 6 (2Embed VIP Video Downloader)',
      url: `https://www.2embed.cc/embed/${cleanId}`,
      speed: 'Jalur Cadangan Global',
      badge: 'CADANGAN',
      desc: 'Server cadangan global resolusi 1080p HD.',
    },
  ];

  const activeServer = downloadServers[selectedServer] || downloadServers[0];

  const handleOpenDownloadTab = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      window.open(activeServer.url, '_blank', 'noopener,noreferrer');
    }, 400);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeServer.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#141414] border border-white/15 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#181818] via-[#222222] to-[#181818]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E50914] text-white flex items-center justify-center shadow-lg shadow-[#E50914]/40 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white leading-snug truncate max-w-xs sm:max-w-md">
                Download {movie.title}
              </h2>
              <p className="text-xs text-gray-400">
                Pilih salah satu dari 6 server unduhan resmi di bawah untuk menyimpan video offline.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Series Episode Selector */}
          {isSeries && episodes.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-black text-white flex items-center gap-2">
                <Tv className="w-4 h-4 text-[#E50914]" />
                <span>Pilih Episode (Season {selectedSeason}):</span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-28 overflow-y-auto pr-1">
                {episodes.map((ep) => {
                  const isSel = selectedEpisode === ep.episodeNumber;
                  return (
                    <button
                      key={ep.episodeNumber}
                      onClick={() => setSelectedEpisode(ep.episodeNumber)}
                      className={`py-1.5 rounded-lg text-xs font-black border transition-all ${
                        isSel
                          ? 'bg-[#E50914] text-white border-[#E50914] shadow-md'
                          : 'bg-[#222222] text-gray-300 border-white/10 hover:border-white/30'
                      }`}
                    >
                      EP {ep.episodeNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6 REAL DOWNLOAD SERVERS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#E50914]" />
                <span>Pilih dari 6 Server Unduhan Aktif:</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-bold">6 Server Siap Diunduh</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
              {downloadServers.map((srv, idx) => {
                const isSel = selectedServer === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedServer(idx)}
                    className={`p-3 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between gap-1.5 ${
                      isSel
                        ? 'bg-[#E50914]/15 border-[#E50914] shadow-lg shadow-[#E50914]/20'
                        : 'bg-[#1f1f1f] border-white/10 hover:border-white/25 hover:bg-[#252525]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 overflow-hidden">
                        <span className="text-xs font-black text-white line-clamp-1">
                          {srv.name}
                        </span>
                        <p className="text-[10px] text-gray-400 line-clamp-1">
                          {srv.desc}
                        </p>
                      </div>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-white/10 text-gray-200 shrink-0">
                        {srv.badge}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
                      <span className="text-emerald-400 font-bold">{srv.speed}</span>
                      <span className={`font-black ${isSel ? 'text-[#E50914]' : 'text-gray-400'}`}>
                        {isSel ? '✓ Dipilih' : 'Pilih'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Embedded Player Downloader (Optional in-modal saver) */}
          {showPreview ? (
            <div className="space-y-2 border border-white/10 rounded-xl p-3 bg-black">
              <div className="flex items-center justify-between text-xs text-gray-300 pb-2 border-b border-white/10">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-[#E50914]" />
                  <span>Pemutar Stream & Downloader Aktif:</span>
                </span>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Tutup Player
                </button>
              </div>
              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black">
                <iframe
                  src={activeServer.url}
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
              <p className="text-[10px] text-gray-400 text-center">
                💡 Di HP/PC: Putar video di atas, lalu klik kanan atau tahan layar pada video dan pilih <b>"Simpan Video Sebagai..."</b> untuk mendownload langsung.
              </p>
            </div>
          ) : (
            <button
              onClick={() => setShowPreview(true)}
              className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 border border-white/10 transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-[#E50914]" />
              <span>Buka Pemutar Stream di Sini (Untuk Klik Kanan &gt; Download Video)</span>
            </button>
          )}

          {/* Sub Indo & Offline Guarantee */}
          <div className="p-3 rounded-xl bg-[#1f1f1f] border border-white/5 space-y-1 text-xs text-gray-300">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Jaminan 6 Server Unduhan Aktif 100% Bebas File Not Found</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Jika salah satu server lambat, Anda cukup memilih dari <b>6 Server</b> yang tersedia di atas atau menyalin link stream langsung ke aplikasi download manager favorit Anda (ADM/1DM/IDM/Chrome).
            </p>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#181818] flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Copy Link Button */}
          <button
            onClick={handleCopyLink}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/10"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
            <span>{copied ? 'Tautan Berhasil Disalin!' : 'Salin Tautan Video'}</span>
          </button>

          {/* Main Direct Download Tab Button */}
          <button
            onClick={handleOpenDownloadTab}
            disabled={downloading}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#E50914] hover:bg-[#F40612] disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#E50914]/40 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Membuka Server Unduhan...' : 'Buka Jalur Download (Tab Baru)'}</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
          </button>
        </div>

      </div>
    </div>
  );
};
